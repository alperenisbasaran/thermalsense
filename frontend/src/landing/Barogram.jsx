import { useEffect, useRef, useState } from 'react';

// -----------------------------------------------------------------------------
// The labelling rule, drawn the way a pilot already reads a flight: altitude
// against time. Every stretch of the trace is one of three things to the model
// — a positive, a negative, or nothing — and the line style says which.
//
// Schematic, not a real flight. The slopes are still honest to each other: the
// climbs, glides and the weak stretch are drawn at the ratio of the vario
// figures printed beside them.
//
// Laid out in real pixels from the measured width rather than scaled through a
// viewBox: a scaled SVG shrinks its text with it, and at phone width a 12 px
// label would arrive as 4 px.
// -----------------------------------------------------------------------------

const ALT_MAX = 2500;   // m
const CEILING = 2200;   // thermal base (1,900 m here) + 300 m
const FLOOR   = 200;    // m AGL

// [time 0–100, altitude m]. kind: pos | neg | drop
const TRACE = [
  // On tow: climbing, but straight — neither label. Under 200 m it is dropped twice over.
  { kind: 'drop', from: [0, 0],        to: [7, 640] },
  { kind: 'neg',  from: [7, 640],      to: [13, 472] },
  { kind: 'pos',  from: [13, 472],     to: [29, 1672] },
  { kind: 'neg',  from: [29, 1672],    to: [43, 1280] },
  // Flying straight through weak lift: present, not thermalling, not sinking.
  { kind: 'drop', from: [43, 1280],    to: [56, 1397] },
  { kind: 'neg',  from: [56, 1397],    to: [66, 1117] },
  { kind: 'pos',  from: [66, 1117],    to: [80.44, 2200] },
  // Above thermal base + 300 m nothing counts, climbing or sinking.
  { kind: 'drop', from: [80.44, 2200], to: [82, 2317] },
  { kind: 'drop', from: [82, 2317],    to: [86.18, 2200] },
  { kind: 'neg',  from: [86.18, 2200], to: [100, 1813] },
];

function useWidth(ref) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

export default function Barogram({ t }) {
  const ref = useRef(null);
  const width = useWidth(ref);

  const roomy = width >= 560;
  const height = roomy ? 340 : 270;
  const m = { top: 26, right: 12, bottom: 30, left: roomy ? 54 : 44 };
  const x = (time) => m.left + (time / 100) * (width - m.left - m.right);
  const y = (alt)  => m.top + (1 - alt / ALT_MAX) * (height - m.top - m.bottom);
  const line = (s) => `M${x(s.from[0]).toFixed(1)},${y(s.from[1]).toFixed(1)} `
                    + `L${x(s.to[0]).toFixed(1)},${y(s.to[1]).toFixed(1)}`;

  return (
    <div className="baro" ref={ref}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={t('baroAlt')}>
          {/* Altitude gridlines and their figures */}
          {[0, 1000, 2000].map(alt => (
            <g key={alt}>
              <line className={alt === 0 ? 'baro-ground' : 'baro-grid'}
                    x1={m.left} x2={width - m.right} y1={y(alt)} y2={y(alt)} />
              <text className="baro-tick" x={m.left - 8} y={y(alt) + 4} textAnchor="end">
                {alt === 0 ? '0 m' : alt}
              </text>
            </g>
          ))}
          {/* From the left edge, not right-aligned to the axis: the word is wider
              than the gutter on a phone and would be clipped at the start. */}
          <text className="baro-axis" x={0} y={14}>{t('baroAxisAlt')}</text>
          <text className="baro-axis" x={width - m.right} y={height - 8} textAnchor="end">
            {t('baroAxisTime')} →
          </text>

          {/* The two altitudes outside which nothing is a sample */}
          <line className="baro-limit" x1={m.left} x2={width - m.right} y1={y(CEILING)} y2={y(CEILING)} />
          <text className="baro-limit-label" x={m.left + 6} y={y(CEILING) - 7}>{t('baroCeil')}</text>
          <line className="baro-limit" x1={m.left} x2={width - m.right} y1={y(FLOOR)} y2={y(FLOOR)} />
          <text className="baro-limit-label" x={width - m.right - 4} y={y(FLOOR) - 7} textAnchor="end">
            {t('baroFloor')}
          </text>

          {/* Dropped stretches first, so a labelled one always draws over a joint */}
          {TRACE.filter(s => s.kind === 'drop').map((s, i) => (
            <path key={`d${i}`} className="baro-seg baro-drop" d={line(s)} />
          ))}
          {TRACE.filter(s => s.kind !== 'drop').map((s, i) => (
            <path key={`l${i}`} className={`baro-seg baro-${s.kind}`} d={line(s)} />
          ))}

          {/* One figure per kind, beside the stretch it describes */}
          {roomy && (
            <>
              <text className="baro-vario pos" x={x(20) - 10} y={y(1010)} textAnchor="end">{t('baroClimb')}</text>
              <text className="baro-vario neg" x={x(36.5) + 8} y={y(1500) - 6}>{t('baroSink')}</text>
              <text className="baro-vario drop" x={x(49.5)} y={y(1340) - 14} textAnchor="middle">{t('baroWeak')}</text>
            </>
          )}
        </svg>
      )}
    </div>
  );
}
