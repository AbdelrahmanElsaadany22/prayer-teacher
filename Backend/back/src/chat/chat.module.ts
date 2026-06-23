import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { MongooseModule } from '@nestjs/mongoose';
import { Message, MessageSchema } from './schemas/chat.schema';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports:[
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '1d',
        },
      }),
    }),
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
