import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './stratigies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt.auth.guard';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    UsersModule,
    MailModule,

    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '1d',
        },
      }),
    }),
  ],

  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  exports:[JwtModule]
})
export class AuthModule {}
