import { api } from '../../../shared/api/axios';
import type { FriendProfile, FriendRequest, UserFull } from '../types/friends.types';

export async function sendFriendRequest(receiverId: string) {
  const res = await api.post(`/friend-request/${receiverId}`);
  return res.data;
}

export async function getIncomingRequests(): Promise<FriendRequest[]> {
  const res = await api.get<FriendRequest[]>('/friend-request');
  return res.data;
}

export async function acceptFriendRequest(requestId: string) {
  const res = await api.patch(`/friend-request/accept/${requestId}`);
  return res.data;
}

export async function rejectFriendRequest(requestId: string) {
  const res = await api.delete(`/friend-request/reject/${requestId}`);
  return res.data;
}

export async function getUserProfile(userId: string): Promise<FriendProfile> {
  const res = await api.get<FriendProfile>(`/user/profile/${userId}`);
  return res.data;
}

export async function getCurrentUserFull(): Promise<UserFull> {
  const res = await api.get<UserFull>('/user/current');
  return res.data;
}

export async function searchUsersByName(query: string): Promise<FriendProfile[]> {
  const res = await api.get<FriendProfile[]>('/user/search', {
    params: { q: query },
  });
  return res.data;
}
