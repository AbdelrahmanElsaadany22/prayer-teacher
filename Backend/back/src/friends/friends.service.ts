import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { friendRequest } from './schemas/friendRequest.schema';
import { Model } from 'mongoose';
import { Status } from './schemas/friendRequest.schema';
import { User } from '../users/schemas/user.schema';
import { NotificationGateway } from '../notification/notification.gateway';

@Injectable()
export class FriendsService {
  constructor(
    @InjectModel(friendRequest.name)
    private readonly friendRequestModel: Model<friendRequest>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    private notificationGateway: NotificationGateway,
  ) {}

  async makeFriendRequest(senderId: string, receiverId: string) {
    if (senderId === receiverId) {
      throw new BadRequestException("You Can't Send Friend Request To Yourself!");
    }

    const ifFound = await this.friendRequestModel.findOne({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId },
      ],
    });
    if (ifFound) {
      throw new BadRequestException('The Friend Request Already Sent!');
    }

    const currentUser = await this.userModel.findById(senderId);
    if (!currentUser) {
      throw new NotFoundException('User Not Found');
    }
    const alreadyFriends = currentUser.friends.some(
      (friendId) => friendId.toString() === receiverId,
    );
    if (alreadyFriends) {
      throw new BadRequestException('You Are Already Friends');
    }

    const request = await this.friendRequestModel.create({
      sender: senderId,
      receiver: receiverId,
    });

    this.notificationGateway.sendToUser(receiverId, 'newNotification', {
      type: 'FRIEND_REQUEST',
      message: 'New Friend Request',
      sender: senderId,
    });

    return request;
  }

  async getFriendRequests(currentUserId: string) {
    return await this.friendRequestModel
      .find({ receiver: currentUserId, status: Status.PENDING })
      .populate('sender');
  }

  async acceptRequest(userId: string, RequestId: string) {
    const request = await this.friendRequestModel.findById(RequestId);
    if (!request) {
      throw new NotFoundException('friend request not found');
    }
    if (request.receiver.toString() != userId) {
      throw new UnauthorizedException('you cannot accept this request');
    }

    request.status = Status.ACCEPTED;
    await request.save();

    await this.userModel.updateOne(
      { _id: request.sender },
      { $addToSet: { friends: request.receiver } },
    );
    await this.userModel.updateOne(
      { _id: request.receiver },
      { $addToSet: { friends: request.sender } },
    );

    this.notificationGateway.sendToUser(
      request.sender.toString(),
      'newNotification',
      {
        type: 'FRIEND_REQUEST_ACCEPTED',
        message: 'Your friend request was accepted',
        sender: userId,
      },
    );

    return { message: 'friend request accepted' };
  }

  async rejectRequest(userId: string, requestId: string) {
    const request = await this.friendRequestModel.findById(requestId);
    if (!request) {
      throw new NotFoundException('friend request not found');
    }
    if (request.receiver.toString() !== userId) {
      throw new UnauthorizedException('you cannot reject this request');
    }

    request.status = Status.REJECTED;
    await request.save();

    this.notificationGateway.sendToUser(
      request.sender.toString(),
      'newNotification',
      {
        type: 'FRIEND_REQUEST_REJECTED',
        message: 'Your friend request was declined',
        sender: userId,
      },
    );

    return { message: 'friend request rejected' };
  }

  async cancelRequest(userId: string, requestId: string) {
    const request = await this.friendRequestModel.findById(requestId);
    if (!request) {
      throw new NotFoundException('friend request not found');
    }
    if (request.sender.toString() !== userId) {
      throw new UnauthorizedException('you cannot cancel this request');
    }
    if (request.status !== Status.PENDING) {
      throw new UnauthorizedException(
        'cannot cancel a request that is no longer pending',
      );
    }

    await this.friendRequestModel.findByIdAndDelete(requestId);
    return { message: 'friend request cancelled' };
  }

  async removeFriend(userId: string, friendId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const isFriend = user.friends.some((id) => id.toString() === friendId);
    if (!isFriend) throw new BadRequestException('You are not friends with this user');

    await this.userModel.updateOne(
      { _id: userId },
      { $pull: { friends: friendId } },
    );
    await this.userModel.updateOne(
      { _id: friendId },
      { $pull: { friends: userId } },
    );

    return { message: 'Friend removed successfully' };
  }
}
