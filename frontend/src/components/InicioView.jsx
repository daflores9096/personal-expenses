import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import {
  enRango,
  formatFecha,
  formatMoney,
  hoyISO,
  inicioMesISO,
  parseISO,
  toISO,
} from '../utils.js';
import MiniLineChart from './MiniLineChart.jsx';

export default function InicioView() {
  const [gastos, setGastos] = useState([]);
  const [ingresos, setIngresos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [periodo, setPeriodo] = useState('mes-actual');
  const [desde, setDesde] = useState(inicioMesISO());
  const [hasta, setHasta] = useState(hoyISO());

  const aplicarPeriodo = (value) => {
    setPeriodo(value);
    if (value === 'rango') return;
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    if (value === 'mes-actual') {
      setDesde(toISO(new Date(y, m, 1)));
      setHasta(hoyISO());
    } else if (value === 'mes-anterior') {
      setDesde(toISO(new Date(y, m - 1, 1)));
      setHasta(toISO(new Date(y, m, 0)));
    } else if (value === 'ultimos-3-meses') {
      setDesde(toISO(new Date(y, m - 2, 1)));
      setHasta(hoyISO());
    }
  };

  useEffect(() => {
    (async () => {
      try {
        setCargando(true);
        const [g, i] = await Promise.all([api.listarGastos(), api.listarIngresos()]);
        setGastos(g);
        setIngresos(i);
        setError(null);
      } catch (e) {
        setError(e.message);
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  const gastosPeriodo = useMemo(
    () => gastos.filter((g) => enRango(g.fecha, desde, hasta)),
    [gastos, desde, hasta]
  );

  const ingresosPeriodo = useMemo(
    () => ingresos.filter((i) => enRango(i.fecha, desde, hasta)),
    [ingresos, desde, hasta]
  );

  const totalGastosPeriodo = useMemo(
    () => gastosPeriodo.reduce((acc, g) => acc + Number(g.monto), 0),
    [gastosPeriodo]
  );

  const totalIngresosPeriodo = useMemo(
    () => ingresosPeriodo.reduce((acc, i) => acc + Number(i.monto), 0),
    [ingresosPeriodo]
  );

  const saldoPeriodo = totalIngresosPeriodo - totalGastosPeriodo;

  const hoy = hoyISO();
  const hoyEnPeriodo = enRango(hoy, desde, hasta);
  const totalHoy = useMemo(
    () =>
      hoyEnPeriodo
        ? gastos.filter((g) => g.fecha === hoy).reduce((acc, g) => acc + Number(g.monto), 0)
        : 0,
    [gastos, hoy, hoyEnPeriodo]
  );

  const porCategoria = useMemo(() => {
    const mapa = new Map();
    for (const g of gastosPeriodo) {
      const nombre = g.categoria_nombre || 'Sin categoría';
      mapa.set(nombre, (mapa.get(nombre) || 0) + Number(g.monto));
    }
    return [...mapa.entries()]
      .map(([nombre, monto]) => ({ nombre, monto }))
      .sort((a, b) => b.monto - a.monto);
  }, [gastosPeriodo]);

  const maxCategoria = porCategoria.length ? porCategoria[0].monto : 0;

  const ultimos5 = useMemo(
    () =>
      [...gastosPeriodo]
        .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : b.id - a.id))
        .slice(0, 5),
    [gastosPeriodo]
  );

  // Serie diaria continua entre desde y hasta (rellena días sin gasto con 0).
  const tendencia = useMemo(() => {
    if (!desde || !hasta || desde > hasta) return { puntos: [] };
    const totalesPorDia = new Map();
    for (const g of gastosPeriodo) {
      totalesPorDia.set(g.fecha, (totalesPorDia.get(g.fecha) || 0) + Number(g.monto));
    }
    const puntos = [];
    const d = parseISO(desde);
    const fin = parseISO(hasta);
    let guard = 0;
    while (d <= fin && guard < 400) {
      const iso = toISO(d);
      puntos.push(totalesPorDia.get(iso) || 0);
      d.setDate(d.getDate() + 1);
      guard += 1;
    }
    return { puntos };
  }, [gastosPeriodo, desde, hasta]);

  if (cargando) {
    return <p className="muted">Cargando…</p>;
  }

  return (
    <section>
      {error && <div className="alert error">{error}</div>}

      <div className="dash-filtro card">
        <label>
          Período
          <select value={periodo} onChange={(e) => aplicarPeriodo(e.target.value)}>
            <option value="mes-actual">Mes actual</option>
            <option value="mes-anterior">Mes anterior</option>
            <option value="ultimos-3-meses">Últimos 3 meses</option>
            <option value="rango">Rango de fechas</option>
          </select>
        </label>
        {periodo === 'rango' && (
          <>
            <label>
              Desde
              <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </label>
            <label>
              Hasta
              <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </label>
          </>
        )}
      </div>

      <div className="dash-grid">
        <div className="card dash-card">
          <h3 className="dash-card-titulo">📊 Gasto por categoría</h3>
          {porCategoria.length === 0 ? (
            <p className="muted">Sin gastos en el período.</p>
          ) : (
            <div className="cat-lista">
              {porCategoria.map((c) => (
                <div className="cat-fila" key={c.nombre}>
                  <div className="cat-top">
                    <span>{c.nombre}</span>
                    <strong>{formatMoney(c.monto)}</strong>
                  </div>
                  <div className="cat-barra">
                    <div
                      className="cat-barra-fill"
                      style={{ width: `${maxCategoria ? (c.monto / maxCategoria) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card dash-card">
          <h3 className="dash-card-titulo">🧾 Últimos 5 gastos</h3>
          {ultimos5.length === 0 ? (
            <p className="muted">Sin gastos en el período.</p>
          ) : (
            <ul className="ultimos-lista">
              {ultimos5.map((g) => (
                <li key={g.id}>
                  <div className="ultimos-info">
                    <span className="ultimos-titulo">{g.titulo}</span>
                    <span className="ultimos-meta">
                      {formatFecha(g.fecha)} · {g.categoria_nombre}
                    </span>
                  </div>
                  <span className="ultimos-monto">{formatMoney(g.monto)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card dash-card">
          <h3 className="dash-card-titulo">📈 Tendencia de gasto</h3>
          <MiniLineChart
            points={tendencia.puntos}
            labelInicio={desde ? formatFecha(desde) : ''}
            labelFin={hasta ? formatFecha(hasta) : ''}
          />
        </div>

        <div className="card dash-card dash-destacada">
          <h3 className="dash-card-titulo">📅 Total gastos del período</h3>
          <div className="dash-numero amber">{formatMoney(totalGastosPeriodo)}</div>
          <p className="muted">Suma de gastos registrados en el período seleccionado.</p>
          {hoyEnPeriodo && (
            <p className="muted">
              Hoy: <strong>{formatMoney(totalHoy)}</strong>
            </p>
          )}
        </div>

        <div className="card dash-card">
          <h3 className="dash-card-titulo">🐷 Ingresos del período</h3>
          <div className="dash-numero">{formatMoney(totalIngresosPeriodo)}</div>
          <p className="muted">Suma de ingresos registrados en el período seleccionado.</p>
        </div>

        <div className="card dash-card dash-saldo">
          <h3 className="dash-card-titulo">💰 Saldo del período</h3>
          <div className={`dash-numero ${saldoPeriodo >= 0 ? 'green' : 'red'}`}>
            {formatMoney(saldoPeriodo)}
          </div>
          <p className="muted">
            Ingresos: {formatMoney(totalIngresosPeriodo)} · Gastos:{' '}
            {formatMoney(totalGastosPeriodo)}
          </p>
        </div>
      </div>
    </section>
  );
}
