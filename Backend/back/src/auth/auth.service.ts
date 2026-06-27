import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import { UsersService } from '../users/users.service';
import { SignupDto } from './dto/signup.dto';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendCodeDto } from './dto/resend-code.dto';
import { JwtService } from '@nestjs/jwt';
import { UserDocument } from '../users/schemas/user.schema';
import { MailService } from '../mail/mail.service';

const BCRYPT_SALT_ROUNDS = 12;
const VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function isDuplicateKeyError(error: unknown): error is { code: number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  );
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async signup(data: SignupDto) {
    const email = data.email.trim().toLowerCase();
    const existingUser = await this.usersService.findByEmail(email);

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, BCRYPT_SALT_ROUNDS);

    try {
      const user = await this.usersService.create({
        name: data.name.trim(),
        email,
        password: hashedPassword,
      });

      await this.issueVerificationCode(user);

      return {
        message:
          'Account created. A verification code has been sent to your email.',
        email: user.email,
      };
    } catch (error) {
      // The database constraint handles two simultaneous signups safely.
      if (isDuplicateKeyError(error)) {
        throw new ConflictException('Email already exists');
      }

      throw error;
    }
  }

  async login(data: LoginDto) {
    const email = data.email.trim().toLowerCase();
    const user = await this.usersService.findByEmailWithPassword(email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordMatch = await bcrypt.compare(data.password, user.password);

    if (!isPasswordMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isVerified) {
      throw new ForbiddenException(
        'Account not verified. Please verify your email before logging in.',
      );
    }

    return this.createAuthResponse(user);
  }

  async verifyEmail(data: VerifyEmailDto) {
    const email = data.email.trim().toLowerCase();
    const user = await this.usersService.findByEmailWithVerification(email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isVerified) {
      throw new BadRequestException('Account is already verified');
    }

    if (!user.verificationCode || !user.verificationCodeExpires) {
      throw new BadRequestException(
        'No verification code found. Please request a new one.',
      );
    }

    if (user.verificationCodeExpires.getTime() < Date.now()) {
      throw new BadRequestException(
        'Verification code has expired. Please request a new one.',
      );
    }

    const isMatch = await bcrypt.compare(data.code, user.verificationCode);
    if (!isMatch) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.usersService.markVerified(user.id);

    return this.createAuthResponse(user);
  }

  async resendCode(data: ResendCodeDto) {
    const email = data.email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(email);

    // Avoid leaking which emails exist: respond the same way regardless.
    if (user && !user.isVerified) {
      await this.issueVerificationCode(user);
    }

    return {
      message:
        'If the account exists and is not verified, a new verification code has been sent.',
    };
  }

  private async issueVerificationCode(user: UserDocument) {
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const hashedCode = await bcrypt.hash(code, BCRYPT_SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MS);

    await this.usersService.setVerificationCode(user.id, hashedCode, expiresAt);

    // Send the email without blocking the HTTP response: a slow or failing
    // SMTP server must not hang signup/resend. The code is already persisted,
    // so the user can retry via "resend" if delivery fails.
    void this.mailService.sendVerificationCode(user.email, code);
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    return this.serializeUser(user);
  }

  private async createAuthResponse(user: UserDocument) {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });

    return {
      user: this.serializeUser(user),
      accessToken,
    };
  }

  private serializeUser(user: UserDocument) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
    };
  }
}
