import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Model } from 'mongoose';

export type CreateUserData = Pick<User, 'name' | 'email' | 'password'>;

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  create(data: CreateUserData): Promise<UserDocument> {
    return this.userModel.create(data);
  }
  
  findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).select('+password').exec();
  }

  findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  searchByName(query: string, excludeId?: string): Promise<UserDocument[]> {
    const trimmed = query.trim();
    if (!trimmed) return Promise.resolve([]);
    // escape regex special chars so user input is treated literally
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const filter: Record<string, unknown> = {
      name: { $regex: escaped, $options: 'i' },
    };
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }
    return this.userModel.find(filter).limit(10).exec();
  }
}
