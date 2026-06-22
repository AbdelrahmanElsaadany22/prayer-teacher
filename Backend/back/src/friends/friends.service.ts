import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { friendRequest } from './schemas/friendRequest.schema';
import { Model } from 'mongoose';
import { Status } from './schemas/friendRequest.schema';
import { User } from '../users/schemas/user.schema';
@Injectable()
export class FriendsService {
    constructor(
        @InjectModel(friendRequest.name)
        private readonly friendRequestModel: Model<friendRequest>,
        @InjectModel(User.name)
        private readonly userModel:Model<User>
  ) {}
    

  async makeFriendRequest(senderId:string,receiverId:string){
    //المفروض هتأكد من 3 حاجات بالعقل 
    //1-لو هو غبي وبيبعت ادد لنفسه
    //2-لو هو بيبعت نفس الادد لنفس الشخص
    //3-لو هما الريدي صحاب اساسا

    //1
    if(senderId===receiverId){
      throw new BadRequestException("You Can't Send Friend Request To Your Selg!")
    }

    //2
    const ifFound=await this.friendRequestModel.find({
      sender:senderId,
      receiver:receiverId
    })
    if(ifFound){
      throw new BadRequestException("The Friend Request Already Sent!")
    }

    //3
    const currentUser=await this.userModel.findById(senderId)
    if(!currentUser){
      throw new NotFoundException("User Not Found")
    }
    const alreadyFriends=currentUser.friends.some(
      (friendId)=>friendId.toString() ===receiverId
    )
    if(alreadyFriends){
      throw new BadRequestException("You Are Already Friends") 
    }
    return await this.friendRequestModel.create({
        sender: senderId,
        receiver: receiverId
    })
  }


  async getFriendRequests(currentUserId:string){
    return await this.friendRequestModel.find({
      receiver:currentUserId,
      status:Status.PENDING
    }).populate("sender")
  }


  async acceptRequest(userId:string,RequestId:string){
    //المفروض نتأكد ان في ريكويست اساسا بال id 
    const request=await this.friendRequestModel.findById(RequestId)
    if(!request){
      throw new NotFoundException(
    "friend request not found");
    }
    //هتأكد بعد كده ان اساسا اللي مستقبل هو اللي فاتح

    if(request.receiver.toString()!=userId){
      throw new UnauthorizedException(
     "you cannot accept this request");
    }
    request.status=Status.ACCEPTED
     await request.save();
    //هنضيف ده هنا و ده هنا
    await this.userModel.updateOne(
      {_id:request.sender},
      {
        $addToSet:{
          friends:request.receiver
        }
      }
    )

    await this.userModel.updateOne({_id:request.receiver},
      {$addToSet:{
        friends: request.sender
      }}
    )


    return {
  message:"friend request accepted"
 }
  }

async rejectRequest(
 userId:string,
 requestId:string
){

 // نشوف الطلب موجود ولا لا

 const request =
 await this.friendRequestModel.findById(requestId);


 if(!request){

  throw new NotFoundException(
   "friend request not found"
  )

 }


 // اتأكد إن المستقبل بس هو اللي يرفض

 if(request.receiver.toString() !== userId){

  throw new UnauthorizedException(
   "you cannot reject this request"
  )
 }

     request.status=Status.REJECTED
     await request.save();
 return {
  message:"friend request rejected"
 }

}

async cancelRequest(
 userId:string,
 requestId:string
){

 const request =
 await this.friendRequestModel.findById(requestId);

 if(!request){
  throw new NotFoundException(
   "friend request not found"
  )
 }

 // اتأكد إن المرسل بس هو اللي يقدر يكنسل
 if(request.sender.toString() !== userId){
  throw new UnauthorizedException(
   "you cannot cancel this request"
  )
 }

 if(request.status !== Status.PENDING){
  throw new UnauthorizedException(
   "cannot cancel a request that is no longer pending"
  )
 }

 await this.friendRequestModel.findByIdAndDelete(requestId);
 return {
  message:"friend request cancelled"
 }

}
}
