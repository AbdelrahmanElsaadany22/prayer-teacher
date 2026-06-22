import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';


@Controller('user')
export class UsersController {
    constructor(
        private readonly userService:UsersService
    ){}

    
    @Get('/current')
    @UseGuards(AuthGuard('jwt'))
     getCurrentUser(@Req() req){
        return this.userService.findById(req.user.id)
    }
    @Get('/profile/:userId')
    getUserProfile(
        @Param('userId') userId
    ){
        return this.userService.findById(userId)
    }
}
