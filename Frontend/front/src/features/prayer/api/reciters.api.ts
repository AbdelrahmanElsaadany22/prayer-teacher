import { api } from '../../../shared/api/axios';

export interface Reciter {
  id: number;
  name: string;
  server: string;
}

export async function getReciters(language: 'ar' | 'en' = 'ar'): Promise<Reciter[]> {
  const res = await api.get<Reciter[]>('/recitation/reciters', { params: { language } });
  return res.data;
}
