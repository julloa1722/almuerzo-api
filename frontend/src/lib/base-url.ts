/**
 * URL base de la API, única para toda la app.
 *
 * Sprint 20: antes esta constante estaba copiada literalmente en 4 archivos
 * (`lib/api.ts`, `components/backoffice/OnboardingWizard.tsx`,
 * `components/rrhh/CiclosTab.tsx`, `components/rrhh/ColaboradoresTab.tsx`).
 * Se centraliza aquí porque el despliegue necesita normalizar el valor, y
 * arreglarlo en un solo lugar es la diferencia entre que funcione y que
 * funcione en tres de cuatro pantallas.
 *
 * Por qué normalizar: en el blueprint de Render, `VITE_API_URL` se enlaza al
 * otro servicio con `fromService`, y Render entrega el HOSTNAME PELADO
 * (`almuerzo-api.onrender.com`), sin `https://`. Un fetch contra eso lo
 * interpretaría como ruta relativa y pegaría contra el propio frontend. Como
 * `fromService` no permite concatenar el esquema, se resuelve acá: si el valor
 * no trae esquema, se asume https.
 *
 * En desarrollo nada cambia — `http://localhost:3000` ya trae esquema y pasa
 * intacto.
 */
function normalizar(valor: string | undefined): string {
  const url = (valor ?? 'http://localhost:3000').trim();
  if (!url) return 'http://localhost:3000';
  const conEsquema = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  // Sin barra final, porque todas las llamadas arman `${BASE_URL}${path}` y
  // path ya empieza con "/". Dos barras seguidas rompen el routing de Nest.
  return conEsquema.replace(/\/+$/, '');
}

export const BASE_URL = normalizar(import.meta.env.VITE_API_URL);
