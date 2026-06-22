import { Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('friend-request')
export class FriendsController {
    constructor(private readonly friendReqService:FriendsService){}

    
    @Post('/:receiverId')
    sendRequest(
        @Req() req,
        @Param('receiverId') receiverId:string
    ){
        return this.friendReqService.makeFriendRequest(req.user.id,receiverId)
    }



    @Get()
    getAllRequests(
        @Req() req
    ){
        return this.friendReqService.getFriendRequests(req.user.id)
    }

    @Patch('accept/:requestId')
    acceptRequest(
        @Req() req
        ,@Param('requestId') requestId:string
    ){
        return this.friendReqService.acceptRequest(req.user.id,requestId)
    }

    @Delete('reject/:requestId')
    rejectRequest(
    @Req() req,
    @Param('requestId') requestId:string
    ){
 return this.friendReqService.rejectRequest(
   req.user.id,
   requestId
 )

}

    @Delete('cancel/:requestId')
    cancelRequest(
    @Req() req,
    @Param('requestId') requestId:string
    ){
 return this.friendReqService.cancelRequest(
   req.user.id,
   requestId
 )

}
}
