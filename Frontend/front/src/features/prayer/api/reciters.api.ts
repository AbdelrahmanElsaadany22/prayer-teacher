import { api } from '../../../shared/api/axios';

export interface Reciter {
  id: number;
  name: string;
  server: string;
}

/**
 * The reciter used when the user hasn't picked one — Abdul Rashid Sufi (Hafs
 * 'an 'Asim). MUST match the backend's RECITER_BASE so the ayah panel's timing
 * lines up with the audio the backend serves by default.
 */
export const DEFAULT_RECITER_SERVER = 'https://server16.mp3quran.net/soufi/Rewayat-Hafs-A-n-Assem';

export async function getReciters(language: 'ar' | 'en' = 'ar'): Promise<Reciter[]> {
  const res = await api.get<Reciter[]>('/recitation/reciters', { params: { language } });
  return res.data;
}
