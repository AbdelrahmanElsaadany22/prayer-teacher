import { Module } from '@nestjs/common';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';
import { MongooseModule, Schema } from '@nestjs/mongoose';
import { friendRequest, friendRequestSchema } from './schemas/friendRequest.schema';
import { UsersService } from '../users/users.service';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports:[
MongooseModule.forFeature([
      {
        name: friendRequest.name,
        schema: friendRequestSchema
      },
      {
        name: User.name,
        schema: UserSchema
      }
    ])
    
  ],
  controllers: [FriendsController],
  providers: [FriendsService]
})
export class FriendsModule {

}
