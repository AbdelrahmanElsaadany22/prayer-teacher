import { Controller, Get, Post, Body, UseGuards, Request, Query } from '@nestjs/common';
import { PrayerService } from './prayer.service';
import { CreatePrayerDto } from './dto/create-prayer.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt.auth.guard';

interface AuthRequest {
  user: { id: string; email: string };
}

@Controller('prayer')
@UseGuards(JwtAuthGuard)
export class PrayerController {
  constructor(private readonly prayerService: PrayerService) {}

  @Post()
  create(@Request() req: AuthRequest, @Body() dto: CreatePrayerDto) {
    return this.prayerService.create(req.user.id, dto);
  }

  @Get()
  findAll(@Request() req: AuthRequest, @Query() query: PaginationQueryDto) {
    return this.prayerService.findAll(req.user.id, query);
  }
}
