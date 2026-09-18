import type { ReactNode } from 'react';

export function Aviso({ tipo, children }: { tipo: 'no' | 'si' | 'at'; children: ReactNode }) {
  return <div className={`aviso aviso-${tipo}`}>{children}</div>;
}
