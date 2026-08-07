import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

export enum Role {
  USER = 'user',
  ADMIN = 'admin',
}

@Schema({ timestamps: true })
export class User {
  @Prop({
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 80,
  })
  name!: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 254,
  })
  email!: string;

  @Prop({
    required: true,
    select: false,
  })
  password!: string;

  @Prop({ type: String, default: null })
  profilePicture?: string | null;

  @Prop({ type: Boolean, default: false })
  isVerified!: boolean;

  // Checked against the database on every admin request rather than read from
  // the JWT, so revoking an admin takes effect immediately instead of waiting
  // for their existing token to expire.
  @Prop({ type: String, enum: Role, default: Role.USER })
  role!: Role;

  @Prop({ type: String, select: false, default: null })
  verificationCode?: string | null;

  @Prop({ type: Date, select: false, default: null })
  verificationCodeExpires?: Date | null;

  @Prop({
    type: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    default: [],
  })
  friends!: Types.ObjectId[];

  // Maintained by `timestamps: true` above. Declared (without @Prop, which
  // would redefine them) so TypeScript knows they exist on a fetched document.
  createdAt?: Date;
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
