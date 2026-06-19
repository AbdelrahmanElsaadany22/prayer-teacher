import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { SignupDto } from './dto/signup.dto';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { UserDocument } from '../users/schemas/user.schema';

const BCRYPT_SALT_ROUNDS = 12;

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

      return this.createAuthResponse(user);
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

    return this.createAuthResponse(user);
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
