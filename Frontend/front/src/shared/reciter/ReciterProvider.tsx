import { createContext, useContext, useEffect, useState } from 'react';
import type { Reciter } from '../../features/prayer/api/reciters.api';

interface ReciterContextValue {
  /** null = use the app's built-in default reciter (Maher Al Muaiqly). */
  reciter: Reciter | null;
  setReciter: (r: Reciter | null) => void;
}

const ReciterContext = createContext<ReciterContextValue>({
  reciter: null,
  setReciter: () => {},
});

function readStored(): Reciter | null {
  try {
    const raw = localStorage.getItem('reciter');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.id === 'number' && typeof parsed.server === 'string') return parsed;
    return null;
  } catch {
    return null;
  }
}

export function ReciterProvider({ children }: { children: React.ReactNode }) {
  const [reciter, setReciter] = useState<Reciter | null>(readStored);

  useEffect(() => {
    if (reciter) localStorage.setItem('reciter', JSON.stringify(reciter));
    else localStorage.removeItem('reciter');
  }, [reciter]);

  return (
    <ReciterContext.Provider value={{ reciter, setReciter }}>
      {children}
    </ReciterContext.Provider>
  );
}

export function useReciter() {
  return useContext(ReciterContext);
}
