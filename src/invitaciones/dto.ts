export type RolInvitacion =
  | 'SUPERADMIN'
  | 'SOPORTE'
  | 'ADMIN_EMPRESA'
  | 'RRHH'
  | 'COLABORADOR'
  | 'SUPLIDOR_ADMIN'
  | 'DESPACHO';

export interface CrearInvitacionDto {
  email: string;
  rol: RolInvitacion;
  /** Solo lo usa plataforma — RRHH/suplidor invitan siempre dentro de su propio ámbito. */
  ambitoTipo?: 'PLATAFORMA' | 'EMPRESA' | 'SUPLIDOR';
  ambitoId?: number;
  /** Requerido si rol = 'COLABORADOR': el colaborador ya importado que se vincula. */
  colaboradorId?: number;
}

export interface AceptarInvitacionDto {
  password: string;
}

export interface InvitarMasivoDto {
  /** Si falta, invita a todos los colaboradores activos sin cuenta que tengan email. */
  colaboradorIds?: number[];
}
