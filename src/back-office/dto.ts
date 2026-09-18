export interface CrearEmpresaDto {
  rnc: string;
  nombre: string;
  frecuenciaNomina?: 'QUINCENAL' | 'MENSUAL';
}

export interface ImportarColaboradoresDto {
  csv?: string; // opción B: contenido CSV como texto plano en el body
}

export interface CrearContratoDto {
  suplidorId: number;
  ajustePct?: number;
}

export interface EditarContratoDto {
  ajustePct?: number;
  estado?: 'ACTIVA' | 'INACTIVA';
}

export interface ConvertirLeadDto {
  empresaId: number;
}

export interface EditarConfiguracionDto {
  tasaComisionPct: number;
}
