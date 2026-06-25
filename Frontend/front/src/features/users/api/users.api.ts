import { api } from '../../../shared/api/axios';
import type { FriendComparison, UserProfileWithStats, UserSearchResult } from '../types/users.types';

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  const res = await api.get<UserSearchResult[]>('/user/search', { params: { q: query } });
  return res.data;
}

export async function getUserProfileWithStats(userId: string): Promise<UserProfileWithStats> {
  const res = await api.get<UserProfileWithStats>(`/user/profile/${userId}/stats`);
  return res.data;
}

export async function uploadProfilePicture(file: File): Promise<{ filename: string }> {
  const form = new FormData();
  form.append('file', file);
  const res = await api.patch<{ filename: string }>('/user/profile-picture', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function getFriendsComparison(): Promise<FriendComparison[]> {
  const res = await api.get<FriendComparison[]>('/user/comparison');
  return res.data;
}
