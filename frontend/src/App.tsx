import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RolRouter } from './pages/RolRouter';
import { AceptarInvitacionPage } from './pages/AceptarInvitacionPage';
import { OlvidePasswordPage } from './pages/OlvidePasswordPage';
import { RestablecerPasswordPage } from './pages/RestablecerPasswordPage';
import { ContactoPage } from './pages/ContactoPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/contacto" element={<ContactoPage />} />
            <Route path="/invitacion/:token" element={<AceptarInvitacionPage />} />
            <Route path="/olvide-password" element={<OlvidePasswordPage />} />
            <Route path="/restablecer-password/:token" element={<RestablecerPasswordPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <RolRouter />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
