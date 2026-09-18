export interface Membresia {
  membresiaId: number;
  ambitoTipo: 'EMPRESA' | 'SUPLIDOR' | 'PLATAFORMA';
  ambitoId: number | null;
  rol: string;
  nombre: string | null;
}

export interface LoginResponse {
  accessToken: string;
  membresias: Membresia[];
}

export interface Ambito {
  tipo: 'EMPRESA' | 'SUPLIDOR' | 'PLATAFORMA';
  id: number | null;
  rol: string;
}

export interface AmbitoResponse {
  accessToken: string;
  ambito: Ambito;
}

export interface MenuDisponibleItem {
  suplidorId: number;
  suplidorNombre: string;
  menuDiaId: number;
  productoNombre: string;
  descripcion: string | null;
  categoria: string | null;
  etiquetas: string[];
  precio: number;
  cupoDisponible: number | null;
  cutoff: string;
  disponible: boolean;
}

export interface MenuDisponibleResponse {
  desde: string;
  hasta: string;
  menu: Record<string, MenuDisponibleItem[]>;
}

export type EstadoPedido =
  | 'CONFIRMADO'
  | 'EN_PREPARACION'
  | 'ENTREGADO'
  | 'RECIBIDO'
  | 'DISPUTA'
  | 'NO_ENTREGADO'
  | 'CANCELADO';

export interface PedidoCreado {
  id: number;
  estado: EstadoPedido;
  codigo_retiro: string;
  total_bruto: string;
  subsidio_empresa: string;
  monto_colaborador: string;
  fecha_servicio: string;
  lineas: { menuDiaId: number; cantidad: number; precio: number; subtotal: number }[];
}

export interface PedidoMio {
  id: number;
  fecha_servicio: string;
  estado: EstadoPedido;
  codigo_retiro: string;
  total_bruto: string;
  subsidio_empresa: string;
  monto_colaborador: string;
  entregado_en: string | null;
  motivo_disputa: string | null;
  suplidor_nombre: string;
  horas_ventana_confirmacion: number | null;
  puedeConfirmar: boolean;
  ventanaConfirmacionVenceEn: string | null;
}

export type MotivoDisputa = 'NO_LLEGO' | 'INCOMPLETO' | 'EQUIVOCADO' | 'CALIDAD' | 'OTRO';

export interface ConsumoCiclo {
  periodoInicio: string;
  periodoFin: string;
  consumo: number;
  topeCicloColaborador: number | null;
  limiteSalario: number | null;
  topeEfectivo: number | null;
}

// ---------- Sprint 11: portal del suplidor ----------

export interface Producto {
  id: number;
  sku: string;
  nombre: string;
  descripcion: string | null;
  categoria: string | null;
  etiquetas: string[];
  imagen_url: string | null;
  estado: 'ACTIVO' | 'INACTIVO';
}

export interface Ruta {
  id: number;
  punto_entrega_id: number;
  punto_nombre: string;
  hora_cutoff: string;
  dias_anticipacion: number;
  hora_entrega_est: string;
  cupo_max_dia: number | null;
  estado: 'ACTIVA' | 'INACTIVA';
}

export interface ItemPlantilla {
  id: number;
  dia_semana: number;
  producto_id: number;
  producto_nombre: string;
  precio: string;
  cupo: number | null;
}

export interface Plantilla {
  id: number;
  nombre: string;
  semana_tipo: 1 | 2;
  estado: 'ACTIVA' | 'INACTIVA';
  items: ItemPlantilla[];
}

export type EstadoMenuDia = 'PUBLICADO' | 'CONGELADO';

export interface ItemMenuDia {
  id: number;
  producto_id: number;
  producto_nombre: string;
  fecha: string;
  precio: string;
  cupo_max: number | null;
  cupo_usado: number;
  activo: boolean;
}

export interface MenuCalendarioResponse {
  menu: Record<string, { estado: EstadoMenuDia; items: ItemMenuDia[] }>;
}

export interface PedidoPreparacion {
  id: number;
  estado: EstadoPedido;
  colaborador: string;
  punto_entrega: string | null;
  lineas: { producto_nombre: string; cantidad: number }[];
}

export interface PreparacionResponse {
  fecha: string;
  consolidado: Record<string, number>;
  porPuntoEntrega: Record<string, PedidoPreparacion[]>;
}

// ---------- Sprint 12: panel de RRHH ----------

export interface PedidoEmpresa {
  id: number;
  fecha_servicio: string;
  estado: EstadoPedido;
  colaborador: string;
  suplidor_nombre: string;
  total_bruto: string;
  subsidio_empresa: string;
  monto_colaborador: string;
}

export interface Disputa {
  id: number;
  fecha_servicio: string;
  colaborador: string;
  suplidor_nombre: string;
  total_bruto: string;
  motivo_disputa: MotivoDisputa;
  nota_disputa: string | null;
  disputado_en: string;
}

export interface Ciclo {
  id: number;
  periodo_inicio: string;
  periodo_fin: string;
  estado: 'ABIERTO' | 'CERRADO';
  cerrado_en: string | null;
}

export interface Movimiento {
  id: number;
  creado_en: string;
  tipo: 'CARGO' | 'NOTA_CREDITO';
  monto: string;
  motivo: string | null;
  pedido_id: number | null;
  ciclo_nomina_id: number;
  colaborador: string;
}

export interface CampoPlantilla {
  campo: string;
  etiqueta?: string;
}

export interface CampoDisponible {
  clave: string;
  etiquetaDefault: string;
}

export interface Programa {
  id: number;
  tipo: string;
  nombre: string;
  tipo_subsidio: 'MONTO_FIJO' | 'PORCENTAJE' | 'TOTAL';
  valor_subsidio: string;
  tope_diario_subsidio: string | null;
  tope_ciclo_colaborador: string | null;
  permite_excedente: boolean;
  dias_semana: number[];
  pct_max_salario: string;
  estado: 'ACTIVO' | 'INACTIVO';
}

export interface Asignacion {
  id: number;
  colaborador_id: number;
  colaborador: string;
  vigente_desde: string;
  vigente_hasta: string | null;
}

export interface Colaborador {
  id: number;
  codigo_nomina: string;
  nombre_completo: string;
  estado: string;
  usuario_id: number | null;
  email: string | null;
}

export interface Invitacion {
  id: number;
  email: string;
  rol: string;
  ambito_tipo: string;
  ambito_id: number | null;
  estado: 'PENDIENTE' | 'ACEPTADA' | 'REVOCADA';
  creado_en: string;
  expira_en: string;
}

// ---------- Sprint 13: panel de back office ----------

export interface Empresa {
  id: number;
  rnc: string;
  nombre: string;
  frecuencia_nomina: 'QUINCENAL' | 'MENSUAL';
  estado: string;
  colaboradores: number;
  suplidores_activos: number;
}

export interface SuplidorBO {
  id: number;
  nombre: string;
  rnc: string;
  estado: string;
}

export interface Contrato {
  id: number;
  suplidor_id: number;
  suplidor_nombre: string;
  suplidor_rnc: string;
  ajuste_pct: string;
  estado: 'ACTIVA' | 'INACTIVA';
}

export interface FilaColaborador {
  numeroFila: number;
  datos: {
    codigo_nomina?: string;
    cedula?: string;
    nombre_completo?: string;
    email?: string;
    punto_entrega?: string;
    salario_neto?: string;
  };
  errores: string[];
  alertas: string[];
}

export interface PreviewCsvResponse {
  totalFilas: number;
  limpias: number;
  conAlerta: number;
  conError: number;
  importables: number;
  filas: FilaColaborador[];
}

export interface ImportarCsvResponse extends PreviewCsvResponse {
  importados: number;
}

// ---------- Sprint 19: resumen por rol ----------

export interface ResumenRrhh {
  disputasPendientes: number;
  colaboradoresActivos: number;
  colaboradoresSinPrograma: number;
  periodoActual: { inicio: string; fin: string };
  cicloActual: {
    id: number;
    periodo_inicio: string;
    periodo_fin: string;
    estado: 'ABIERTO' | 'CERRADO';
    movimientos: number;
    total: string;
  } | null;
}

export interface ResumenSuplidor {
  pedidosHoy: { estado: EstadoPedido; cantidad: number }[];
  coberturaMenu: { diasPublicados: number; diasTotal: number };
  contratosActivos: number;
  ultimaLiquidacion: {
    id: number;
    periodo_inicio: string;
    periodo_fin: string;
    estado: 'CALCULADO' | 'PAGADO';
    monto_total: string;
  } | null;
}

// ---------- Sprint 17: relación comercial suplidor-empresa ----------

export type EstadoContrato = 'ACTIVA' | 'INACTIVA' | 'PENDIENTE' | 'RECHAZADA';

export interface ContratoSuplidor {
  id: number;
  empresa_id: number;
  empresa_nombre: string;
  ajuste_pct: string;
  estado: EstadoContrato;
}

export interface SolicitudContrato {
  id: number;
  ajuste_pct: string;
  creado_en: string;
  empresa_id: number;
  empresa_nombre: string;
  suplidor_id: number;
  suplidor_nombre: string;
}

// ---------- Sprint 14: dashboard de plataforma ----------

export interface DashboardPlataforma {
  gmvConfirmado: number;
  cantidadPedidosRecibidos: number;
  subsidioTotalEmpresas: number;
  ingresoPropio: number;
  tasaComisionPct: number;
  pedidosPorEstado: { estado: string; cantidad: number }[];
  coberturaMenu: { suplidorId: number; suplidorNombre: string; diasPublicados: number; diasTotal: number }[];
}

export interface Configuracion {
  tasa_comision_pct: string;
  actualizado_en: string;
}

export interface EventoPedido {
  id: number;
  pedido_id: number;
  estado_anterior: string | null;
  estado_nuevo: string;
  actor: 'COLABORADOR' | 'SUPLIDOR' | 'RRHH' | 'SILENCIO';
  creado_en: string;
  empresa_nombre: string;
  fecha_servicio: string;
}

export interface Lead {
  id: number;
  nombre_propuesto: string;
  rnc_propuesto: string | null;
  contacto: string | null;
  mensaje: string | null;
  estado: 'PENDIENTE' | 'CONVERTIDO';
  creado_en: string;
  suplidor_nombre?: string;
}
