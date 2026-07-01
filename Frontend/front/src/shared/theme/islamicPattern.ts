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
  ornament: number;   // 0-100
  lineWeight: number; // 0-100
  border: number;     // 0-100
  opacity: number;    // 0-100 — user-controlled transparency
  seed: string;
}

export const DEFAULT_PATTERN_PARAMS: PatternParams = {
  material: 'limestone',
  geometry: 8,
  complexity: 55,
  density: 50,
  spacing: 15,
  ornament: 60,
  lineWeight: 45,
  border: 45,
  opacity: 55,
  seed: 'RUWHG7',
};

/** Final stroke alpha: the user's slider scaled by the material's baseline weight. */
export function resolveOpacity(params: PatternParams): number {
  const intensity = MATERIAL_DEFS[params.material].intensity;
  return Math.min(0.95, Math.max(0.03, (params.opacity / 100) * intensity));
}

// ── Seeded PRNG (mulberry32) ──
function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function makeRng(seed: string): () => number {
  let a = hashSeed(seed) || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
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
  rng: () => number,
  cellSize: number,
  motifSize: number = cellSize,
): DrawCmd[] {
  const { geometry, complexity, ornament, border } = params;
  const cmds: DrawCmd[] = [];
  const cx = cellSize / 2;
  const cy = cellSize / 2;
  const outerR = motifSize * 0.46;

  const layers = 1 + Math.round((complexity / 100) * 3); // 1..4 overlapping star layers
  const innerRatio = 0.34 + (complexity / 100) * 0.24; // fuller stars as complexity rises
  const step = Math.PI / geometry;

  for (let l = 0; l < layers; l++) {
    const jitter = (rng() - 0.5) * 0.06 * (ornament / 100);
    cmds.push({
      type: 'poly',
      points: starPoints(cx, cy, outerR, outerR * innerRatio, geometry, l * step + jitter),
    });
  }

  // Center medallion
  cmds.push({ type: 'circle', cx, cy, r: motifSize * (0.03 + 0.02 * (ornament / 100)) });

  // Ornament: strapwork lines linking star tips to the tile's neighbors,
  // classic Islamic lattice connectors. Probability scales with `ornament`.
  if (ornament > 15) {
    const tips = starPoints(cx, cy, outerR, outerR, geometry, 0);
    const linkChance = ornament / 100;
    for (let i = 0; i < tips.length; i += 2) {
      if (rng() < linkChance) {
        const [x, y] = tips[i];
        const dx = x - cx;
        const dy = y - cy;
        cmds.push({ type: 'line', x1: x, y1: y, x2: x + dx * 0.35, y2: y + dy * 0.35 });
      }
    }
  }

  // Border frame around the motif footprint (spacing gutter stays empty)
  if (border > 10) {
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
  const rng = makeRng(params.seed);
  const cmds = buildTileCommands(params, rng, cellSize, motifSize);
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

// ── Canvas renderer (studio preview + PNG export) ──
export function paintPatternCanvas(
  ctx: CanvasRenderingContext2D,
  params: PatternParams,
  width: number,
  height: number,
): void {
  const material = MATERIAL_DEFS[params.material];
  const motifSize = patternMotifSize(params.density);
  const cellSize = patternCellSize(params);
  const sw = lineWeightPx(params.lineWeight) * (motifSize / 64);

  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, material.bgFrom);
  bgGrad.addColorStop(1, material.bgTo);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Tile outward from the canvas center so one motif always sits dead-center,
  // instead of the grid starting from the top-left corner.
  const centerX = width / 2;
  const centerY = height / 2;
  const halfCols = Math.ceil(width / 2 / cellSize) + 1;
  const halfRows = Math.ceil(height / 2 / cellSize) + 1;

  for (let row = -halfRows; row <= halfRows; row++) {
    for (let col = -halfCols; col <= halfCols; col++) {
      const ox = centerX + col * cellSize - cellSize / 2;
      const oy = centerY + row * cellSize - cellSize / 2;
      const tileSeed = `${params.seed}:${col}:${row}`;
      const rng = makeRng(tileSeed);
      const cmds = buildTileCommands(params, rng, cellSize, motifSize);

      const drawStroke = (color: string, width: number, offset = 0) => {
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

      if (material.shadow) drawStroke(material.shadow, sw, sw * 0.6);
      ctx.globalAlpha = resolveOpacity(params);
      if (material.glow) {
        ctx.shadowColor = material.stroke;
        ctx.shadowBlur = sw * 1.5;
      }
      drawStroke(material.stroke, sw);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }
}
