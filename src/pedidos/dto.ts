export interface LineaPedidoDto {
  menuDiaId: number;
  cantidad: number;
}

export interface CrearPedidoDto {
  fecha: string; // ISO, YYYY-MM-DD
  suplidorId: number;
  lineas: LineaPedidoDto[];
}

export interface EntregarPedidoDto {
  codigoRetiro: string;
}

export interface NoEntregadoDto {
  nota?: string;
}

export type MotivoDisputa = 'NO_LLEGO' | 'INCOMPLETO' | 'EQUIVOCADO' | 'CALIDAD' | 'OTRO';

export interface DisputarPedidoDto {
  motivo: MotivoDisputa;
  nota?: string;
}

export interface ResolverDisputaDto {
  aFavorColaborador: boolean;
  nota?: string;
}
