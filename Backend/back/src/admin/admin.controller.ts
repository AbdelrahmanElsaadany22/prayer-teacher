import {
  Controller,
  Delete,
  Get,
  Body,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import { SetIjazahDto } from './dto/set-ijazah.dto';

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
  listUsers(@Query() query: AdminUsersQueryDto) {
    return this.adminService.listUsers(query.page, query.limit, query.q);
  }

  @Get('users/:userId')
  getUserDashboard(@Param('userId') userId: string) {
    return this.adminService.getUserDashboard(userId);
  }

  @Patch('users/:userId/ijazah')
  setFatihaIjazah(
    @Param('userId') userId: string,
    @Body() dto: SetIjazahDto,
  ) {
    return this.adminService.setFatihaIjazah(userId, dto.granted);
  }

  @Delete('users/:userId')
  deleteUser(@Param('userId') userId: string, @Req() req: AuthRequest) {
    return this.adminService.deleteUser(userId, req.user.id);
  }
}
