import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { MongooseModule } from '@nestjs/mongoose';
import { Message, MessageSchema } from './schemas/chat.schema';
import { JwtModule } from '@nestjs/jwt';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports:[
    JwtModule,
    MongooseModule.forFeature([
      {
        name:Message.name,
        schema:MessageSchema
      },
      {
        name:User.name,
        schema:UserSchema
      }
    ])
  ],
  providers: [ChatService, ChatGateway]
})
export class ChatModule {}
