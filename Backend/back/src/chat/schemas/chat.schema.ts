import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose from "mongoose";


@Schema({timestamps:true})
export class Message {


@Prop({
 type:mongoose.Schema.Types.ObjectId,
 ref:"User"
})
sender!:string;


@Prop({
 type:mongoose.Schema.Types.ObjectId,
 ref:"User"
})
receiver!:string;


@Prop()
message!:string;

//to check if seen or not
@Prop({
 default:false
})
seen!:boolean;

/** 'text' for a typed message, 'audio' for a recorded one (e.g. a Fatiha
 * recitation sent to the admin for the ijazah). Older documents predate this
 * field, so anything without it is treated as text. */
@Prop({ type: String, enum: ['text', 'audio'], default: 'text' })
type!: 'text' | 'audio';

/** Cloudinary URL of the recording; only set when type is 'audio'. */
@Prop({ type: String, default: null })
audioUrl?: string | null;

createdAt?: Date;
updatedAt?: Date;
}


export const MessageSchema =
SchemaFactory.createForClass(Message);