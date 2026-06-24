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
