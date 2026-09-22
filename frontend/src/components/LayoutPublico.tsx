import type { ReactNode } from 'react';
import { EscenaPlato } from './EscenaPlato';
import { Marca } from './Marca';

/**
 * El marco de las cuatro pantallas públicas (Sprint 21): login, olvidé mi
 * contraseña, restablecer, y aceptar invitación.
 *
 * Existe como componente y no dentro del login porque las cuatro tienen que
 * verse iguales. Un cliente que abre un enlace de invitación desde su correo y
 * cae en una pantalla con otro aspecto nota el remiendo — y ese enlace es, para
 * mucha gente, la primera vez que ve la plataforma.
 *
 * En pantalla ancha: escena a la izquierda sobre `paper`, contenido a la
 * derecha sobre blanco. En pantalla chica se apila, con la escena arriba y
 * reducida para no empujar el formulario fuera de la vista en un teléfono.
 */
export function LayoutPublico({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-card">
      <div className="bg-paper border-rule lg:border-r max-lg:border-b flex items-center justify-center px-8 py-11 max-lg:px-6 max-lg:py-7">
        <EscenaPlato />
      </div>

      <div className="flex flex-col items-center justify-center px-8 py-11 max-lg:px-6 max-lg:py-8">
        <div className="w-full max-w-[380px] flex flex-col gap-4">
          <Marca />
          {children}
        </div>

        <footer className="w-full max-w-[380px] mt-10 pt-4 border-t border-rule text-[11.5px] leading-relaxed text-muted">
          <p className="m-0">
            © {new Date().getFullYear()} Almuerzo · Beneficios corporativos,
            República Dominicana
          </p>
        </footer>
      </div>
    </div>
  );
}
