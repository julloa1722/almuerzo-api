export interface ProgramaBeneficio {
  tipoSubsidio: 'MONTO_FIJO' | 'PORCENTAJE' | 'TOTAL';
  valorSubsidio: number;
  topeDiarioSubsidio: number | null;
  topeCicloColaborador: number | null;
  permiteExcedente: boolean;
  pctMaxSalario: number;
}

export interface DesgloseSubsidio {
  bruto: number;
  subsidio: number;
  montoColaborador: number;
  restanteDiaAntes: number;
}

/**
 * Puerto directo de la fórmula de la sección 3.3 del documento de diseño:
 *   subsidio_bruto según tipo → min(subsidio_bruto, bruto, tope_diario_restante)
 * Redondeo a 2 decimales para evitar arrastre de flotantes en dinero.
 */
export function calcularSubsidio(
  programa: ProgramaBeneficio,
  bruto: number,
  subsidioUsadoDiaPrevio: number,
): DesgloseSubsidio {
  let subsidioBruto = 0;
  if (programa.tipoSubsidio === 'MONTO_FIJO') subsidioBruto = programa.valorSubsidio;
  if (programa.tipoSubsidio === 'PORCENTAJE') subsidioBruto = (bruto * programa.valorSubsidio) / 100;
  if (programa.tipoSubsidio === 'TOTAL') subsidioBruto = bruto;

  const topeDiario = programa.topeDiarioSubsidio ?? Infinity;
  const restanteDiaAntes = Math.max(0, topeDiario - subsidioUsadoDiaPrevio);

  const subsidio = Math.round(Math.min(subsidioBruto, bruto, restanteDiaAntes) * 100) / 100;
  const montoColaborador = Math.round((bruto - subsidio) * 100) / 100;

  return { bruto, subsidio, montoColaborador, restanteDiaAntes };
}

/**
 * Ajuste de precio del contrato empresa↔suplidor (Sprint 7, `ajuste_pct` de
 * `contrato_suplidor`). Negativo = descuento por volumen que el suplidor le
 * dio a esa empresa; el colaborador paga ese % de menos (o de más) sobre el
 * precio publicado. Redondeo a 2 decimales, mismo criterio que calcularSubsidio.
 */
export function aplicarAjustePct(precioBase: number, ajustePct: number): number {
  return Math.round(precioBase * (1 + ajustePct / 100) * 100) / 100;
}

export function generarCodigoRetiro(): string {
  return 'R' + Math.random().toString(36).slice(2, 7).toUpperCase();
}
