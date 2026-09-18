import { useState } from 'react';
import { AppHeader } from '../components/AppHeader';
import { ResumenTab } from '../components/rrhh/ResumenTab';
import { DisputasTab } from '../components/rrhh/DisputasTab';
import { CiclosTab } from '../components/rrhh/CiclosTab';
import { ProgramasTab } from '../components/rrhh/ProgramasTab';
import { ColaboradoresTab } from '../components/rrhh/ColaboradoresTab';

const TABS = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'disputas', label: 'Disputas y pedidos' },
  { key: 'ciclos', label: 'Ciclos y libro mayor' },
  { key: 'programas', label: 'Programas de beneficio' },
  { key: 'colaboradores', label: 'Cargar colaboradores' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

/**
 * Sprint 12: panel de RRHH. Diseño de la pestaña `vRRHH` en
 * `mockup-plataforma-almuerzo.html`, sin la tarjeta de "menús por
 * aprobar" (no existe en el backend real, ver plan-sprints.md Sprint 12).
 * La pestaña de programas de beneficio no tiene mockup — se diseñó para
 * cerrar el gap real documentado desde el Sprint 9. Sprint 19 agrega
 * "Resumen" como primera pestaña.
 */
export function RrhhPage() {
  const [tab, setTab] = useState<TabKey>('resumen');

  return (
    <div className="min-h-screen">
      <AppHeader titulo="Panel de RRHH" />
      <main className="max-w-[1240px] mx-auto px-5 py-6">
        <nav className="subnav">
          {TABS.map((t) => (
            <button key={t.key} aria-current={tab === t.key} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </nav>
        {tab === 'resumen' && <ResumenTab />}
        {tab === 'disputas' && <DisputasTab />}
        {tab === 'ciclos' && <CiclosTab />}
        {tab === 'programas' && <ProgramasTab />}
        {tab === 'colaboradores' && <ColaboradoresTab />}
      </main>
    </div>
  );
}
