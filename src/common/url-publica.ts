/**
 * Normaliza una URL pública que viene de una variable de entorno.
 *
 * Existe por una razón concreta del despliegue (Sprint 20): los valores que
 * un hosting entrega no siempre traen esquema. Render, al enlazar un
 * servicio con otro, da el hostname pelado (`almuerzo-front.onrender.com`).
 * Eso, pegado en un correo, produce `almuerzo-front.onrender.com/invitacion/xxx`
 * — que muchos clientes de correo no convierten en enlace clicable, y que un
 * navegador interpretaría como ruta relativa. Y en una comparación de origen
 * de CORS no coincide nunca, porque el header `Origin` del navegador siempre
 * trae esquema.
 *
 * Se asume `https` cuando falta, no `http`: cualquier hosting real sirve por
 * TLS, y equivocarse hacia https falla de forma visible (no carga) en vez de
 * silenciosamente insegura.
 *
 * También quita la barra final, porque quien consume esto arma
 * `${base}${path}` y `path` ya empieza con "/" — dos barras seguidas rompen
 * el routing de Nest y se ven mal en un correo.
 */
export function normalizarUrlPublica(valor: string | undefined, porDefecto: string): string {
  const crudo = (valor ?? '').trim();
  if (!crudo) return porDefecto.replace(/\/+$/, '');
  const conEsquema = /^https?:\/\//i.test(crudo) ? crudo : `https://${crudo}`;
  return conEsquema.replace(/\/+$/, '');
}

/**
 * La URL pública del frontend, para armar los enlaces que se mandan por
 * correo (invitación y recuperación de contraseña).
 *
 * **Si esta variable falta en producción, los correos salen apuntando a
 * `localhost` y nadie puede aceptar una invitación ni recuperar su
 * contraseña.** Por eso `validar-entorno.ts` la exige cuando
 * `NODE_ENV=production`, en vez de dejar que el default de desarrollo se
 * active en silencio.
 */
export function urlDelFrontend(): string {
  return normalizarUrlPublica(process.env.FRONTEND_URL, 'http://localhost:5176');
}
