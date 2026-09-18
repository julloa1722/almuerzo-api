import { parse } from 'csv-parse/sync';

export interface FilaColaborador {
  numeroFila: number; // 1-indexed, contando el encabezado como fila 1
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

const CEDULA_RE = /^\d{3}-?\d{7}-?\d$/;

/**
 * Bug real encontrado el 5 de agosto de 2026 con un archivo real: Excel en
 * español exporta montos como "35.000,00" (punto de millar, coma decimal)
 * — `Number()` de JS no lo entiende, y aunque se validara, el `INSERT`
 * a la columna NUMERIC de Postgres fallaría igual con la coma sin limpiar.
 * Acepta formato dominicano/US ("35,000.00") y español ("35.000,00")
 * indistintamente, más texto simple ("35000" o "35000.50").
 */
export function normalizarMonto(valor: string): string {
  let s = valor.trim().replace(/[^\d.,-]/g, '');
  const tieneComa = s.includes(',');
  const tienePunto = s.includes('.');

  if (tieneComa && tienePunto) {
    // El separador que aparece último es el decimal; el otro es de millar.
    const decimalEsComa = s.lastIndexOf(',') > s.lastIndexOf('.');
    s = decimalEsComa ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (tieneComa) {
    // Solo coma: decimal si son exactamente 2 dígitos al final (",00"), si no, de millar.
    s = /,\d{2}$/.test(s) ? s.replace(',', '.') : s.replace(/,/g, '');
  } else if (tienePunto && /\.\d{3}$/.test(s)) {
    // Solo punto(s), terminando en exactamente 3 dígitos (".000"): de millar,
    // no decimal — "35.000" son 35 mil pesos, no 35 con 0 centavos.
    s = s.replace(/\./g, '');
  }
  return s;
}

/**
 * Reglas idénticas a las que se validaron en el mockup portal-backoffice-onboarding.html:
 * código y cédula obligatorios y únicos dentro del archivo, nombre obligatorio,
 * cédula con formato válido, salario numérico positivo si viene, y punto de
 * entrega que no matchea ninguno existente se marca ALERTA (se importa igual,
 * sin bloquear), no ERROR.
 */
function detectarDelimitadorCsv(contenidoCsv: string): ',' | ';' {
  const lineas = contenidoCsv.replace(/\r/g, '').split('\n').filter((l) => l.trim().length > 0);
  if (lineas.length === 0) return ';';

  const primerasLineas = lineas.slice(0, 5);
  const totals = primerasLineas.reduce(
    (acc, linea) => {
      acc.semicolons += (linea.match(/;/g) ?? []).length;
      acc.commas += (linea.match(/,/g) ?? []).length;
      return acc;
    },
    { semicolons: 0, commas: 0 },
  );

  return totals.semicolons >= totals.commas ? ';' : ',';
}

function normalizarCabecera(cabecera: string): string {
  const limpia = cabecera.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  switch (limpia) {
    case 'codigo_nomina':
    case 'codigo nomina':
    case 'codigo':
    case 'codigo de nomina':
    case 'codigo de nomina':
    case 'codigo de nómina':
    case 'código nomina':
    case 'codigo_nómina':
    case 'código_nómina':
    case 'codigo de nómina':
      return 'codigo_nomina';
    case 'cedula':
    case 'cedula':
    case 'cédula':
      return 'cedula';
    case 'nombre_completo':
    case 'nombre completo':
    case 'nombre':
      return 'nombre_completo';
    case 'email':
    case 'correo':
    case 'correo electronico':
    case 'correo electronico':
    case 'correo electrónico':
      return 'email';
    case 'punto_entrega':
    case 'punto entrega':
    case 'punto':
    case 'punto de entrega':
      return 'punto_entrega';
    case 'salario_neto':
    case 'salario neto':
    case 'salario':
      return 'salario_neto';
    default:
      return cabecera;
  }
}

export function validarCsvColaboradores(
  contenidoCsv: string,
  puntosValidos: Set<string>,
): FilaColaborador[] {
  const delimiter = detectarDelimitadorCsv(contenidoCsv);

  let registros: Record<string, string>[];
  try {
    registros = parse(contenidoCsv, {
      columns: (header: string[]) => header.map(normalizarCabecera),
      skip_empty_lines: true,
      trim: true,
      bom: true,
      delimiter,
    });
  } catch (err) {
    // csv-parse lanza una excepción síncrona (ej. comilla sin cerrar, número
    // de columnas inconsistente) que antes se colaba sin capturar hasta
    // NestJS como 500 genérico — bug real encontrado al probar con un CSV
    // real subido desde el navegador (Sprint 13). Se convierte en un error
    // de negocio legible; el mensaje de csv-parse ya incluye la línea donde
    // falló.
    throw new Error(`El archivo no se pudo leer como CSV: ${(err as Error).message}`);
  }

  const filas: FilaColaborador[] = registros.map((datos, i) => ({
    numeroFila: i + 2, // +1 por 1-index, +1 por el encabezado
    datos,
    errores: [],
    alertas: [],
  }));

  const vistoCodigo = new Map<string, number>();
  const vistoCedula = new Map<string, number>();

  for (const fila of filas) {
    const d = fila.datos;

    if (!d.codigo_nomina) fila.errores.push('Falta código de nómina.');
    if (!d.nombre_completo) fila.errores.push('Falta el nombre completo.');
    if (!d.cedula || !CEDULA_RE.test(d.cedula)) {
      fila.errores.push(`Cédula con formato inválido: "${d.cedula ?? ''}".`);
    }
    if (!d.punto_entrega) {
      fila.errores.push('Falta punto de entrega.');
    } else if (!puntosValidos.has(d.punto_entrega)) {
      fila.alertas.push(`Punto de entrega "${d.punto_entrega}" no coincide con ningún punto configurado.`);
    }
    if (d.salario_neto) {
      const normalizado = normalizarMonto(d.salario_neto);
      if (isNaN(Number(normalizado)) || Number(normalizado) <= 0) {
        fila.errores.push(`Salario neto inválido: "${d.salario_neto}".`);
      } else {
        d.salario_neto = normalizado; // limpio, para que el INSERT posterior no falle con la coma/punto original
      }
    }

    if (d.codigo_nomina) {
      const previa = vistoCodigo.get(d.codigo_nomina);
      if (previa) fila.errores.push(`Código de nómina duplicado en el archivo (fila ${previa}).`);
      else vistoCodigo.set(d.codigo_nomina, fila.numeroFila);
    }
    if (d.cedula && CEDULA_RE.test(d.cedula)) {
      const previa = vistoCedula.get(d.cedula);
      if (previa) fila.errores.push(`Cédula duplicada en el archivo (fila ${previa}).`);
      else vistoCedula.set(d.cedula, fila.numeroFila);
    }
  }

  return filas;
}
