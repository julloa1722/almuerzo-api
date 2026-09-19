const VARIABLES_CRITICAS = ['DATABASE_URL', 'MIGRATE_DATABASE_URL', 'PLATFORM_DATABASE_URL', 'JWT_SECRET'];

/**
 * Variables que solo son obligatorias en producción, porque en desarrollo el
 * default apunta a localhost y ahí es correcto (Sprint 20).
 *
 * `FRONTEND_URL` es el caso que motivó esta lista: si falta en producción, la
 * API arranca perfecta, `/health` responde `ok`, y todo parece bien — pero
 * cada correo de invitación y de recuperación de contraseña sale con un
 * enlace a `http://localhost:5176`, que no le sirve a nadie. Es un fallo
 * silencioso que solo se descubre cuando alguien no puede entrar, así que
 * conviene que el arranque muera ruidosamente en vez de mentir.
 */
const VARIABLES_CRITICAS_EN_PRODUCCION = ['FRONTEND_URL', 'CORS_ORIGENES'];

/**
 * Falla rápido al arrancar si falta una variable de entorno crítica, en vez
 * de fallar a medias en el primer request que la necesite (Sprint 9.3).
 */
export function validarVariablesDeEntorno(): void {
  const requeridas = [...VARIABLES_CRITICAS];
  if (process.env.NODE_ENV === 'production') {
    requeridas.push(...VARIABLES_CRITICAS_EN_PRODUCCION);
  }

  const faltantes = requeridas.filter((v) => !process.env[v]);
  if (faltantes.length) {
    // eslint-disable-next-line no-console
    console.error(
      `No se puede arrancar: faltan variables de entorno obligatorias: ${faltantes.join(', ')}. ` +
        (process.env.NODE_ENV === 'production'
          ? 'En producción, revisa las variables del servicio en tu hosting — ver GUIA-DESPLIEGUE.md.'
          : 'Copia .env.example a .env y complétalo.'),
    );
    process.exit(1);
  }
}
