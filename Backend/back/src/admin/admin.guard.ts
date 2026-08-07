import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role, User, UserDocument } from '../users/schemas/user.schema';

/**
 * Allows the request through only for an admin. Runs after the JWT guard, so
 * `req.user` is already populated.
 *
 * The role is read from the database rather than from the token: a token is
 * valid until it expires, so trusting a role baked into it would leave a
 * demoted admin with admin powers until then.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { id?: string } }>();

    const userId = request.user?.id;
    if (!userId) throw new ForbiddenException('Admins only');

    const user = await this.userModel
      .findById(userId)
      .select('role')
      .lean()
      .exec();

    if (user?.role !== Role.ADMIN) {
      throw new ForbiddenException('Admins only');
    }

    return true;
  }
}
