import { BadRequestException } from '@nestjs/common';
import { PoolClient } from 'pg';
import { FilaColaborador, validarCsvColaboradores } from './csv-colaboradores';

/**
 * Sprint 16, subsprint 16.1: motor de importación de colaboradores,
 * extraído de `BackOfficeController` (donde vivía como métodos privados,
 * atados a `Request`) para que `IdentidadController` (RRHH, ámbito
 * EMPRESA) lo reuse tal cual — mismas reglas, mismo comportamiento, sin
 * duplicar nada. Recibe `PoolClient`/`empresaId` explícitos en vez de
 * leerlos de `req`, así que a este módulo le da igual quién lo llame.
 */

export function obtenerContenidoCsv(file: Express.Multer.File | undefined, csvTexto: string | undefined): string {
  if (file) return file.buffer.toString('utf-8');
  if (csvTexto) return csvTexto;
  throw new BadRequestException(
    'Envía el CSV como archivo (campo "file", multipart/form-data) o como texto en el body ({ "csv": "..." }).',
  );
}

export async function puntosValidosDe(db: PoolClient, empresaId: number): Promise<Set<string>> {
  const { rows } = await db.query(
    `SELECT nombre FROM punto_entrega WHERE empresa_id = $1 AND estado = 'ACTIVO'`,
    [empresaId],
  );
  return new Set(rows.map((r: { nombre: string }) => r.nombre));
}

export async function mapaPuntosDe(db: PoolClient, empresaId: number): Promise<Map<string, number>> {
  const { rows } = await db.query(
    `SELECT id, nombre FROM punto_entrega WHERE empresa_id = $1 AND estado = 'ACTIVO'`,
    [empresaId],
  );
  return new Map(rows.map((r: { id: number; nombre: string }) => [r.nombre, r.id]));
}

/**
 * `validarCsvColaboradores` lanza un `Error` plano (no un `HttpException`)
 * cuando el archivo no es un CSV válido — bug real encontrado el 5 de
 * agosto de 2026 al probar con un CSV real subido desde el navegador
 * (Sprint 13): antes se colaba sin capturar y NestJS lo devolvía como
 * `500 Internal server error`, sin decir qué estaba mal. Se traduce aquí
 * a `400` con el mensaje legible (incluye la línea donde falló el parser).
 */
export function parsearCsvOFallar(csv: string, puntosValidos: Set<string>): FilaColaborador[] {
  try {
    return validarCsvColaboradores(csv, puntosValidos);
  } catch (err) {
    throw new BadRequestException((err as Error).message);
  }
}

export function resumenDeFilas(filas: FilaColaborador[]) {
  const conError = filas.filter((f) => f.errores.length > 0);
  const conAlerta = filas.filter((f) => f.errores.length === 0 && f.alertas.length > 0);
  const limpias = filas.filter((f) => f.errores.length === 0 && f.alertas.length === 0);
  return {
    totalFilas: filas.length,
    limpias: limpias.length,
    conAlerta: conAlerta.length,
    conError: conError.length,
    importables: filas.filter((f) => f.errores.length === 0).length,
    filas,
  };
}

/** Inserta (o actualiza por `codigo_nomina`) solo las filas sin error. Devuelve cuántas se importaron. */
export async function importarFilas(
  db: PoolClient,
  empresaId: number,
  filas: FilaColaborador[],
  puntosMapa: Map<string, number>,
): Promise<number> {
  const importables = filas.filter((f) => f.errores.length === 0);
  let importados = 0;
  for (const fila of importables) {
    const d = fila.datos;
    const puntoId = d.punto_entrega ? puntosMapa.get(d.punto_entrega) ?? null : null;
    await db.query(
      `INSERT INTO colaborador
         (empresa_id, codigo_nomina, cedula, nombre_completo, email, punto_entrega_id, salario_neto_ref, fecha_ingreso)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE)
       ON CONFLICT (empresa_id, codigo_nomina) DO UPDATE SET
         nombre_completo = EXCLUDED.nombre_completo,
         email = EXCLUDED.email,
         punto_entrega_id = EXCLUDED.punto_entrega_id,
         salario_neto_ref = EXCLUDED.salario_neto_ref`,
      [empresaId, d.codigo_nomina, d.cedula, d.nombre_completo, d.email || null, puntoId, d.salario_neto || null],
    );
    importados++;
  }
  return importados;
}
