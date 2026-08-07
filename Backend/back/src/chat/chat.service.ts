import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Message } from './schemas/chat.schema';
import { Model, Types } from 'mongoose';
import { Role, User } from '../users/schemas/user.schema';

@Injectable()
export class ChatService {
    constructor(
    @InjectModel(Message.name)
    private readonly messageModel:Model<Message>,
    @InjectModel(User.name)
    private userModel:Model<User>
){
    }
    async storeMessages(sender:string,receiver:string,message:string){
        return await this.messageModel.create({
            sender,
            receiver,
            message
        })
    }

    /** Stores a voice message; `message` stays empty and the URL carries the content. */
    async storeVoiceMessage(sender: string, receiver: string, audioUrl: string) {
        return await this.messageModel.create({
            sender,
            receiver,
            message: '',
            type: 'audio',
            audioUrl,
        });
    }

    async checkFriends(senderId:string,receiverId:string){
        const user=await this.userModel.findById(senderId)
        if(!user){
            throw new NotFoundException("User Not Found")
        }
        const isFriend =user.friends.some(friend =>friend.toString() === receiverId)
        return isFriend;
    }

    /**
     * Chat is friends-only, with one exception: anyone may write to an admin,
     * and an admin may write to anyone. Without it a learner could never send
     * their Fatiha recitation for the ijazah, since nobody befriends the admin.
     */
    async canMessage(senderId: string, receiverId: string): Promise<boolean> {
        // A malformed id would otherwise reach mongoose and surface as a cast
        // error — a 500 for what is really a bad request.
        if (!Types.ObjectId.isValid(senderId) || !Types.ObjectId.isValid(receiverId)) {
            throw new NotFoundException('User Not Found');
        }

        const [sender, receiver] = await Promise.all([
            this.userModel.findById(senderId).select('role friends').lean().exec(),
            this.userModel.findById(receiverId).select('role').lean().exec(),
        ]);

        if (!sender || !receiver) {
            throw new NotFoundException('User Not Found');
        }

        if (sender.role === Role.ADMIN || receiver.role === Role.ADMIN) {
            return true;
        }

        return sender.friends.some((f) => f.toString() === receiverId);
    }

    /** The admin every learner sends their recitation to. */
    async findAdmin() {
        const admin = await this.userModel
            .findOne({ role: Role.ADMIN })
            .select('name profilePicture')
            .lean()
            .exec();

        if (!admin) {
            throw new NotFoundException('No admin account exists');
        }

        return {
            _id: admin._id,
            name: admin.name,
            profilePicture: admin.profilePicture ?? null,
        };
    }

    /**
     * Everyone this user has exchanged messages with, newest conversation
     * first, each with its last message and how many of theirs are unread.
     * This is the admin's inbox.
     */
    async getConversations(userId: string) {
        const objectId = new Types.ObjectId(userId);

        const rows = await this.messageModel.aggregate<{
            _id: Types.ObjectId;
            lastMessage: string;
            lastType: 'text' | 'audio';
            lastAt: Date;
            unread: number;
        }>([
            { $match: { $or: [{ sender: objectId }, { receiver: objectId }] } },
            { $sort: { createdAt: -1 } },
            {
                // Group by whoever the other party is, whichever end they were on.
                $group: {
                    _id: {
                        $cond: [{ $eq: ['$sender', objectId] }, '$receiver', '$sender'],
                    },
                    lastMessage: { $first: '$message' },
                    lastType: { $first: '$type' },
                    lastAt: { $first: '$createdAt' },
                    unread: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ['$receiver', objectId] },
                                        { $eq: ['$seen', false] },
                                    ],
                                },
                                1,
                                0,
                            ],
                        },
                    },
                },
            },
            { $sort: { lastAt: -1 } },
        ]);

        const ids = rows.map((r) => r._id);
        const users = await this.userModel
            .find({ _id: { $in: ids } })
            .select('name profilePicture')
            .lean()
            .exec();
        const byId = new Map(users.map((u) => [u._id.toString(), u]));

        return rows
            // A conversation whose other party has since been deleted has nothing
            // left to show, so it is dropped rather than rendered nameless.
            .filter((r) => byId.has(r._id.toString()))
            .map((r) => {
                const u = byId.get(r._id.toString())!;
                return {
                    userId: r._id,
                    name: u.name,
                    profilePicture: u.profilePicture ?? null,
                    lastMessage: r.lastMessage,
                    lastType: r.lastType ?? 'text',
                    lastAt: r.lastAt,
                    unread: r.unread,
                };
            });
    }



    async getMessages( userId:string,friendId:string){
        //خد بالك من حتة ان الرسايل بتروح وتيجي يعني مرة تبقى سيندر ومرة تبقى ريسيفر
        return await this.messageModel.find({
            $or:[
                {
                  sender:userId,
                  receiver:friendId},
                  {
                    sender:friendId,
                    receiver:userId}
 ]}).sort({createdAt:1}).limit(50)
}

    async markMessageSeen(userId:string,friendId:string){
        return await this.messageModel.updateMany({
            sender:friendId,receiver:userId,seen:false
        },
        {$set:{seen:true}}
    )
    }

    //عدد الرسايل غير المقروءة لكل صديق سايبلي رسالة
    async getUnreadCounts(userId:string){
        const result =await this.messageModel.aggregate<{ _id: Types.ObjectId; count: number }>([
            {
                $match:{
                    receiver:new Types.ObjectId(userId),
                    seen:false
                }
            },
            {
                $group:{
                    _id:"$sender",
                    count:{$sum:1}
                }
            }
        ])
        //نرجّعها على شكل { friendId: count } علشان الفرونت يقرأها بسهولة
        return result.reduce<Record<string, number>>((acc,item)=>{
            acc[item._id.toString()]=item.count
            return acc
        },{})
    }

}
