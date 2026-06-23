import { io, type Socket } from 'socket.io-client';
import { authTokenStorage } from '../../../shared/api/axios';

export function createNotificationSocket(): Socket {
  return io(import.meta.env.VITE_API_URL ?? 'http://localhost:3000', {
    autoConnect: false,
    transports: ['websocket'], // skip HTTP polling — avoids socket.io v4 CORS block
    auth: { token: authTokenStorage.get() },
  });
}
