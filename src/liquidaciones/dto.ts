export interface CalcularLiquidacionDto {
  suplidorId: number;
  periodoInicio?: string; // YYYY-MM-DD; si falta, usa el período vigente hoy según frecuencia_liquidacion
  periodoFin?: string;
}

export interface MarcarPagadoDto {
  referenciaPago: string;
}
