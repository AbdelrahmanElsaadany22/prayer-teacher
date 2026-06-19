import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PrayerSession, PrayerSessionDocument } from './entities/prayer-session.schema';
import { CreatePrayerDto } from './dto/create-prayer.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';

@Injectable()
export class PrayerService {
  constructor(
    @InjectModel(PrayerSession.name)
    private readonly sessionModel: Model<PrayerSessionDocument>,
  ) {}

  create(userId: string, dto: CreatePrayerDto): Promise<PrayerSession> {
    return this.sessionModel.create({ ...dto, userId: new Types.ObjectId(userId) });
  }

  async findAll(userId: string, { page, limit }: PaginationQueryDto) {
    const filter = { userId: new Types.ObjectId(userId) };
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.sessionModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.sessionModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }
}
