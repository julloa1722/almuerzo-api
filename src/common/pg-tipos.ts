import { types } from 'pg';

/**
 * Por defecto, node-postgres devuelve las columnas BIGINT (oid 20) como string,
 * para no perder precisión en valores que exceden Number.MAX_SAFE_INTEGER.
 * Para esta aplicación —volumen de filas muy por debajo de ese límite— preferimos
 * trabajar con number en todo el código (comparaciones, JSON de respuesta, JWT)
 * en vez de sembrar conversiones String()/Number() por todas partes. Si el
 * proyecto llegara a un volumen donde esto importe, se revierte esta única
 * configuración, no cada comparación individual.
 *
 * Debe importarse antes que cualquier otro código que use `pg`.
 */
types.setTypeParser(20, (val: string) => parseInt(val, 10));
