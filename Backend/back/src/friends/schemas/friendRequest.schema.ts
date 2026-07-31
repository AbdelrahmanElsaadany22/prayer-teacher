import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { Types } from "mongoose";

export enum Status {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected"
}

@Schema({ timestamps: true })
export class friendRequest{
@Prop({
 type: mongoose.Schema.Types.ObjectId,
 ref:"User"
})
sender!: Types.ObjectId

@Prop({
 type: mongoose.Schema.Types.ObjectId,
 ref:"User"
})
receiver!: Types.ObjectId

    @Prop({
        enum:Status,
        default:Status.PENDING
    })
    status!:Status

/** Whether the sender has seen that this request was accepted or rejected.
 * The outcome is only pushed over the socket, which reaches nobody who was
 * offline at the time, so it is kept here until the sender actually reads it. */
@Prop({ default: false })
senderSeen!: boolean
}
export const friendRequestSchema = SchemaFactory.createForClass(friendRequest);