import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
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

    @Get('/search')
    @UseGuards(AuthGuard('jwt'))
    searchUsers(@Query('q') q: string, @Req() req){
        return this.userService.searchByName(q ?? '', req.user.id)
    }

    // Dashboard comparison: the viewer's stats next to each of their friends'.
    @Get('/comparison')
    @UseGuards(AuthGuard('jwt'))
    getFriendsComparison(@Req() req){
        return this.userService.getFriendsComparison(req.user.id)
    }
    @Get('/profile/:userId')
    getUserProfile(
        @Param('userId') userId
    ){
        return this.userService.findById(userId)
    }

    // Public profile + prayer stats, used when you open a user from the search.
    @Get('/profile/:userId/stats')
    @UseGuards(AuthGuard('jwt'))
    getUserProfileWithStats(
        @Param('userId') userId: string,
        @Req() req
    ){
        return this.userService.getProfileWithStats(userId, req.user.id)
    }
}
