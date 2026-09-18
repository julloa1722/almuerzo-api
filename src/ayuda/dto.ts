export type RolAyuda =
  | 'TODOS'
  | 'SUPERADMIN'
  | 'SOPORTE'
  | 'ADMIN_EMPRESA'
  | 'RRHH'
  | 'COLABORADOR'
  | 'SUPLIDOR_ADMIN'
  | 'DESPACHO';

export interface CrearAyudaDto {
  titulo: string;
  cuerpo: string;
  rolObjetivo: RolAyuda;
  pantallaId: string;
  orden?: number;
}

export interface EditarAyudaDto {
  titulo?: string;
  cuerpo?: string;
  rolObjetivo?: RolAyuda;
  pantallaId?: string;
  orden?: number;
}
