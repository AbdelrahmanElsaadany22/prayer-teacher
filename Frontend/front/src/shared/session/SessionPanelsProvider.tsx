import { createContext, useCallback, useContext, useEffect, useState } from 'react';

/** The three things a learner can have on screen during a session. */
export type SessionPanel = 'camera' | 'model' | 'recitation';

export type SessionPanels = Record<SessionPanel, boolean>;

export const SESSION_PANELS: SessionPanel[] = ['camera', 'model', 'recitation'];

/** Two is the floor: one panel alone leaves too little to follow along with. */
export const MIN_ENABLED_PANELS = 2;

const STORAGE_KEY = 'salah.sessionPanels';
const DEFAULTS: SessionPanels = { camera: true, model: true, recitation: true };

interface SessionPanelsContextValue {
  panels: SessionPanels;
  /**
   * Flips one panel. Turning the last-but-one off is refused rather than
   * silently ignored, so the caller can explain why nothing happened.
   */
  togglePanel: (panel: SessionPanel) => boolean;
  enabledCount: number;
  /** Whether this panel may be switched off right now. */
  canDisable: (panel: SessionPanel) => boolean;
}

const SessionPanelsContext = createContext<SessionPanelsContextValue>({
  panels: DEFAULTS,
  togglePanel: () => false,
  enabledCount: SESSION_PANELS.length,
  canDisable: () => false,
});

function readStored(): SessionPanels {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<SessionPanels>;
    const merged = {
      camera: parsed.camera ?? DEFAULTS.camera,
      model: parsed.model ?? DEFAULTS.model,
      recitation: parsed.recitation ?? DEFAULTS.recitation,
    };
    // Stored state could have been hand-edited below the floor; fall back
    // rather than starting a session with a single panel.
    const enabled = SESSION_PANELS.filter((p) => merged[p]).length;
    return enabled >= MIN_ENABLED_PANELS ? merged : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function SessionPanelsProvider({ children }: { children: React.ReactNode }) {
  const [panels, setPanels] = useState<SessionPanels>(readStored);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(panels));
  }, [panels]);

  const enabledCount = SESSION_PANELS.filter((p) => panels[p]).length;

  const canDisable = useCallback(
    (panel: SessionPanel) => !panels[panel] || enabledCount > MIN_ENABLED_PANELS,
    [panels, enabledCount],
  );

  const togglePanel = useCallback(
    (panel: SessionPanel) => {
      let changed = false;
      setPanels((prev) => {
        const turningOff = prev[panel];
        const stillOn = SESSION_PANELS.filter((p) => prev[p]).length;
        if (turningOff && stillOn <= MIN_ENABLED_PANELS) return prev;
        changed = true;
        return { ...prev, [panel]: !prev[panel] };
      });
      return changed;
    },
    [],
  );

  return (
    <SessionPanelsContext.Provider
      value={{ panels, togglePanel, enabledCount, canDisable }}
    >
      {children}
    </SessionPanelsContext.Provider>
  );
}

export function useSessionPanels() {
  return useContext(SessionPanelsContext);
}
