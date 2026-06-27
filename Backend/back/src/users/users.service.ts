import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { Model, Types } from 'mongoose';

const BCRYPT_SALT_ROUNDS = 12;
import {
  PrayerSession,
  PrayerSessionDocument,
} from '../prayer/prayer/entities/prayer-session.schema';
import {
  friendRequest,
  Status,
} from '../friends/schemas/friendRequest.schema';

export type CreateUserData = Pick<User, 'name' | 'email' | 'password'>;

export type Relationship =
  | 'self'
  | 'friends'
  | 'outgoing_pending'
  | 'incoming_pending'
  | 'none';

export type UserProfileWithStats = {
  _id: Types.ObjectId;
  name: string;
  email: string;
  profilePicture?: string | null;
  totalPrayers: number;
  accuracy: number;
  relationship: Relationship;
  requestId: string | null;
};

export type PrayerBreakdown = {
  prayerName: string;
  count: number;
  avgAccuracy: number;
  totalMistakes: number;
};

export type FriendComparison = {
  userId: string;
  name: string;
  isSelf: boolean;
  totalPrayers: number;
  avgAccuracy: number;
  avgDurationSec: number;
  totalMistakes: number;
  avgMistakes: number;
  mostMistakenPrayer: string | null;
  perPrayer: PrayerBreakdown[];
};

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(PrayerSession.name)
    private readonly sessionModel: Model<PrayerSessionDocument>,
    @InjectModel(friendRequest.name)
    private readonly friendRequestModel: Model<friendRequest>,
  ) {}

  create(data: CreateUserData): Promise<UserDocument> {
    return this.userModel.create(data);
  }

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).select('+password').exec();
  }

  findByEmailWithVerification(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email })
      .select('+verificationCode +verificationCodeExpires')
      .exec();
  }

  async setVerificationCode(
    userId: string,
    hashedCode: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(userId, {
        verificationCode: hashedCode,
        verificationCodeExpires: expiresAt,
      })
      .exec();
  }

  async markVerified(userId: string): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(userId, {
        isVerified: true,
        verificationCode: null,
        verificationCodeExpires: null,
      })
      .exec();
  }

  findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async updateProfilePicture(
    userId: string,
    filename: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(userId, { profilePicture: filename }, { new: true })
      .exec();
  }

  async updateName(userId: string, name: string) {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { name }, { new: true })
      .exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      profilePicture: user.profilePicture,
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.userModel
      .findById(userId)
      .select('+password')
      .exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.password = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    await user.save();

    return { message: 'Password updated successfully' };
  }

  async getProfileWithStats(
    userId: string,
    viewerId?: string,
  ): Promise<UserProfileWithStats> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('User not found');
    }

    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [stats] = await this.sessionModel.aggregate<{
      totalPrayers: number;
      avgAccuracy: number;
    }>([
      { $match: { userId: new Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalPrayers: { $sum: 1 },
          avgAccuracy: { $avg: '$accuracy' },
        },
      },
    ]);

    const { relationship, requestId } = await this.resolveRelationship(
      user,
      viewerId,
    );

    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      profilePicture: user.profilePicture,
      relationship,
      requestId,
      totalPrayers: stats?.totalPrayers ?? 0,
      accuracy: stats ? Math.round((stats.avgAccuracy ?? 0) * 10) / 10 : 0,
    };
  }

  async getFriendsComparison(viewerId: string): Promise<FriendComparison[]> {
    if (!Types.ObjectId.isValid(viewerId)) {
      throw new NotFoundException('User not found');
    }

    const viewer = await this.userModel.findById(viewerId).exec();
    if (!viewer) {
      throw new NotFoundException('User not found');
    }

    const userIds = [
      viewer._id,
      ...viewer.friends.map((id) => new Types.ObjectId(id)),
    ];

    const users = await this.userModel
      .find({ _id: { $in: userIds } })
      .select('name')
      .exec();
    const nameById = new Map(users.map((u) => [u._id.toString(), u.name]));

    const overall = await this.sessionModel.aggregate<{
      _id: Types.ObjectId;
      totalPrayers: number;
      avgAccuracy: number;
      avgDurationSec: number;
      totalMistakes: number;
    }>([
      { $match: { userId: { $in: userIds } } },
      {
        $addFields: {
          _parts: {
            $map: {
              input: { $split: ['$duration', ':'] },
              as: 'p',
              in: { $convert: { input: '$$p', to: 'int', onError: 0, onNull: 0 } },
            },
          },
        },
      },
      {
        $addFields: {
          _durSec: {
            $switch: {
              branches: [
                {
                  case: { $eq: [{ $size: '$_parts' }, 3] },
                  then: {
                    $add: [
                      { $multiply: [{ $arrayElemAt: ['$_parts', 0] }, 3600] },
                      { $multiply: [{ $arrayElemAt: ['$_parts', 1] }, 60] },
                      { $arrayElemAt: ['$_parts', 2] },
                    ],
                  },
                },
                {
                  case: { $eq: [{ $size: '$_parts' }, 2] },
                  then: {
                    $add: [
                      { $multiply: [{ $arrayElemAt: ['$_parts', 0] }, 60] },
                      { $arrayElemAt: ['$_parts', 1] },
                    ],
                  },
                },
              ],
              default: 0,
            },
          },
        },
      },
      {
        $group: {
          _id: '$userId',
          totalPrayers: { $sum: 1 },
          avgAccuracy: { $avg: '$accuracy' },
          avgDurationSec: { $avg: '$_durSec' },
          totalMistakes: { $sum: '$mistakes' },
        },
      },
    ]);
    const overallById = new Map(overall.map((o) => [o._id.toString(), o]));

    const perPrayerRows = await this.sessionModel.aggregate<{
      _id: { userId: Types.ObjectId; prayerName: string };
      count: number;
      avgAccuracy: number;
      totalMistakes: number;
    }>([
      { $match: { userId: { $in: userIds } } },
      {
        $group: {
          _id: { userId: '$userId', prayerName: '$prayerName' },
          count: { $sum: 1 },
          avgAccuracy: { $avg: '$accuracy' },
          totalMistakes: { $sum: '$mistakes' },
        },
      },
    ]);

    const perPrayerByUser = new Map<string, PrayerBreakdown[]>();
    for (const row of perPrayerRows) {
      const uid = row._id.userId.toString();
      const list = perPrayerByUser.get(uid) ?? [];
      list.push({
        prayerName: row._id.prayerName,
        count: row.count,
        avgAccuracy: round1(row.avgAccuracy),
        totalMistakes: row.totalMistakes,
      });
      perPrayerByUser.set(uid, list);
    }

    return userIds.map((id) => {
      const uid = id.toString();
      const o = overallById.get(uid);
      const perPrayer = perPrayerByUser.get(uid) ?? [];
      const mostMistakenPrayer =
        perPrayer.length > 0
          ? [...perPrayer].sort((a, b) => b.totalMistakes - a.totalMistakes)[0]
              .prayerName
          : null;
      const totalPrayers = o?.totalPrayers ?? 0;

      return {
        userId: uid,
        name: nameById.get(uid) ?? 'Unknown',
        isSelf: uid === viewer._id.toString(),
        totalPrayers,
        avgAccuracy: round1(o?.avgAccuracy ?? 0),
        avgDurationSec: Math.round(o?.avgDurationSec ?? 0),
        totalMistakes: o?.totalMistakes ?? 0,
        avgMistakes:
          totalPrayers > 0 ? round1((o?.totalMistakes ?? 0) / totalPrayers) : 0,
        mostMistakenPrayer,
        perPrayer,
      };
    });
  }

  private async resolveRelationship(
    profileUser: UserDocument,
    viewerId?: string,
  ): Promise<{ relationship: Relationship; requestId: string | null }> {
    if (!viewerId || !Types.ObjectId.isValid(viewerId)) {
      return { relationship: 'none', requestId: null };
    }
    if (profileUser._id.toString() === viewerId) {
      return { relationship: 'self', requestId: null };
    }

    const alreadyFriends = profileUser.friends.some(
      (friendId) => friendId.toString() === viewerId,
    );
    if (alreadyFriends) {
      return { relationship: 'friends', requestId: null };
    }

    const pending = await this.friendRequestModel
      .findOne({
        status: Status.PENDING,
        $or: [
          { sender: viewerId, receiver: profileUser._id },
          { sender: profileUser._id, receiver: viewerId },
        ],
      })
      .exec();

    if (!pending) {
      return { relationship: 'none', requestId: null };
    }

    if (pending.sender.toString() === viewerId) {
      return { relationship: 'outgoing_pending', requestId: pending._id.toString() };
    }
    return { relationship: 'incoming_pending', requestId: pending._id.toString() };
  }

  searchByName(query: string, excludeId?: string): Promise<UserDocument[]> {
    const trimmed = query.trim();
    if (!trimmed) return Promise.resolve([]);
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const filter: Record<string, unknown> = {
      name: { $regex: escaped, $options: 'i' },
    };
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }
    return this.userModel.find(filter).limit(10).exec();
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
