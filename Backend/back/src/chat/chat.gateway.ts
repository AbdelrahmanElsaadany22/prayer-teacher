import { ConnectedSocket, MessageBody, OnGatewayConnection, SubscribeMessage, WebSocketGateway, WsException } from '@nestjs/websockets';
import { ChatService } from './chat.service';
import { Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';


@WebSocketGateway()
export class ChatGateway implements OnGatewayConnection{
  constructor(private chatService:ChatService,
    private jwtService:JwtService
  ){}
  async handleConnection(socket:Socket) {
    try {
      const token=socket.handshake.auth.token
      const payload=await this.jwtService.verifyAsync(token)
      socket.data.user=payload
      console.log("Connected User:",socket.data.user)
    } catch (error) {
      socket.disconnect()
    }
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

}
