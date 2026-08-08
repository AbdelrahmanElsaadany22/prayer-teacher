import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import { User, UserSchema } from '../users/schemas/user.schema';
import {
  PrayerSession,
  PrayerSessionSchema,
} from '../prayer/prayer/entities/prayer-session.schema';
import {
  friendRequest,
  friendRequestSchema,
} from '../friends/schemas/friendRequest.schema';
import { Message, MessageSchema } from '../chat/schemas/chat.schema';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    NotificationModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: PrayerSession.name, schema: PrayerSessionSchema },
      { name: friendRequest.name, schema: friendRequestSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
})
export class AdminModule {}
