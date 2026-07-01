import { createContext, useContext, useEffect, useState } from 'react';

export type Corners = 'default' | 'sharp';

interface RadiusContextValue {
  corners: Corners;
  setCorners: (c: Corners) => void;
}

const RadiusContext = createContext<RadiusContextValue>({
  corners: 'default',
  setCorners: () => {},
});

const DEFAULT_RADIUS = {
  '--radius-sm': '6px',
  '--radius-md': '10px',
  '--radius-lg': '14px',
  '--radius-xl': '20px',
};

function applyCorners(corners: Corners) {
  const root = document.documentElement;
  if (corners === 'sharp') {
    Object.keys(DEFAULT_RADIUS).forEach((v) => root.style.setProperty(v, '0px'));
  } else {
    Object.entries(DEFAULT_RADIUS).forEach(([v, val]) => root.style.setProperty(v, val));
  }
}

export function RadiusProvider({ children }: { children: React.ReactNode }) {
  const [corners, setCornersState] = useState<Corners>(() => {
    const s = localStorage.getItem('corners') as Corners;
    return s === 'sharp' ? 'sharp' : 'default';
  });

  useEffect(() => {
    applyCorners(corners);
    localStorage.setItem('corners', corners);
  }, [corners]);

  return (
    <RadiusContext.Provider value={{ corners, setCorners: setCornersState }}>
      {children}
    </RadiusContext.Provider>
  );
}

export function useCorners() {
  return useContext(RadiusContext);
}
