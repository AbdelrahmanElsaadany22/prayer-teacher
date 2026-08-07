import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseFilePipe,
  MaxFileSizeValidator,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

/** Recitations run a couple of minutes at most; anything larger is a mistake. */
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

@UseGuards(AuthGuard('jwt'))
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
    private readonly cloudinary: CloudinaryService,
  ) {}

  // عدد الرسائل غير المقروءة لكل صديق
  @Get('/unread-counts')
  getUnreadCounts(@Req() req) {
    return this.chatService.getUnreadCounts(req.user.id);
  }

  /** The admin to send a Fatiha recitation to, for the ijazah. */
  @Get('/admin')
  getAdmin() {
    return this.chatService.findAdmin();
  }

  /** Every conversation this user is part of — the admin's inbox. */
  @Get('/conversations')
  getConversations(@Req() req) {
    return this.chatService.getConversations(req.user.id);
  }

  /**
   * Uploads a voice recording and sends it as a message. Multipart over HTTP
   * rather than through the socket, which reuses the existing upload path and
   * keeps a multi-megabyte blob out of a websocket frame.
   */
  @Post('/voice/:receiverId')
  @UseInterceptors(
    FileInterceptor('audio', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_AUDIO_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('audio/')) {
          return cb(new BadRequestException('Only audio files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async sendVoice(
    @Req() req,
    @Param('receiverId') receiverId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_AUDIO_BYTES })],
      }),
    )
    file: Express.Multer.File,
  ) {
    const senderId = req.user.id as string;

    // Same rule the socket path enforces — the guard belongs on the server,
    // not on whichever client happens to be calling.
    const allowed = await this.chatService.canMessage(senderId, receiverId);
    if (!allowed) {
      throw new ForbiddenException('You can only message friends');
    }

    const audioUrl = await this.cloudinary.uploadAudio(file);
    const message = await this.chatService.storeVoiceMessage(
      senderId,
      receiverId,
      audioUrl,
    );

    this.chatGateway.emitStoredMessage(
      senderId,
      receiverId,
      message,
      '🎤 Voice message',
    );

    return message;
  }
}
