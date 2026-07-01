import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../../shared/i18n/LanguageProvider';
import { useBgPattern } from '../../../shared/theme/PatternProvider';
import {
  type PatternParams,
  type MaterialId,
  MATERIALS,
  MATERIAL_DEFS,
  GEOMETRIES,
  paintPatternCanvas,
  randomSeed,
} from '../../../shared/theme/islamicPattern';
import css from './IslamicPatternStudio.module.css';

const PREVIEW_W = 480;
const PREVIEW_H = 300;

export default function IslamicPatternStudio() {
  const { t } = useI18n();
  const { params: appliedParams, applyParams } = useBgPattern();
  const [draft, setDraft] = useState<PatternParams>(appliedParams);
  const [justConstructed, setJustConstructed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  function set<K extends keyof PatternParams>(key: K, value: PatternParams[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setJustConstructed(false);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    paintPatternCanvas(ctx, draft, PREVIEW_W, PREVIEW_H);
  }, [draft]);

  function handleConstruct() {
    applyParams(draft);
    setJustConstructed(true);
  }

  function handleExport() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `islamic-pattern-${draft.seed}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  function handleShuffleSeed() {
    set('seed', randomSeed());
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
      <SliderRow label={t('pattern.ornament')} value={draft.ornament} onChange={(v) => set('ornament', v)} />

      <h4 className={css.sectionTitle}>{t('pattern.stonework')}</h4>
      <SliderRow label={t('pattern.lineWeight')} value={draft.lineWeight} onChange={(v) => set('lineWeight', v)} />
      <SliderRow label={t('pattern.opacity')} value={draft.opacity} onChange={(v) => set('opacity', v)} />
      <SliderRow label={t('pattern.border')} value={draft.border} onChange={(v) => set('border', v)} />

      <h4 className={css.sectionTitle}>{t('pattern.seed')}</h4>
      <div className={css.seedRow}>
        <input
          type="text"
          className={css.seedInput}
          value={draft.seed}
          maxLength={16}
          onChange={(e) => set('seed', e.target.value.toUpperCase())}
        />
        <button type="button" className={css.shuffleBtn} onClick={handleShuffleSeed} title={t('pattern.shuffle')}>
          ⟳
        </button>
      </div>
      <p className={css.seedHint}>{t('pattern.seedHint')}</p>

      <div className={css.actions}>
        <button type="button" className={css.constructBtn} onClick={handleConstruct}>
          {justConstructed ? t('pattern.constructed') : t('pattern.construct')}
        </button>
        <button type="button" className={css.exportBtn} onClick={handleExport}>
          {t('pattern.exportPng')}
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

function SliderRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className={css.sliderRow}>
      <span className={css.sliderLabel}>{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={css.slider}
      />
      <span className={css.sliderValue}>{value}</span>
    </div>
  );
}
