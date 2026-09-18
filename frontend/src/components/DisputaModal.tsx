import { useState } from 'react';
import type { MotivoDisputa, PedidoMio } from '../types';

const MOTIVOS: { valor: MotivoDisputa; etiqueta: string }[] = [
  { valor: 'NO_LLEGO', etiqueta: 'Nunca llegó' },
  { valor: 'INCOMPLETO', etiqueta: 'Llegó incompleto' },
  { valor: 'EQUIVOCADO', etiqueta: 'Llegó un plato distinto' },
  { valor: 'CALIDAD', etiqueta: 'Problema de calidad o estado del alimento' },
  { valor: 'OTRO', etiqueta: 'Otro motivo' },
];

export function DisputaModal({
  pedido,
  enviando,
  onConfirmar,
  onCancelar,
}: {
  pedido: PedidoMio;
  enviando: boolean;
  onConfirmar: (motivo: MotivoDisputa, nota: string) => void;
  onCancelar: () => void;
}) {
  const [motivo, setMotivo] = useState<MotivoDisputa>('NO_LLEGO');
  const [nota, setNota] = useState('');

  return (
    <div className="card border-granate mt-4">
      <h3 className="text-granate">Reportar problema · pedido #{pedido.id}</h3>
      <p className="text-[13.5px] text-muted mb-3.5">
        {pedido.suplidor_nombre} · {pedido.fecha_servicio.slice(0, 10)}
      </p>
      <div className="campo">
        <label>¿Qué pasó?</label>
        {MOTIVOS.map((m) => (
          <div key={m.valor} className="flex items-start gap-2 text-[13px] mb-1.5">
            <input
              type="radio"
              id={`motivo_${m.valor}`}
              name="motivo_disputa"
              className="mt-[3px]"
              checked={motivo === m.valor}
              onChange={() => setMotivo(m.valor)}
            />
            <label htmlFor={`motivo_${m.valor}`} className="font-normal">
              {m.etiqueta}
            </label>
          </div>
        ))}
      </div>
      <div className="campo">
        <label>Detalle adicional (opcional)</label>
        <input placeholder="Ej: llegó sin la ensalada" value={nota} onChange={(e) => setNota(e.target.value)} />
        <div className="text-[11.5px] text-muted mt-1">Ayuda a RRHH y al suplidor a resolver más rápido.</div>
      </div>
      <div className="flex gap-2 mt-3.5">
        <button className="btn btn-dan" disabled={enviando} onClick={() => onConfirmar(motivo, nota)}>
          {enviando ? 'Enviando…' : 'Enviar reclamo'}
        </button>
        <button className="btn btn-sec" disabled={enviando} onClick={onCancelar}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
