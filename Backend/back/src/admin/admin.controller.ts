import {
  Controller,
  Delete,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import { PaginationQueryDto } from '../prayer/prayer/dto/pagination-query.dto';

interface AuthRequest {
  user: { id: string; email: string };
}

// Order matters: the JWT guard has to populate req.user before AdminGuard can
// look the role up.
@UseGuards(AuthGuard('jwt'), AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  listUsers(@Query() query: PaginationQueryDto) {
    return this.adminService.listUsers(query.page, query.limit);
  }

  @Get('users/:userId')
  getUserDashboard(@Param('userId') userId: string) {
    return this.adminService.getUserDashboard(userId);
  }

  @Delete('users/:userId')
  deleteUser(@Param('userId') userId: string, @Req() req: AuthRequest) {
    return this.adminService.deleteUser(userId, req.user.id);
  }
}
