import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private readonly config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.getOrThrow<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.config.getOrThrow<string>('CLOUDINARY_API_KEY'),
      api_secret: this.config.getOrThrow<string>('CLOUDINARY_API_SECRET'),
    });
  }

  // ارفع صورة من الـ buffer وارجّع الـ secure_url
  uploadImage(file: Express.Multer.File, folder = 'profile-pictures'): Promise<string> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, result?: UploadApiResponse) => {
          if (error || !result) {
            return reject(
              new InternalServerErrorException('Failed to upload image'),
            );
          }
          resolve(result.secure_url);
        },
      );
      upload.end(file.buffer);
    });
  }

  /**
   * Uploads a voice recording and returns its URL. Cloudinary has no separate
   * audio resource type — audio is handled under `video`, which is why that is
   * what's passed here.
   */
  uploadAudio(file: Express.Multer.File, folder = 'voice-messages'): Promise<string> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'video' },
        (error, result?: UploadApiResponse) => {
          if (error || !result) {
            return reject(
              new InternalServerErrorException('Failed to upload recording'),
            );
          }
          resolve(result.secure_url);
        },
      );
      upload.end(file.buffer);
    });
  }
}
