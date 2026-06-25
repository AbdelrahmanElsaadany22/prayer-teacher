import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { memoryStorage } from 'multer';
import { UsersService } from './users.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('user')
export class UsersController {
  constructor(
    private readonly userService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get('/current')
  @UseGuards(AuthGuard('jwt'))
  getCurrentUser(@Req() req) {
    return this.userService.findById(req.user.id);
  }

  @Get('/search')
  @UseGuards(AuthGuard('jwt'))
  searchUsers(@Query('q') q: string, @Req() req) {
    return this.userService.searchByName(q ?? '', req.user.id);
  }

  @Get('/comparison')
  @UseGuards(AuthGuard('jwt'))
  getFriendsComparison(@Req() req) {
    return this.userService.getFriendsComparison(req.user.id);
  }

  @Get('/profile/:userId')
  getUserProfile(@Param('userId') userId: string) {
    return this.userService.findById(userId);
  }

  @Get('/profile/:userId/stats')
  @UseGuards(AuthGuard('jwt'))
  getUserProfileWithStats(@Param('userId') userId: string, @Req() req) {
    return this.userService.getProfileWithStats(userId, req.user.id);
  }

  @Patch('/profile-picture')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|jpg|png|webp|gif)$/)) {
          cb(new BadRequestException('Only image files are allowed'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async uploadProfilePicture(
    @Req() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const url = await this.cloudinaryService.uploadImage(file);
    await this.userService.updateProfilePicture(req.user.id, url);
    return { url };
  }
}
