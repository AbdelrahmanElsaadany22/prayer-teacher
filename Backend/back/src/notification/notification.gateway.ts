import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';


@WebSocketGateway({
  cors:{
    origin:"*"
  }
})
export class NotificationGateway
implements OnGatewayConnection, OnGatewayDisconnect {


@WebSocketServer()
server!:Server;


// userId -> set of socket ids (a user can have more than one open socket:
// e.g. the notifications socket AND a chat socket at the same time)
private users = new Map<string,Set<string>>();


constructor(
 private jwtService:JwtService
){}



async handleConnection(socket:Socket){

try{

const token =socket.handshake.auth.token;


const payload =
await this.jwtService.verifyAsync(token);
socket.data.user = payload;

// the JWT carries the user id in `sub` (see auth.service / jwt.strategy)
const userId = payload.sub;
if(!this.users.has(userId)){
 this.users.set(userId,new Set());
}
this.users.get(userId)!.add(socket.id);
}catch(err){
socket.disconnect();}

}




handleDisconnect(socket:Socket){

const userId =socket.data.user?.sub;
if(userId){
const sockets =this.users.get(userId);
sockets?.delete(socket.id);
if(sockets && sockets.size===0){
 this.users.delete(userId);
}

}

}


//اللي هتعمل نوتفي
sendToUser(
 userId:string,
 event:string,
 data:any
){

const sockets =this.users.get(userId);

if(sockets){
for(const socketId of sockets){
this.server
.to(socketId)
.emit(event,data)}}}

}