import { api } from '../../../shared/api/axios';
import type { UserProfileWithStats, UserSearchResult } from '../types/users.types';

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  const res = await api.get<UserSearchResult[]>('/user/search', {
    params: { q: query },
  });
  return res.data;
}

export async function getUserProfileWithStats(
  userId: string,
): Promise<UserProfileWithStats> {
  const res = await api.get<UserProfileWithStats>(`/user/profile/${userId}/stats`);
  return res.data;
}
