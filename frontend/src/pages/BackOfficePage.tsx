import { useState } from 'react';
import { AppHeader } from '../components/AppHeader';
import { EmpresasLista } from '../components/backoffice/EmpresasLista';
import { OnboardingWizard } from '../components/backoffice/OnboardingWizard';
import { DetalleEmpresa } from '../components/backoffice/DetalleEmpresa';
import { SolicitudesTab } from '../components/backoffice/SolicitudesTab';
import { DashboardTab } from '../components/backoffice/DashboardTab';
import { TrazabilidadTab } from '../components/backoffice/TrazabilidadTab';
import { UsuariosTab } from '../components/backoffice/UsuariosTab';
import type { Lead } from '../types';

type Vista =
  | { tipo: 'lista' }
  | { tipo: 'onboarding'; nombreInicial?: string; rncInicial?: string; leadId?: number }
  | { tipo: 'detalle'; empresaId: number };

const TABS = [
  { key: 'empresas', label: 'Empresas' },
  { key: 'comercial', label: 'Solicitudes y leads' },
  { key: 'usuarios', label: 'Usuarios' },
  { key: 'dashboard', label: 'Panel de plataforma' },
  { key: 'trazabilidad', label: 'Trazabilidad' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

/**
 * Sprint 13: panel de back office. Diseño de `portal-backoffice-onboarding.html`
 * (vEmpresas, vOnboarding, vDetalle) — ver plan-sprints.md, Sprint 13.
 * Sprint 17 agrega la pestaña "Solicitudes y leads" (relación comercial
 * suplidor-empresa) — sin mockup de referencia.
 */
export function BackOfficePage() {
  const [tab, setTab] = useState<TabKey>('empresas');
  const [vista, setVista] = useState<Vista>({ tipo: 'lista' });

  function crearEmpresaDesdeLead(lead: Lead) {
    setVista({ tipo: 'onboarding', nombreInicial: lead.nombre_propuesto, rncInicial: lead.rnc_propuesto ?? '', leadId: lead.id });
    setTab('empresas');
  }

  return (
    <div className="min-h-screen">
      <AppHeader titulo="Back office" />
      <main className="max-w-[1240px] mx-auto px-5 py-6">
        <nav className="subnav">
          {TABS.map((t) => (
            <button key={t.key} aria-current={tab === t.key} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </nav>

        {tab === 'empresas' && (
          <>
            {vista.tipo === 'lista' && (
              <EmpresasLista
                onNuevaEmpresa={() => setVista({ tipo: 'onboarding' })}
                onSeleccionar={(empresaId) => setVista({ tipo: 'detalle', empresaId })}
              />
            )}
            {vista.tipo === 'onboarding' && (
              <OnboardingWizard
                nombreInicial={vista.nombreInicial}
                rncInicial={vista.rncInicial}
                leadId={vista.leadId}
                onTerminado={() => setVista({ tipo: 'lista' })}
                onCancelar={() => setVista({ tipo: 'lista' })}
              />
            )}
            {vista.tipo === 'detalle' && (
              <DetalleEmpresa empresaId={vista.empresaId} onVolver={() => setVista({ tipo: 'lista' })} />
            )}
          </>
        )}

        {tab === 'comercial' && <SolicitudesTab onCrearEmpresaDesdeLead={crearEmpresaDesdeLead} />}
        {tab === 'usuarios' && <UsuariosTab />}
        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'trazabilidad' && <TrazabilidadTab />}
      </main>
    </div>
  );
}
