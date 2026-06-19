import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PrayerService } from './prayer.service';
import { PrayerController } from './prayer.controller';
import { PrayerSession, PrayerSessionSchema } from './entities/prayer-session.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PrayerSession.name, schema: PrayerSessionSchema }]),
  ],
  controllers: [PrayerController],
  providers: [PrayerService],
})
export class PrayerModule {}
