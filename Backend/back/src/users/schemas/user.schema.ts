import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

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


  
  @Prop({
 type:[
  {
   type: mongoose.Schema.Types.ObjectId,
   ref:"User"
  }
 ],
 default:[]
})
friends!:Types.ObjectId[]
}

export const UserSchema = SchemaFactory.createForClass(User);
