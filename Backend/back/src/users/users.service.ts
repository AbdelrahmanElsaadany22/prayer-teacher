import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Model, Types } from 'mongoose';
import {
  PrayerSession,
  PrayerSessionDocument,
} from '../prayer/prayer/entities/prayer-session.schema';
import {
  friendRequest,
  Status,
} from '../friends/schemas/friendRequest.schema';

export type CreateUserData = Pick<User, 'name' | 'email' | 'password'>;

// How the viewer relates to the profile they're looking at — drives the button.
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
  totalPrayers: number;
  accuracy: number;
  relationship: Relationship;
  // Set for both pending states, so the viewer can cancel (outgoing) or
  // accept/reject (incoming) the request in place.
  requestId: string | null;
};

// Per-prayer rollup for one user, used by the dashboard comparison filters.
export type PrayerBreakdown = {
  prayerName: string;
  count: number;
  avgAccuracy: number;
  totalMistakes: number;
};

// One row in the friends-comparison table: the viewer plus each of their
// friends, with the aggregated stats the dashboard can filter/sort on.
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

  findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  // Public profile for the search → click flow: basic user info plus the
  // aggregated prayer stats (how many prayers they logged and their average
  // accuracy across every session).
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
      relationship,
      requestId,
      totalPrayers: stats?.totalPrayers ?? 0,
      // Round the average accuracy to one decimal place for a clean percentage.
      accuracy: stats ? Math.round((stats.avgAccuracy ?? 0) * 10) / 10 : 0,
    };
  }

  // Side-by-side comparison between the viewer and every one of their friends.
  // Returns one row per user with aggregated prayer stats; the dashboard picks
  // which metric (accuracy, count, duration, mistakes, per-prayer…) to surface.
  async getFriendsComparison(viewerId: string): Promise<FriendComparison[]> {
    if (!Types.ObjectId.isValid(viewerId)) {
      throw new NotFoundException('User not found');
    }

    const viewer = await this.userModel.findById(viewerId).exec();
    if (!viewer) {
      throw new NotFoundException('User not found');
    }

    // The viewer first, then their friends — keeps "you" at the top of the list.
    const userIds = [
      viewer._id,
      ...viewer.friends.map((id) => new Types.ObjectId(id)),
    ];

    // Names for every user we're comparing, keyed by id.
    const users = await this.userModel
      .find({ _id: { $in: userIds } })
      .select('name')
      .exec();
    const nameById = new Map(users.map((u) => [u._id.toString(), u.name]));

    // Overall stats per user. Durations are stored as "mm:ss"/"hh:mm:ss"
    // strings, so we parse them into seconds inside the pipeline before averaging.
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

    // Per-prayer breakdown per user, used by the "who errs most in X" filter.
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
      // Prayer this user makes the most mistakes in (ties broken by first seen).
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

  // Works out how the viewer relates to the profile owner so the UI can show the
  // right button even after a reload (no local-only "sent" state needed).
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

    // I sent it → I can cancel it. They sent it → I can accept/reject in place.
    // Either way the viewer needs the id to act on the request.
    if (pending.sender.toString() === viewerId) {
      return { relationship: 'outgoing_pending', requestId: pending._id.toString() };
    }
    return { relationship: 'incoming_pending', requestId: pending._id.toString() };
  }

  searchByName(query: string, excludeId?: string): Promise<UserDocument[]> {
    const trimmed = query.trim();
    if (!trimmed) return Promise.resolve([]);
    // escape regex special chars so user input is treated literally
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

// Rounds to one decimal place for clean percentages/averages in the UI.
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
