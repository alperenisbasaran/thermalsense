// A table whose last column is drawn: one row per estimate, the point as a dot
// and its confidence interval as a whisker, all on one shared scale with the
// reference value ruled through every row.
//
// It is a table first. The numbers are in cells of their own, so the plot adds
// a picture to figures that are already readable, selectable and announced —
// rather than being the only place they exist.

export default function IntervalTable({
  caption, columns, rows, domain, reference, referenceLabel, ticks, locale, signed = false,
}) {
  const [min, max] = domain;
  const pct = (v) => `${(((v - min) / (max - min)) * 100).toFixed(2)}%`;

  const nf = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
    signDisplay: signed ? 'exceptZero' : 'auto',
  });
  const tick = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: signed ? 'exceptZero' : 'auto',
  });
  // A real minus sign: the hyphen Intl emits is half the width of the plus.
  const fmt  = (v) => nf.format(v).replace('-', '−');
  const fmtT = (v) => tick.format(v).replace('-', '−');
  // Turkish writes decimals with a comma, so the pair needs another separator.
  const sep = locale.startsWith('tr') ? '; ' : ', ';

  return (
    // Explicit roles: under 720 px the stylesheet turns these rows into grids,
    // and a table whose display is overridden is not reliably announced as one.
    <table className="iv" role="table">
      <caption className="sr-only">{caption}</caption>
      <thead role="rowgroup">
        <tr role="row">
          <th scope="col" role="columnheader" className="iv-h-label">{columns.label}</th>
          <th scope="col" role="columnheader" className="iv-h-num">{columns.value}</th>
          <th scope="col" role="columnheader" className="iv-h-num">{columns.interval}</th>
          <th scope="col" className="iv-h-track" aria-hidden="true">
            <span className="iv-axis">
              {ticks.map(v => (
                <span key={v} className={`iv-tick${v === reference ? ' ref' : ''}`} style={{ left: pct(v) }}>
                  {v === reference ? `${referenceLabel} ${fmtT(v)}` : fmtT(v)}
                </span>
              ))}
            </span>
          </th>
        </tr>
      </thead>
      <tbody role="rowgroup">
        {rows.map(row => (
          <tr key={row.label} role="row" className={row.emphasis ? 'iv-emph' : undefined}>
            <th scope="row" role="rowheader" className="iv-label">{row.label}</th>
            <td role="cell" className="iv-num iv-value">{fmt(row.value)}</td>
            <td role="cell" className="iv-num iv-ci">[{fmt(row.lo)}{sep}{fmt(row.hi)}]</td>
            <td className="iv-track" aria-hidden="true">
              <span className="iv-plot">
                <span className="iv-ref" style={{ left: pct(reference) }} />
                <span className="iv-whisker" style={{ left: pct(row.lo), right: `calc(100% - ${pct(row.hi)})` }} />
                <span className="iv-dot" style={{ left: pct(row.value) }} />
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
