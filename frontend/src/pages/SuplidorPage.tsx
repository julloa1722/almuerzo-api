import { useState } from 'react';
import { AppHeader } from '../components/AppHeader';
import { ResumenTab } from '../components/suplidor/ResumenTab';
import { CatalogoTab } from '../components/suplidor/CatalogoTab';
import { PlantillaTab } from '../components/suplidor/PlantillaTab';
import { CalendarioTab } from '../components/suplidor/CalendarioTab';
import { ComercialTab } from '../components/suplidor/ComercialTab';

const TABS = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'catalogo', label: 'Catálogo' },
  { key: 'plantilla', label: 'Plantilla semanal' },
  { key: 'calendario', label: 'Calendario y preparación' },
  { key: 'comercial', label: 'Relación comercial' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

/**
 * Sprint 11: portal del suplidor. Diseño de `portal-suplidor-menu.html`,
 * pero sin su 4ª pestaña de "vista del colaborador" — ya existe de verdad
 * (Sprint 10), no hace falta simularla. Ver plan-sprints.md, Sprint 11.
 * Sprint 19 agrega "Resumen" como primera pestaña.
 */
export function SuplidorPage() {
  const [tab, setTab] = useState<TabKey>('resumen');

  return (
    <div className="min-h-screen">
      <AppHeader titulo="Portal del suplidor" />
      <main className="max-w-[1240px] mx-auto px-5 py-6">
        <nav className="subnav">
          {TABS.map((t) => (
            <button key={t.key} aria-current={tab === t.key} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </nav>
        {tab === 'resumen' && <ResumenTab />}
        {tab === 'catalogo' && <CatalogoTab />}
        {tab === 'plantilla' && <PlantillaTab />}
        {tab === 'calendario' && <CalendarioTab />}
        {tab === 'comercial' && <ComercialTab />}
      </main>
    </div>
  );
}
