import { Test, TestingModule } from '@nestjs/testing';
import { PrayerService } from './prayer.service';

describe('PrayerService', () => {
  let service: PrayerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrayerService],
    }).compile();

    service = module.get<PrayerService>(PrayerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
