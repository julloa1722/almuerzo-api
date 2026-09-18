/**
 * Catálogo fijo de campos disponibles para el archivo de descuento (Sprint 6).
 * A propósito no admite expresiones ni SQL libre desde el cliente — la
 * empresa elige de esta lista y en qué orden, nada más. Funciones puras,
 * sin acceso a base de datos, para poder probarlas con datos fijos.
 */

export interface CampoDisponible {
  clave: string;
  etiquetaDefault: string;
}

export const CAMPOS_DISPONIBLES: CampoDisponible[] = [
  { clave: 'codigo_nomina', etiquetaDefault: 'Código de nómina' },
  { clave: 'cedula', etiquetaDefault: 'Cédula' },
  { clave: 'nombre_completo', etiquetaDefault: 'Nombre' },
  { clave: 'punto_entrega', etiquetaDefault: 'Punto de entrega' },
  { clave: 'cantidad_pedidos', etiquetaDefault: 'Cantidad de pedidos' },
  { clave: 'monto_total', etiquetaDefault: 'Monto a descontar' },
  { clave: 'subsidio_total_empresa', etiquetaDefault: 'Subsidio aportado por la empresa' },
  { clave: 'periodo_inicio', etiquetaDefault: 'Inicio del período' },
  { clave: 'periodo_fin', etiquetaDefault: 'Fin del período' },
];

const CLAVES_VALIDAS = new Set(CAMPOS_DISPONIBLES.map((c) => c.clave));

export interface CampoPlantilla {
  campo: string;
  etiqueta?: string;
}

export const PLANTILLA_DEFAULT: CampoPlantilla[] = [
  { campo: 'codigo_nomina' },
  { campo: 'nombre_completo' },
  { campo: 'monto_total' },
];

/** Lanza un Error con mensaje humano si la plantilla enviada no es válida. */
export function validarPlantilla(campos: unknown): CampoPlantilla[] {
  if (!Array.isArray(campos) || campos.length === 0) {
    throw new Error('campos debe ser un array no vacío.');
  }
  return campos.map((c) => {
    if (!c || typeof c !== 'object' || typeof (c as Record<string, unknown>).campo !== 'string') {
      throw new Error('Cada campo debe tener la forma { campo: string, etiqueta?: string }.');
    }
    const campo = (c as Record<string, unknown>).campo as string;
    if (!CLAVES_VALIDAS.has(campo)) {
      throw new Error(`Campo desconocido: "${campo}". Disponibles: ${[...CLAVES_VALIDAS].join(', ')}.`);
    }
    const etiqueta = (c as Record<string, unknown>).etiqueta;
    if (etiqueta != null && typeof etiqueta !== 'string') {
      throw new Error('etiqueta debe ser texto si se envía.');
    }
    return { campo, etiqueta: etiqueta as string | undefined };
  });
}

function escaparCsv(valor: unknown): string {
  const s = valor == null ? '' : String(valor);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** `filas`: una por colaborador, con todos los campos del catálogo ya calculados. */
export function generarCsv(plantilla: CampoPlantilla[], filas: Record<string, unknown>[]): string {
  const etiquetaDe = (clave: string) => CAMPOS_DISPONIBLES.find((c) => c.clave === clave)?.etiquetaDefault ?? clave;
  const encabezado = plantilla.map((c) => escaparCsv(c.etiqueta ?? etiquetaDe(c.campo))).join(',');
  const lineas = filas.map((fila) => plantilla.map((c) => escaparCsv(fila[c.campo])).join(','));
  return [encabezado, ...lineas].join('\n');
}
