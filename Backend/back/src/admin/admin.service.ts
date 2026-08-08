import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model, Types } from 'mongoose';
import { Role, User, UserDocument } from '../users/schemas/user.schema';
import {
  PrayerSession,
  PrayerSessionDocument,
} from '../prayer/prayer/entities/prayer-session.schema';
import { friendRequest } from '../friends/schemas/friendRequest.schema';
import { Message } from '../chat/schemas/chat.schema';

const BCRYPT_SALT_ROUNDS = 12;

export type AdminUserRow = {
  _id: Types.ObjectId;
  name: string;
  email: string;
  profilePicture?: string | null;
  role: Role;
  isVerified: boolean;
  fatihaIjazah: boolean;
  accuracy: number;
  totalPrayers: number;
  createdAt: Date;
};

@Injectable()
export class AdminService implements OnModuleInit {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(PrayerSession.name)
    private readonly sessionModel: Model<PrayerSessionDocument>,
    @InjectModel(friendRequest.name)
    private readonly friendRequestModel: Model<friendRequest>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<Message>,
    private readonly config: ConfigService,
  ) {}

  /**
   * Creates the admin account on boot if it isn't there yet. Idempotent — an
   * existing account is only promoted, never overwritten, so a password changed
   * later isn't reset back on the next deploy.
   *
   * Both values come from the environment with no fallback on purpose: a
   * default pair written here would be committed, and this repository is
   * public, so anyone reading it would hold the admin credentials of every
   * deployment that hadn't overridden them.
   */
  async onModuleInit() {
    const rawEmail = this.config.get<string>('ADMIN_EMAIL');
    const password = this.config.get<string>('ADMIN_PASSWORD');

    if (!rawEmail || !password) {
      this.logger.warn(
        'ADMIN_EMAIL / ADMIN_PASSWORD are not set — skipping admin seeding. ' +
          'Set both to create the admin account.',
      );
      return;
    }

    const email = rawEmail.trim().toLowerCase();
    const existing = await this.userModel.findOne({ email }).exec();

    if (existing) {
      if (existing.role !== Role.ADMIN) {
        existing.role = Role.ADMIN;
        await existing.save();
        this.logger.log(`Promoted ${email} to admin`);
      }
      return;
    }

    await this.userModel.create({
      name: 'Admin',
      email,
      password: await bcrypt.hash(password, BCRYPT_SALT_ROUNDS),
      role: Role.ADMIN,
      isVerified: true, // no inbox to confirm from
    });
    this.logger.log(`Seeded admin account ${email}`);
  }

  /**
   * One page of users, each with their average accuracy across all sessions.
   *
   * The averages come from a single grouped query over the sessions of just
   * this page's users, rather than one query per user — twenty rows would
   * otherwise mean twenty-one round trips.
   */
  async listUsers(page: number, limit: number, q?: string) {
    const skip = (page - 1) * limit;

    // A search term matches either field. Regex metacharacters are escaped so a
    // query like "a.b" is looked for literally instead of as a pattern.
    const term = q?.trim();
    const filter: Record<string, unknown> = {};
    if (term) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('name email profilePicture role isVerified createdAt fatihaIjazah')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    const ids = users.map((u) => u._id);
    const stats = await this.sessionModel.aggregate<{
      _id: Types.ObjectId;
      avgAccuracy: number;
      totalPrayers: number;
    }>([
      { $match: { userId: { $in: ids } } },
      {
        $group: {
          _id: '$userId',
          avgAccuracy: { $avg: '$accuracy' },
          totalPrayers: { $sum: 1 },
        },
      },
    ]);
    const statsById = new Map(stats.map((s) => [s._id.toString(), s]));

    const data: AdminUserRow[] = users.map((u) => {
      const s = statsById.get(u._id.toString());
      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        profilePicture: u.profilePicture ?? null,
        role: u.role,
        isVerified: u.isVerified,
        fatihaIjazah: u.fatihaIjazah ?? false,
        // A user with no sessions has no average — reported as 0, not hidden.
        accuracy: s ? Math.round((s.avgAccuracy ?? 0) * 10) / 10 : 0,
        totalPrayers: s?.totalPrayers ?? 0,
        createdAt: u.createdAt as Date,
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  /**
   * Everything the user's own dashboard shows, for one user: the headline
   * figures, the per-prayer breakdown, and their full session history.
   */
  async getUserDashboard(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('User not found');
    }

    const user = await this.userModel
      .findById(userId)
      .select('name email profilePicture role isVerified createdAt friends fatihaIjazah fatihaIjazahAt')
      .lean()
      .exec();
    if (!user) throw new NotFoundException('User not found');

    const objectId = new Types.ObjectId(userId);

    const [sessions, [overall], perPrayer] = await Promise.all([
      this.sessionModel
        .find({ userId: objectId })
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
      this.sessionModel.aggregate<{
        totalPrayers: number;
        avgAccuracy: number;
        totalMistakes: number;
      }>([
        { $match: { userId: objectId } },
        {
          $group: {
            _id: null,
            totalPrayers: { $sum: 1 },
            avgAccuracy: { $avg: '$accuracy' },
            totalMistakes: { $sum: '$mistakes' },
          },
        },
      ]),
      this.sessionModel.aggregate<{
        _id: string;
        count: number;
        avgAccuracy: number;
        totalMistakes: number;
      }>([
        { $match: { userId: objectId } },
        {
          $group: {
            _id: '$prayerName',
            count: { $sum: 1 },
            avgAccuracy: { $avg: '$accuracy' },
            totalMistakes: { $sum: '$mistakes' },
          },
        },
        { $sort: { count: -1 } },
      ]),
    ]);

    return {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture ?? null,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        friendsCount: user.friends?.length ?? 0,
        fatihaIjazah: user.fatihaIjazah ?? false,
        fatihaIjazahAt: user.fatihaIjazahAt ?? null,
      },
      stats: {
        totalPrayers: overall?.totalPrayers ?? 0,
        avgAccuracy: overall
          ? Math.round((overall.avgAccuracy ?? 0) * 10) / 10
          : 0,
        totalMistakes: overall?.totalMistakes ?? 0,
      },
      perPrayer: perPrayer.map((p) => ({
        prayerName: p._id,
        count: p.count,
        avgAccuracy: Math.round((p.avgAccuracy ?? 0) * 10) / 10,
        totalMistakes: p.totalMistakes,
      })),
      sessions,
    };
  }

  /**
   * Grants or revokes the Al-Fatiha ijazah. The timestamp is set on granting
   * and cleared on revoking, so a stale date can never outlive the badge.
   */
  async setFatihaIjazah(userId: string, granted: boolean) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('User not found');
    }

    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('User not found');

    user.fatihaIjazah = granted;
    user.fatihaIjazahAt = granted ? new Date() : null;
    await user.save();

    return {
      fatihaIjazah: user.fatihaIjazah,
      fatihaIjazahAt: user.fatihaIjazahAt,
    };
  }

  /**
   * Removes a user and everything that only existed because of them: their
   * sessions, their messages, their friend requests, and their entry in other
   * users' friend lists. Leaving any of it behind would surface as broken
   * references — a chat from a name nobody can look up.
   */
  async deleteUser(targetId: string, actingAdminId: string) {
    if (!Types.ObjectId.isValid(targetId)) {
      throw new NotFoundException('User not found');
    }
    if (targetId === actingAdminId) {
      throw new BadRequestException('You cannot delete your own admin account');
    }

    const target = await this.userModel.findById(targetId).exec();
    if (!target) throw new NotFoundException('User not found');

    if (target.role === Role.ADMIN) {
      throw new BadRequestException('Admin accounts cannot be deleted');
    }

    const objectId = new Types.ObjectId(targetId);

    await Promise.all([
      this.sessionModel.deleteMany({ userId: objectId }).exec(),
      // Message.sender/receiver are declared as strings on the class even
      // though the schema stores ObjectIds, so query with the raw id and let
      // mongoose cast it.
      this.messageModel
        .deleteMany({ $or: [{ sender: targetId }, { receiver: targetId }] })
        .exec(),
      this.friendRequestModel
        .deleteMany({ $or: [{ sender: objectId }, { receiver: objectId }] })
        .exec(),
      this.userModel
        .updateMany({ friends: objectId }, { $pull: { friends: objectId } })
        .exec(),
    ]);

    await this.userModel.findByIdAndDelete(targetId).exec();

    this.logger.log(`Admin ${actingAdminId} deleted user ${targetId}`);
    return { message: 'User deleted', deletedId: targetId };
  }
}
