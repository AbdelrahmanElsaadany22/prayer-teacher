import { createContext, useContext, useEffect, useState } from 'react';
import {
  type PatternParams,
  DEFAULT_PATTERN_PARAMS,
  buildSvgPattern,
} from './islamicPattern';

interface PatternContextValue {
  params: PatternParams;
  applyParams: (p: PatternParams) => void;
}

const PatternContext = createContext<PatternContextValue>({
  params: DEFAULT_PATTERN_PARAMS,
  applyParams: () => {},
});

function loadParams(): PatternParams {
  try {
    const raw = localStorage.getItem('pattern-params');
    if (!raw) return DEFAULT_PATTERN_PARAMS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PATTERN_PARAMS, ...parsed };
  } catch {
    return DEFAULT_PATTERN_PARAMS;
  }
}

export function PatternProvider({ children }: { children: React.ReactNode }) {
  const [params, setParams] = useState<PatternParams>(loadParams);

  useEffect(() => {
    document.documentElement.style.setProperty('--pattern', buildSvgPattern(params));
    localStorage.setItem('pattern-params', JSON.stringify(params));
  }, [params]);

  function applyParams(p: PatternParams) {
    setParams(p);
  }

  return (
    <PatternContext.Provider value={{ params, applyParams }}>
      {children}
    </PatternContext.Provider>
  );
}

export function useBgPattern() {
  return useContext(PatternContext);
}
