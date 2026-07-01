import { createContext, useContext, useState } from 'react';
import { calcularFechasPeriodo, inicioMesISO, hoyISO } from './utils.js';

const PeriodoContext = createContext(null);

export function PeriodoProvider({ children }) {
  const inicial = calcularFechasPeriodo('mes-actual');
  const [periodo, setPeriodo] = useState('mes-actual');
  const [desde, setDesde] = useState(inicial.desde);
  const [hasta, setHasta] = useState(inicial.hasta);

  const aplicarPeriodo = (value) => {
    setPeriodo(value);
    if (value === 'rango') return;
    const { desde: d, hasta: h } = calcularFechasPeriodo(value);
    setDesde(d);
    setHasta(h);
  };

  return (
    <PeriodoContext.Provider
      value={{ periodo, desde, hasta, setDesde, setHasta, aplicarPeriodo }}
    >
      {children}
    </PeriodoContext.Provider>
  );
}

export function usePeriodo() {
  const ctx = useContext(PeriodoContext);
  if (!ctx) throw new Error('usePeriodo debe usarse dentro de PeriodoProvider');
  return ctx;
}
