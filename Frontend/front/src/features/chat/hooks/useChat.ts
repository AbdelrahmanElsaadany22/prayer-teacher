import { useCallback, useEffect, useState } from 'react';
import { createChatSocket } from '../socket/socket';
import type { Message } from '../types/chat.types';

export function useChat(friendId: string, currentUserId: string) {
  const [socket] = useState(() => createChatSocket());
  const [messages, setMessages] = useState<Message[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let readyFired = false;

    function setup() {
      socket.emit('joinRoom', { friendId });

      socket.emit('getMessages', { friendId }, (msgs: Message[]) => {
        setMessages(msgs ?? []);
        setLoading(false);
      });

      socket.emit('checkOnline', { userId: friendId }, (res: { online: boolean }) => {
        setIsOnline(res?.online ?? false);
      });

      socket.emit('markSeen', { friendId });
    }

    function onUserOnline(data: { userId: string }) {
      // Server emits our own userId in 'userOnline' only after handleConnection
      // completes — that's the safe signal to start sending events.
      if (data.userId === currentUserId && !readyFired) {
        readyFired = true;
        setup();
      }
      if (data.userId === friendId) setIsOnline(true);
    }

    function onUserOffline(data: { userId: string }) {
      if (data.userId === friendId) setIsOnline(false);
    }

    function onNewMessage(msg: Message) {
      setMessages((prev) => [...prev, msg]);
      socket.emit('markSeen', { friendId });
    }

    function onMessagesSeen(data: { seenBy: string }) {
      // Only mark MY messages as seen when the FRIEND saw them — not when I
      // mark the friend's messages as seen (that also echoes back to this room).
      if (data.seenBy !== friendId) return;
      setMessages((prev) =>
        prev.map((m) => (m.sender === currentUserId ? { ...m, seen: true } : m)),
      );
    }

    // Register all listeners BEFORE connecting so no event is missed
    socket.on('userOnline', onUserOnline);
    socket.on('userOffline', onUserOffline);
    socket.on('newMessage', onNewMessage);
    socket.on('messagesSeen', onMessagesSeen);

    // Connect only now — guarantees userOnline listener is already attached
    socket.connect();

    return () => {
      socket.off('userOnline', onUserOnline);
      socket.off('userOffline', onUserOffline);
      socket.off('newMessage', onNewMessage);
      socket.off('messagesSeen', onMessagesSeen);
      socket.disconnect();
    };
  }, [socket, friendId, currentUserId]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      socket.emit('sendMessage', { receiver: friendId, friendId, text });
      // Sender doesn't receive 'newMessage' from server → add optimistically
      setMessages((prev) => [
        ...prev,
        {
          _id: `opt_${Date.now()}`,
          sender: currentUserId,
          receiver: friendId,
          message: text,
          seen: false,
          createdAt: new Date().toISOString(),
        },
      ]);
    },
    [socket, friendId, currentUserId],
  );

  return { messages, isOnline, loading, sendMessage };
}
