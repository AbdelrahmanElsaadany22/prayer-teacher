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
}
export const friendRequestSchema = SchemaFactory.createForClass(friendRequest);