/**
 * Puerto directo de la lógica de calendario validada en portal-suplidor-menu.html.
 * Funciones puras a propósito — sin acceso a base de datos — para poder
 * probarlas con datos fijos, sin necesitar Postgres para cada caso.
 */

export function iso(d: Date): string {
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

export function fechaDe(s: string): Date {
  const [a, m, d] = s.split('-').map(Number);
  return new Date(a, m - 1, d);
}

/** Lunes a viernes, y no feriado. Fines de semana no son día hábil sin excepción. */
export function esHabil(d: Date, feriados: Set<string>): boolean {
  const dia = d.getDay();
  return dia >= 1 && dia <= 5 && !feriados.has(iso(d));
}

function hm(s: string): { h: number; m: number } {
  const [h, m] = s.split(':').map(Number);
  return { h, m };
}

/**
 * Cutoff de una fecha: retrocede `diasAnticipacion` días HÁBILES desde la
 * fecha de servicio (saltando fines de semana y feriados), y fija la hora.
 * Con diasAnticipacion=0, el cutoff del lunes es el lunes mismo.
 */
export function cutoffDe(
  fechaISO: string,
  horaCutoff: string,
  diasAnticipacion: number,
  feriados: Set<string>,
): Date {
  const d = fechaDe(fechaISO);
  let n = diasAnticipacion;
  while (n > 0) {
    d.setDate(d.getDate() - 1);
    if (esHabil(d, feriados)) n--;
  }
  const { h, m } = hm(horaCutoff);
  d.setHours(h, m, 0, 0);
  return d;
}

/** Número de semana ISO-8601 (lunes como inicio de semana). */
export function numSemanaISO(d: Date): number {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
  const w1 = new Date(t.getFullYear(), 0, 4);
  return 1 + Math.round(((t.getTime() - w1.getTime()) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7);
}

/** Semanas pares e impares alternan la rotación — no hace falta que nadie la recuerde. */
export function semanaTipoDe(fechaISO: string): 1 | 2 {
  return numSemanaISO(fechaDe(fechaISO)) % 2 === 0 ? 2 : 1;
}

/** Los próximos `n` días hábiles a partir de `desde` (inclusive), como ISO strings. */
export function proximosHabiles(desde: Date, n: number, feriados: Set<string>): string[] {
  const out: string[] = [];
  const d = new Date(desde);
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i < n * 3 && out.length < n; i++) {
    if (esHabil(d, feriados)) out.push(iso(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/**
 * Rango [inicio, fin] del período de nómina que contiene `fecha`, según la
 * frecuencia de la empresa. Quincenal: 1–15 / 16–fin de mes. Mensual: mes completo.
 * Usado en el Sprint 4 para calcular el consumo del colaborador sin todavía
 * tener el libro mayor formal (Sprint 6) — ver decisión de secuencia en plan-sprints.md.
 */
/**
 * Ventana de silencio (Sprint 5): a diferencia del cutoff de pedidos, es
 * aritmética simple sobre timestamp, no días hábiles — `horasVentana` horas
 * corridas desde que se marcó ENTREGADO.
 */
export function ventanaSilencioVencida(entregadoEn: Date, horasVentana: number, ahora: Date = new Date()): boolean {
  return ahora.getTime() >= entregadoEn.getTime() + horasVentana * 3_600_000;
}

export function ventanaSilencioVenceEn(entregadoEn: Date, horasVentana: number): Date {
  return new Date(entregadoEn.getTime() + horasVentana * 3_600_000);
}

export function periodoDe(fecha: Date, frecuencia: 'QUINCENAL' | 'MENSUAL'): { inicio: string; fin: string } {
  const y = fecha.getFullYear();
  const m = fecha.getMonth();
  const dia = fecha.getDate();
  const ultimoDelMes = new Date(y, m + 1, 0).getDate();

  if (frecuencia === 'MENSUAL') {
    return { inicio: iso(new Date(y, m, 1)), fin: iso(new Date(y, m, ultimoDelMes)) };
  }
  if (dia <= 15) {
    return { inicio: iso(new Date(y, m, 1)), fin: iso(new Date(y, m, 15)) };
  }
  return { inicio: iso(new Date(y, m, 16)), fin: iso(new Date(y, m, ultimoDelMes)) };
}
