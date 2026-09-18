export interface CrearProductoDto {
  sku: string;
  nombre: string;
  descripcion?: string;
  categoria?: string;
  etiquetas?: string[];
  imagenUrl?: string;
}

export interface EditarProductoDto {
  nombre?: string;
  descripcion?: string;
  categoria?: string;
  etiquetas?: string[];
  imagenUrl?: string;
  estado?: 'ACTIVO' | 'INACTIVO';
}

export interface CrearRutaDto {
  puntoEntregaId: number;
  horaCutoff: string; // 'HH:MM'
  diasAnticipacion?: number;
  horaEntregaEst: string;
  cupoMaxDia?: number;
}

export interface CrearPlantillaDto {
  nombre: string;
  semanaTipo: 1 | 2;
}

export interface ItemPlantillaDto {
  diaSemana: number; // 1-5
  productoId: number;
  precio: number;
  cupo?: number;
}

export interface PublicarMenuDto {
  dias?: number; // cuántos días hábiles hacia adelante, default 10
}

export interface EditarItemMenuDto {
  precio?: number;
  cupo?: number;
  activo?: boolean;
}

// ---------- Sprint 17: relación comercial suplidor-empresa ----------

export interface SolicitarContratoDto {
  rnc: string;
  ajustePctPropuesto?: number;
}

export interface CrearLeadDto {
  nombrePropuesto: string;
  rncPropuesto?: string;
  contacto?: string;
  mensaje?: string;
}
