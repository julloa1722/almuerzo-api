import { useState } from 'react';

/**
 * Campo de contraseña con botón de mostrar/ocultar (Sprint 21).
 *
 * Existe porque lo usan tres pantallas (login, restablecer, aceptar invitación)
 * y porque en el teléfono —donde se escribe peor— poder verificar lo que
 * tecleaste antes de enviar evita el intento fallido más común.
 */
export function CampoPassword({
  id,
  etiqueta,
  valor,
  onChange,
  autoComplete = 'current-password',
  placeholder = '••••••••',
}: {
  id: string;
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="campo">
      <label htmlFor={id}>{etiqueta}</label>
      <div className="entrada">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required
        />
        <button
          type="button"
          className="ojo"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke={visible ? '#2D6A4F' : '#9B9A93'}
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
            <circle cx="12" cy="12" r="2.6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
