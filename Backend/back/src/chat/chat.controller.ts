import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';

@UseGuards(AuthGuard('jwt'))
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // عدد الرسائل غير المقروءة لكل صديق
  @Get('/unread-counts')
  getUnreadCounts(@Req() req) {
    return this.chatService.getUnreadCounts(req.user.id);
  }
}
