import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../../shared/i18n/LanguageProvider';
import { useBgPattern } from '../../../shared/theme/PatternProvider';
import {
  type PatternParams,
  type MaterialId,
  MATERIALS,
  MATERIAL_DEFS,
  GEOMETRIES,
  DEFAULT_PATTERN_PARAMS,
  paintPatternCanvas,
} from '../../../shared/theme/islamicPattern';
import css from './IslamicPatternStudio.module.css';

const PREVIEW_W = 480;
const PREVIEW_H = 300;

export default function IslamicPatternStudio() {
  const { t } = useI18n();
  const { params, applyParams } = useBgPattern();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sliders only edit this local draft — the studio preview follows it live,
  // but the site-wide background doesn't change until "Apply" commits it
  // (with a reveal animation).
  const [draft, setDraft] = useState<PatternParams>(params);

  function set<K extends keyof PatternParams>(key: K, value: PatternParams[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    paintPatternCanvas(ctx, draft, PREVIEW_W, PREVIEW_H);
  }, [draft]);

  function handleExport() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'islamic-pattern.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  function handleApply() {
    applyParams(draft);
  }

  function handleReset() {
    setDraft(DEFAULT_PATTERN_PARAMS);
    applyParams(DEFAULT_PATTERN_PARAMS);
  }

  return (
    <div className={css.studio}>
      <canvas ref={canvasRef} width={PREVIEW_W} height={PREVIEW_H} className={css.preview} />

      <h4 className={css.sectionTitle}>{t('pattern.material')}</h4>
      <div className={css.materialList}>
        {MATERIALS.map((id) => (
          <MaterialRow
            key={id}
            id={id}
            active={draft.material === id}
            label={t(`pattern.material.${id}`)}
            onClick={() => set('material', id)}
          />
        ))}
      </div>

      <h4 className={css.sectionTitle}>{t('pattern.geometry')}</h4>
      <div className={css.segmented}>
        {GEOMETRIES.map((n) => (
          <button
            key={n}
            type="button"
            className={`${css.segOpt}${draft.geometry === n ? ` ${css.segOptActive}` : ''}`}
            onClick={() => set('geometry', n)}
          >
            {n}
          </button>
        ))}
      </div>

      <SliderRow label={t('pattern.complexity')} value={draft.complexity} onChange={(v) => set('complexity', v)} />
      <SliderRow label={t('pattern.density')} value={draft.density} onChange={(v) => set('density', v)} />
      <SliderRow label={t('pattern.spacing')} value={draft.spacing} onChange={(v) => set('spacing', v)} />
      <SliderRow
        label={t('pattern.rotation')}
        value={draft.rotation}
        max={90}
        onChange={(v) => set('rotation', v)}
      />

      <h4 className={css.sectionTitle}>{t('pattern.stonework')}</h4>
      <SliderRow label={t('pattern.lineWeight')} value={draft.lineWeight} onChange={(v) => set('lineWeight', v)} />
      <SliderRow label={t('pattern.opacity')} value={draft.opacity} onChange={(v) => set('opacity', v)} />
      <label className={css.checkboxRow}>
        <input
          type="checkbox"
          className={css.checkbox}
          checked={draft.border}
          onChange={(e) => set('border', e.target.checked)}
        />
        <span className={css.checkboxLabel}>{t('pattern.border')}</span>
      </label>

      <div className={css.actions}>
        <button type="button" className={css.resetBtn} onClick={handleReset}>
          {t('pattern.reset')}
        </button>
        <button type="button" className={css.resetBtn} onClick={handleExport}>
          {t('pattern.exportPng')}
        </button>
        <button type="button" className={css.applyBtn} onClick={handleApply}>
          {t('pattern.apply')}
        </button>
      </div>
    </div>
  );
}

function MaterialRow({ id, active, label, onClick }: { id: MaterialId; active: boolean; label: string; onClick: () => void }) {
  const m = MATERIAL_DEFS[id];
  return (
    <button type="button" className={`${css.materialRow}${active ? ` ${css.materialRowActive}` : ''}`} onClick={onClick}>
      <span
        className={css.swatch}
        style={{
          background: `radial-gradient(circle at 35% 30%, ${m.stroke}, ${m.bgTo} 55%)`,
          borderColor: m.bgFrom,
        }}
      />
      <span className={css.materialLabel}>{label}</span>
      {active && <span className={css.materialMark}>◆</span>}
    </button>
  );
}

function SliderRow({
  label,
  value,
  onChange,
  max = 100,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  return (
    <div className={css.sliderRow}>
      <span className={css.sliderLabel}>{label}</span>
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={css.slider}
      />
      <span className={css.sliderValue}>{value}</span>
    </div>
  );
}
