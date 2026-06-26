const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export function avatarUrl(pic?: string | null): string | null {
  if (!pic) return null;
  if (pic.startsWith('http://') || pic.startsWith('https://')) return pic;
  return `${API_BASE}/uploads/${pic}`;
}
