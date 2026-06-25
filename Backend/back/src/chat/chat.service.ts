import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Message } from './schemas/chat.schema';
import { Model, Types } from 'mongoose';
import { User } from '../users/schemas/user.schema';

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

    async checkFriends(senderId:string,receiverId:string){
        const user=await this.userModel.findById(senderId)
        if(!user){
            throw new NotFoundException("User Not Found")
        }
        const isFriend =user.friends.some(friend =>friend.toString() === receiverId)
        return isFriend;
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
