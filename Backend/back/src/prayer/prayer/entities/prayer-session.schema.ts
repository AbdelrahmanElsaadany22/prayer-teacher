import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PrayerSessionDocument = HydratedDocument<PrayerSession>;

@Schema({ timestamps: true })
export class PrayerSession {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  prayerName!: string;

  @Prop({ required: true })
  rakas!: number;

  @Prop({ required: true })
  accuracy!: number;

  @Prop({ required: true })
  duration!: string;

  @Prop({ required: true })
  mistakes!: number;

  @Prop({ type: Object, default: {} })
  mistakeDetails!: Record<string, unknown>;
}

export const PrayerSessionSchema = SchemaFactory.createForClass(PrayerSession);

// Speeds up the per-user, newest-first paginated listing.
PrayerSessionSchema.index({ userId: 1, createdAt: -1 });
