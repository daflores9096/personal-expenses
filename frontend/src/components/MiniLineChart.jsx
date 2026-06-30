/**
 * Mini gráfico de línea en SVG (sin dependencias externas).
 * points: array de números (valores por día).
 */
export default function MiniLineChart({ points = [], labelInicio, labelFin }) {
  const width = 600;
  const height = 130;
  const padX = 8;
  const padY = 12;

  if (!points.length) {
    return <p className="muted">Sin datos en el período.</p>;
  }

  const max = Math.max(...points, 1);
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;

  const coords = points.map((v, i) => {
    const x = padX + i * stepX;
    const y = padY + innerH - (v / max) * innerH;
    return [x, y];
  });

  const linePath = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'}${c[0].toFixed(1)} ${c[1].toFixed(1)}`)
    .join(' ');

  const areaPath =
    `M${coords[0][0].toFixed(1)} ${(height - padY).toFixed(1)} ` +
    coords.map((c) => `L${c[0].toFixed(1)} ${c[1].toFixed(1)}`).join(' ') +
    ` L${coords[coords.length - 1][0].toFixed(1)} ${(height - padY).toFixed(1)} Z`;

  return (
    <div className="chart-wrap">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="130"
        preserveAspectRatio="none"
        role="img"
        aria-label="Tendencia de gasto"
      >
        <path d={areaPath} fill="rgba(34,197,94,0.15)" />
        <path d={linePath} fill="none" stroke="#22c55e" strokeWidth="2" />
        {coords.map((c, i) => (
          <circle key={i} cx={c[0]} cy={c[1]} r="2.5" fill="#22c55e" />
        ))}
      </svg>
      {(labelInicio || labelFin) && (
        <div className="chart-eje">
          <span>{labelInicio}</span>
          <span>{labelFin}</span>
        </div>
      )}
    </div>
  );
}
