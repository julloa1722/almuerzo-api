import { CampoPlantilla } from './campos-reporte';

export interface CerrarCicloDto {
  periodoInicio?: string; // YYYY-MM-DD; si falta, usa el período vigente hoy
  periodoFin?: string;
}

export type TipoMovimientoManual = 'CARGO' | 'NOTA_CREDITO';

export interface AjusteMovimientoDto {
  colaboradorId: number;
  tipo: TipoMovimientoManual;
  monto: number;
  motivo: string;
}

export interface ActualizarPlantillaDto {
  campos: CampoPlantilla[];
}

export type TipoSubsidio = 'MONTO_FIJO' | 'PORCENTAJE' | 'TOTAL';

export interface CrearProgramaDto {
  nombre: string;
  tipoSubsidio: TipoSubsidio;
  valorSubsidio: number;
  topeDiarioSubsidio?: number;
  topeCicloColaborador?: number;
  permiteExcedente?: boolean;
  diasSemana?: number[];
  pctMaxSalario?: number;
}

export interface EditarProgramaDto {
  nombre?: string;
  tipoSubsidio?: TipoSubsidio;
  valorSubsidio?: number;
  topeDiarioSubsidio?: number;
  topeCicloColaborador?: number;
  permiteExcedente?: boolean;
  diasSemana?: number[];
  pctMaxSalario?: number;
  estado?: 'ACTIVO' | 'INACTIVO';
}

export interface CrearAsignacionDto {
  colaboradorId: number;
  vigenteDesde: string; // YYYY-MM-DD
  vigenteHasta?: string;
}

export interface FinalizarAsignacionDto {
  vigenteHasta: string; // YYYY-MM-DD
}
