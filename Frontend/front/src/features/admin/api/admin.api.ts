import { api } from '../../../shared/api/axios';
import type { AdminUserDashboard, AdminUsersPage } from '../types/admin.types';

export async function getAdminUsers(
  page: number,
  limit: number,
): Promise<AdminUsersPage> {
  const res = await api.get<AdminUsersPage>('/admin/users', {
    params: { page, limit },
  });
  return res.data;
}

export async function getAdminUserDashboard(
  userId: string,
): Promise<AdminUserDashboard> {
  const res = await api.get<AdminUserDashboard>(`/admin/users/${userId}`);
  return res.data;
}

export async function deleteAdminUser(userId: string) {
  const res = await api.delete<{ message: string; deletedId: string }>(
    `/admin/users/${userId}`,
  );
  return res.data;
}
