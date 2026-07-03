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

/** Reveal sweeps in from a random screen corner each time, so it never feels mechanical. */
const CORNERS = [
  { x: 0, y: 100 },   // bottom-left
  { x: 100, y: 100 }, // bottom-right
  { x: 0, y: 0 },     // top-left
  { x: 100, y: 0 },   // top-right
];

const REVEAL_MS = 900;

/** The site background's gradient layers, minus the pattern — same as index.css's `body` rule. */
const GRADIENTS =
  'radial-gradient(ellipse 70% 45% at 50% 0%, var(--glow-top), transparent 60%), ' +
  'radial-gradient(circle at 85% 100%, var(--glow-side), transparent 35%)';

// Two-stage sequence: the old pattern is wiped away to blank first, then the
// new one is drawn in — never a crossfade of both at once.
//   erase-mount → erase-grow  : blank layer grows over the (still-visible) old pattern
//   draw-mount  → draw-grow   : new-pattern layer grows over the now-blank screen
type Phase = 'erase-mount' | 'erase-grow' | 'draw-mount' | 'draw-grow';

interface Reveal {
  phase: Phase;
  x: number;
  y: number;
  newParams: PatternParams;
  newPattern: string;
}

export function PatternProvider({ children }: { children: React.ReactNode }) {
  const [params, setParams] = useState<PatternParams>(loadParams);
  const [reveal, setReveal] = useState<Reveal | null>(null);

  useEffect(() => {
    document.documentElement.style.setProperty('--pattern', buildSvgPattern(params));
    localStorage.setItem('pattern-params', JSON.stringify(params));
  }, [params]);

  // Drives the whole erase → draw sequence. Each "-mount" phase sits at
  // clip-path 0 for one extra paint before growing, so the browser always has
  // a committed starting frame to transition from.
  useEffect(() => {
    if (!reveal) return;

    if (reveal.phase === 'erase-mount' || reveal.phase === 'draw-mount') {
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setReveal((r) =>
            r ? { ...r, phase: r.phase === 'erase-mount' ? 'erase-grow' : 'draw-grow' } : r,
          );
        });
      });
      return () => cancelAnimationFrame(id);
    }

    if (reveal.phase === 'erase-grow') {
      const id = window.setTimeout(() => {
        setReveal((r) => (r ? { ...r, phase: 'draw-mount' } : r));
      }, REVEAL_MS);
      return () => window.clearTimeout(id);
    }

    // draw-grow: the new pattern has had time to fully cover the screen —
    // commit the real background and drop the overlay (invisible swap, both
    // look identical at this instant).
    const id = window.setTimeout(() => {
      setParams(reveal.newParams);
      setReveal(null);
    }, REVEAL_MS);
    return () => window.clearTimeout(id);
  }, [reveal]);

  function applyParams(p: PatternParams) {
    const { x, y } = CORNERS[Math.floor(Math.random() * CORNERS.length)];
    setReveal({ phase: 'erase-mount', x, y, newParams: p, newPattern: buildSvgPattern(p) });
  }

  // The eraser layer grows once (erase-mount → erase-grow) and then *stays*
  // fully covering the screen for the rest of the sequence — it must never
  // shrink back down, or the still-uncommitted old background would flash
  // through underneath for a frame before the drawer layer grows over it.
  const eraserGrown = !!reveal && reveal.phase !== 'erase-mount';
  const showDrawer = reveal?.phase === 'draw-mount' || reveal?.phase === 'draw-grow';
  const drawerGrown = reveal?.phase === 'draw-grow';

  return (
    <PatternContext.Provider value={{ params, applyParams }}>
      {reveal && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
            backgroundImage: GRADIENTS,
            backgroundColor: 'var(--background)',
            clipPath: `circle(${eraserGrown ? 150 : 0}vmax at ${reveal.x}% ${reveal.y}%)`,
            transition: `clip-path ${REVEAL_MS}ms ease-out`,
          }}
        />
      )}
      {showDrawer && reveal && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
            backgroundImage: `${reveal.newPattern}, ${GRADIENTS}`,
            backgroundColor: 'var(--background)',
            clipPath: `circle(${drawerGrown ? 150 : 0}vmax at ${reveal.x}% ${reveal.y}%)`,
            transition: `clip-path ${REVEAL_MS}ms ease-out`,
          }}
        />
      )}
      {children}
    </PatternContext.Provider>
  );
}

export function useBgPattern() {
  return useContext(PatternContext);
}
