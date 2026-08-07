import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer, WsException } from '@nestjs/websockets';
import { ChatService } from './chat.service';
import { Server,Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { NotificationGateway } from '../notification/notification.gateway';



@WebSocketGateway({
  cors:{
    origin:"*"
  }
})
export class ChatGateway implements OnGatewayConnection,OnGatewayDisconnect{
  constructor(private chatService:ChatService,
    private jwtService:JwtService,
    private notificationGateway:NotificationGateway
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
    // Friends, or either side being an admin — see ChatService.canMessage.
    const allowed=await this.chatService.canMessage(senderId,data.receiver)
    if(!allowed){
      throw new WsException("You Can Only Message Friends")
    }
    const message=await this.chatService.storeMessages(senderId,data.receiver,data.text)
    const room=[
      senderId,
      data.friendId
    ].sort().join("_")
    currentSocket.to(room).emit("newMessage",message)

    // Notify the receiver globally (works even if they aren't on the chat page)
    this.notificationGateway.sendToUser(data.receiver, "newNotification", {
      type: "NEW_MESSAGE",
      message: data.text,
      sender: senderId,
    })
  }




  /**
   * Delivers a message that was created outside the socket — the voice upload
   * arrives over HTTP, since multipart is a poor fit for a websocket frame.
   * Emitted to the whole room (the sender included, unlike the socket path
   * which excludes them); the client de-duplicates by message id.
   */
  emitStoredMessage(senderId:string,receiverId:string,message:unknown,preview:string){
    const room=[senderId,receiverId].sort().join("_")
    this.server.to(room).emit("newMessage",message)
    this.notificationGateway.sendToUser(receiverId,"newNotification",{
      type:"NEW_MESSAGE",
      message:preview,
      sender:senderId,
    })
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
