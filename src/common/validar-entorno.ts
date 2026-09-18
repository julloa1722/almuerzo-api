const VARIABLES_CRITICAS = ['DATABASE_URL', 'MIGRATE_DATABASE_URL', 'PLATFORM_DATABASE_URL', 'JWT_SECRET'];

/**
 * Falla rápido al arrancar si falta una variable de entorno crítica, en vez
 * de fallar a medias en el primer request que la necesite (Sprint 9.3).
 */
export function validarVariablesDeEntorno(): void {
  const faltantes = VARIABLES_CRITICAS.filter((v) => !process.env[v]);
  if (faltantes.length) {
    // eslint-disable-next-line no-console
    console.error(
      `No se puede arrancar: faltan variables de entorno obligatorias: ${faltantes.join(', ')}. ` +
        'Copia .env.example a .env y complétalo.',
    );
    process.exit(1);
  }
}
