import { AppHeader } from '../components/AppHeader';
import { PedirCard } from '../components/PedirCard';
import { MisPedidosCard } from '../components/MisPedidosCard';
import { ResumenColaborador } from '../components/ResumenColaborador';

export function AppPage() {
  return (
    <div className="min-h-screen">
      <AppHeader titulo="Almuerzo" />

      <main className="max-w-[1100px] mx-auto px-5 py-6">
        <ResumenColaborador />
        <div className="grid gap-5 items-start" style={{ gridTemplateColumns: 'minmax(0,380px) minmax(0,1fr)' }}>
          <div>
            <PedirCard />
          </div>
          <MisPedidosCard />
        </div>
      </main>
    </div>
  );
}
