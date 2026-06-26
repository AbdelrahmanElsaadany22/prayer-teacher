import { api } from '../../../shared/api/axios';

export async function getUnreadCounts(): Promise<Record<string, number>> {
  const res = await api.get<Record<string, number>>('/chat/unread-counts');
  return res.data;
}
