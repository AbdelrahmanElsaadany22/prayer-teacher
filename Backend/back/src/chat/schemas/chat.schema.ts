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
}


export const MessageSchema =
SchemaFactory.createForClass(Message);