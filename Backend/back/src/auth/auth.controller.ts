import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendCodeDto } from './dto/resend-code.dto';
import { JwtAuthGuard } from './guards/jwt.auth.guard';

type AuthenticatedRequest = {
  user: {
    id: string;
    email: string;
  };
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() body: SignupDto) {
    return this.authService.signup(body);
  }

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @HttpCode(HttpStatus.OK)
  @Post('verify')
  verify(@Body() body: VerifyEmailDto) {
    return this.authService.verifyEmail(body);
  }

  @HttpCode(HttpStatus.OK)
  @Post('resend-code')
  resendCode(@Body() body: ResendCodeDto) {
    return this.authService.resendCode(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Request() request: AuthenticatedRequest) {
    return this.authService.getProfile(request.user.id);
  }
}
