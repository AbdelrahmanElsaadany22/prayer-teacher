import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UsersController } from './users.controller';
import {
  PrayerSession,
  PrayerSessionSchema,
} from '../prayer/prayer/entities/prayer-session.schema';
import {
  friendRequest,
  friendRequestSchema,
} from '../friends/schemas/friendRequest.schema';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    CloudinaryModule,
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: PrayerSession.name,
        schema: PrayerSessionSchema,
      },
      {
        name: friendRequest.name,
        schema: friendRequestSchema,
      },
    ]),
  ],
  providers: [UsersService],
  exports: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}
