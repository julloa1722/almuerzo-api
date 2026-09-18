import type { PoolClient } from 'pg';

interface NotificacionParams {
  tipo: string;
  destinatario: string | null | undefined;
  asunto: string;
  cuerpo: string;
  referenciaTipo?: string;
  referenciaId?: number;
}

interface RegistroParams {
  tipo: string;
  destinatario: string;
  asunto: string;
  estado: 'ENVIADA' | 'ERROR' | 'OMITIDA';
  referenciaTipo?: string;
  referenciaId?: number;
  detalleError?: string;
}

async function registrar(db: PoolClient, r: RegistroParams): Promise<void> {
  await db.query(
    `INSERT INTO notificacion_enviada (tipo, destinatario, asunto, estado, referencia_tipo, referencia_id, detalle_error)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [r.tipo, r.destinatario, r.asunto, r.estado, r.referenciaTipo ?? null, r.referenciaId ?? null, r.detalleError ?? null],
  );
}

/**
 * Envía un correo real vía la API HTTP de Resend directo (sin SDK, mismo
 * criterio de dependencias mínimas del resto del proyecto) y deja
 * constancia en `notificacion_enviada`. Nunca lanza — un fallo de envío
 * (o no tener RESEND_API_KEY configurada todavía) no debe tumbar la
 * transacción que lo disparó, ej. confirmar un pedido no debe fallar
 * porque el proveedor de email esté caído o sin configurar.
 */
export async function enviarNotificacion(db: PoolClient, params: NotificacionParams): Promise<void> {
  const { tipo, destinatario, asunto, cuerpo, referenciaTipo, referenciaId } = params;

  if (!destinatario) {
    await registrar(db, {
      tipo,
      destinatario: '(sin email registrado)',
      asunto,
      estado: 'OMITIDA',
      referenciaTipo,
      referenciaId,
      detalleError: 'El destinatario no tiene un email registrado.',
    });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    await registrar(db, {
      tipo,
      destinatario,
      asunto,
      estado: 'OMITIDA',
      referenciaTipo,
      referenciaId,
      detalleError: 'RESEND_API_KEY o RESEND_FROM_EMAIL no están configuradas.',
    });
    return;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: destinatario, subject: asunto, text: cuerpo }),
    });
    if (!res.ok) {
      const detalle = await res.text();
      await registrar(db, {
        tipo,
        destinatario,
        asunto,
        estado: 'ERROR',
        referenciaTipo,
        referenciaId,
        detalleError: `HTTP ${res.status}: ${detalle.slice(0, 500)}`,
      });
      return;
    }
    await registrar(db, { tipo, destinatario, asunto, estado: 'ENVIADA', referenciaTipo, referenciaId });
  } catch (err) {
    await registrar(db, {
      tipo,
      destinatario,
      asunto,
      estado: 'ERROR',
      referenciaTipo,
      referenciaId,
      detalleError: (err as Error).message,
    });
  }
}
