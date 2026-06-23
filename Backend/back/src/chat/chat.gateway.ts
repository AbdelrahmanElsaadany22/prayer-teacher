import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer, WsException } from '@nestjs/websockets';
import { ChatService } from './chat.service';
import { Server,Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';



@WebSocketGateway()
export class ChatGateway implements OnGatewayConnection,OnGatewayDisconnect{
  constructor(private chatService:ChatService,
    private jwtService:JwtService
  ){}
  @WebSocketServer()
  server!:Server
  private onlineUsers=new Map<string,string>;
  async handleConnection(socket:Socket) {
    try {
      const token=socket.handshake.auth.token
      const payload=await this.jwtService.verifyAsync(token)
      socket.data.user={ ...payload, id: payload.sub }
      console.log("Connected User:",socket.data.user)
      //key and value
      this.onlineUsers.set(socket.data.user.id,socket.id)
      this.server.emit("userOnline",{userId:socket.data.user.id})
    } catch (error) {
      socket.disconnect()
    }
  }


  async handleDisconnect(socket:Socket) {
    const userId =socket.data.user?.id;
    if(userId){
      this.onlineUsers.delete(userId)
      this.server.emit("userOffline",{userId:userId})}
  }


  @SubscribeMessage('joinRoom')
  joinRoom(
    @ConnectedSocket() currentSocket:Socket
    ,@MessageBody() data:any
  ){
    const senderId=currentSocket.data.user.id
    const room=[
      senderId,
      data.friendId
    ].sort().join("_")
    currentSocket.join(room)
  }


  @SubscribeMessage("sendMessage")
  async sendMessage(
    @ConnectedSocket() currentSocket:Socket,
    @MessageBody() data:any
  ){
    const senderId=currentSocket.data.user.id
    const isFriend=await this.chatService.checkFriends(senderId,data.receiver)
    if(!isFriend){
      throw new WsException("You Can Only Message Friends")
    }
    const message=await this.chatService.storeMessages(senderId,data.receiver,data.text)
    const room=[
      senderId,
      data.friendId
    ].sort().join("_")
    currentSocket.to(room).emit("newMessage",message)
  }




  @SubscribeMessage("getMessages")
  async getMessages(
    @ConnectedSocket() currentSocket:Socket,
    @MessageBody() data:any
  ){
    const userId=currentSocket.data.user.id
    return await this.chatService.getMessages(userId,data.friendId)
  }

  //check if one user online
  @SubscribeMessage("checkOnline")
  checkOnline(
  @MessageBody()data:any){
    return {online:this.onlineUsers.has(data.userId)}}


    //seen wla la2
    @SubscribeMessage("markSeen")
    async markseen(
      @ConnectedSocket() currentSocket:Socket,
      @MessageBody() data:any
    ){
      const userId =currentSocket.data.user.id;
      await this.chatService.markMessageSeen(userId,data.friendId)
      const room=[userId,data.friendId].sort().join("_")
      this.server.to(room).emit("messagesSeen",{seenBy:userId})
    }
}
