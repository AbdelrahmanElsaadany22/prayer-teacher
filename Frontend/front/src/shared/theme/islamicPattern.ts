// Procedural Islamic geometric star-pattern generator.
// A single geometry pass (buildTileCommands) feeds two renderers: an SVG
// data-URI tile (used as the site's repeating CSS background) and a canvas
// painter (used for the Preferences "studio" preview + PNG export), so the
// two outputs never drift apart.

export type Geometry = 4 | 6 | 8 | 12;
export const GEOMETRIES: Geometry[] = [4, 6, 8, 12];

export type MaterialId = 'limestone' | 'gypsum' | 'bronze' | 'pearl' | 'nightShadow';
export const MATERIALS: MaterialId[] = ['limestone', 'gypsum', 'bronze', 'pearl', 'nightShadow'];

export interface Material {
  stroke: string;
  shadow?: string;
  bgFrom: string;
  bgTo: string;
  /** Relative visual weight — multiplies the user's Opacity slider (1 = neutral). */
  intensity: number;
  glow?: boolean;
}

// Colors chosen to read as their namesake at a glance: warm tan stone,
// cool ivory plaster, glowing metal inlay, cool pearlescent white, near-black.
export const MATERIAL_DEFS: Record<MaterialId, Material> = {
  limestone:   { stroke: '#9c8355', bgFrom: '#f0e6cf', bgTo: '#dcc99e', intensity: 1 },
  gypsum:      { stroke: '#ffffff', shadow: 'rgba(20,15,5,0.35)', bgFrom: '#f2f0ea', bgTo: '#c9c4b8', intensity: 1.15 },
  bronze:      { stroke: '#e0a94f', bgFrom: '#3a2411', bgTo: '#1a0f05', intensity: 1.05, glow: true },
  pearl:       { stroke: '#fbfaf6', shadow: 'rgba(0,0,0,0.06)', bgFrom: '#eef2f2', bgTo: '#dce3e6', intensity: 0.85 },
  nightShadow: { stroke: '#3a3a3a', bgFrom: '#1c1c1c', bgTo: '#050505', intensity: 1 },
};

export interface PatternParams {
  material: MaterialId;
  geometry: Geometry;
  complexity: number; // 0-100
  density: number;    // 0-100
  spacing: number;    // 0-100 — empty gutter between repeated tiles
  lineWeight: number; // 0-100
  border: boolean;
  opacity: number;    // 0-100 — user-controlled transparency
  rotation: number;   // 0-90 degrees — motif orientation
}

export const DEFAULT_PATTERN_PARAMS: PatternParams = {
  material: 'bronze',
  geometry: 6,
  complexity: 100,
  density: 50,
  spacing: 15,
  lineWeight: 3,
  border: true,
  opacity: 7,
  rotation: 0,
};

/** Final stroke alpha: the user's slider scaled by the material's baseline weight. */
export function resolveOpacity(params: PatternParams): number {
  const intensity = MATERIAL_DEFS[params.material].intensity;
  return Math.min(0.95, Math.max(0.03, (params.opacity / 100) * intensity));
}

// ── Drawing DSL ──
export type DrawCmd =
  | { type: 'poly'; points: [number, number][] }
  | { type: 'line'; x1: number; y1: number; x2: number; y2: number }
  | { type: 'circle'; cx: number; cy: number; r: number };

function starPoints(cx: number, cy: number, outerR: number, innerR: number, points: number, rotate = 0): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI * i) / points - Math.PI / 2 + rotate;
    pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }
  return pts;
}

/**
 * One rosette motif centered inside a `cellSize`×`cellSize` repeat cell.
 * `motifSize` (≤ cellSize) is the star's own footprint — any gap between it
 * and the cell edge is the spacing gutter between repeated tiles.
 */
export function buildTileCommands(
  params: PatternParams,
  cellSize: number,
  motifSize: number = cellSize,
): DrawCmd[] {
  const { geometry, complexity, border, rotation } = params;
  const cmds: DrawCmd[] = [];
  const cx = cellSize / 2;
  const cy = cellSize / 2;
  const outerR = motifSize * 0.46;

  // User-controlled orientation of the whole motif, rotating it against the
  // (axis-aligned) border frame.
  const baseRotation = (rotation * Math.PI) / 180;

  const layers = 1 + Math.round((complexity / 100) * 3); // 1..4 overlapping star layers
  const innerRatio = 0.34 + (complexity / 100) * 0.24; // fuller stars as complexity rises
  const step = Math.PI / geometry;

  for (let l = 0; l < layers; l++) {
    cmds.push({
      type: 'poly',
      points: starPoints(cx, cy, outerR, outerR * innerRatio, geometry, baseRotation + l * step),
    });
  }

  // Center medallion
  cmds.push({ type: 'circle', cx, cy, r: motifSize * 0.03 });

  // Border frame around the motif footprint (spacing gutter stays empty)
  if (border) {
    const half = motifSize / 2;
    const inset = motifSize * 0.03;
    cmds.push({
      type: 'poly',
      points: [
        [cx - half + inset, cy - half + inset],
        [cx + half - inset, cy - half + inset],
        [cx + half - inset, cy + half - inset],
        [cx - half + inset, cy + half - inset],
      ],
    });
  }

  return cmds;
}

function lineWeightPx(lineWeight: number): number {
  return 0.6 + (lineWeight / 100) * 2.4;
}

// ── SVG tile renderer (site-wide CSS background) ──
function cmdsToSvgBody(cmds: DrawCmd[]): string {
  return cmds
    .map((c) => {
      if (c.type === 'poly') return `<polygon points="${c.points.map((p) => p.join(',')).join(' ')}"/>`;
      if (c.type === 'line') return `<line x1="${c.x1}" y1="${c.y1}" x2="${c.x2}" y2="${c.y2}"/>`;
      return `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}"/>`;
    })
    .join('');
}

function enc(svg: string): string {
  return svg.replace(/[<>#"]/g, encodeURIComponent);
}

export function buildSvgPattern(params: PatternParams): string {
  const motifSize = patternMotifSize(params.density);
  const cellSize = patternCellSize(params);
  const material = MATERIAL_DEFS[params.material];
  const cmds = buildTileCommands(params, cellSize, motifSize);
  const body = cmdsToSvgBody(cmds);
  const sw = lineWeightPx(params.lineWeight);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cellSize}" height="${cellSize}"><g fill="none" stroke="${material.stroke}" stroke-opacity="${resolveOpacity(params)}" stroke-width="${sw}">${body}</g></svg>`;
  return `url("data:image/svg+xml,${enc(svg)}")`;
}

/** The star motif's own footprint, before any spacing gutter is added. */
export function patternMotifSize(density: number): number {
  return 56 + (1 - density / 100) * 88; // 56..144
}

/** Full repeat-cell size: motif footprint plus the spacing gutter. */
export function patternCellSize(params: PatternParams): number {
  return patternMotifSize(params.density) + (params.spacing / 100) * 60; // +0..60
}

export interface ThemeBg {
  background: string;
  glowTop: string;
  glowSide: string;
}

// ── Canvas renderer (studio preview + PNG export) ──
export function paintPatternCanvas(
  ctx: CanvasRenderingContext2D,
  params: PatternParams,
  width: number,
  height: number,
  themeBg: ThemeBg,
): void {
  const material = MATERIAL_DEFS[params.material];
  const motifSize = patternMotifSize(params.density);
  const cellSize = patternCellSize(params);
  const sw = lineWeightPx(params.lineWeight) * (motifSize / 64);
  const cmds = buildTileCommands(params, cellSize, motifSize);

  // The preview's backdrop mirrors the site's actual currently-applied theme
  // background (same glow layout as index.css's `body` rule), so the studio
  // shows exactly what the pattern will look like once applied — not an
  // arbitrary material-tinted backdrop. `themeBg` is passed in (resolved
  // straight from THEME_CONFIGS) rather than read from computed CSS here,
  // because reading the DOM would race ThemeProvider's own effect that writes
  // those custom properties — a same-render read would see last render's
  // color, lagging the preview one theme-switch behind.
  ctx.fillStyle = themeBg.background;
  ctx.fillRect(0, 0, width, height);

  const topGlow = ctx.createRadialGradient(width * 0.5, 0, 0, width * 0.5, 0, width * 0.55);
  topGlow.addColorStop(0, themeBg.glowTop);
  topGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, width, height);

  const sideGlow = ctx.createRadialGradient(width * 0.85, height, 0, width * 0.85, height, width * 0.35);
  sideGlow.addColorStop(0, themeBg.glowSide);
  sideGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = sideGlow;
  ctx.fillRect(0, 0, width, height);

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Tile outward from the canvas center so one motif always sits dead-center,
  // instead of the grid starting from the top-left corner.
  const centerX = width / 2;
  const centerY = height / 2;
  const halfCols = Math.ceil(width / 2 / cellSize) + 1;
  const halfRows = Math.ceil(height / 2 / cellSize) + 1;

  const drawStroke = (ox: number, oy: number, color: string, width: number, offset = 0) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    for (const c of cmds) {
      ctx.beginPath();
      if (c.type === 'poly') {
        c.points.forEach(([x, y], i) => {
          const px = ox + x + offset;
          const py = oy + y + offset;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.closePath();
      } else if (c.type === 'line') {
        ctx.moveTo(ox + c.x1 + offset, oy + c.y1 + offset);
        ctx.lineTo(ox + c.x2 + offset, oy + c.y2 + offset);
      } else {
        ctx.arc(ox + c.cx + offset, oy + c.cy + offset, c.r, 0, Math.PI * 2);
      }
      ctx.stroke();
    }
  };

  for (let row = -halfRows; row <= halfRows; row++) {
    for (let col = -halfCols; col <= halfCols; col++) {
      const ox = centerX + col * cellSize - cellSize / 2;
      const oy = centerY + row * cellSize - cellSize / 2;

      if (material.shadow) drawStroke(ox, oy, material.shadow, sw, sw * 0.6);
      ctx.globalAlpha = resolveOpacity(params);
      if (material.glow) {
        ctx.shadowColor = material.stroke;
        ctx.shadowBlur = sw * 1.5;
      }
      drawStroke(ox, oy, material.stroke, sw);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }
}
