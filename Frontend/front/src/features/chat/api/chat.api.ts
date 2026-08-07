import { api } from '../../../shared/api/axios';
import type { ChatAdmin, Conversation, Message } from '../types/chat.types';

export async function getUnreadCounts(): Promise<Record<string, number>> {
  const res = await api.get<Record<string, number>>('/chat/unread-counts');
  return res.data;
}

/** The admin a learner sends their Fatiha recitation to. */
export async function getChatAdmin(): Promise<ChatAdmin> {
  const res = await api.get<ChatAdmin>('/chat/admin');
  return res.data;
}

/** Every conversation the current user is part of — the admin's inbox. */
export async function getConversations(): Promise<Conversation[]> {
  const res = await api.get<Conversation[]>('/chat/conversations');
  return res.data;
}

export async function sendVoiceMessage(
  receiverId: string,
  blob: Blob,
): Promise<Message> {
  const form = new FormData();
  // The extension matters to Cloudinary's format detection, so the blob is
  // named rather than sent anonymously.
  form.append('audio', blob, 'recitation.webm');

  const res = await api.post<Message>(`/chat/voice/${receiverId}`, form, {
    // Let the browser set multipart/form-data with its own boundary; the
    // client's default JSON content-type would break the upload.
    headers: { 'Content-Type': undefined },
  });
  return res.data;
}
