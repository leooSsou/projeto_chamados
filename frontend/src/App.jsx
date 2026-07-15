import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Chamados from './pages/Chamados';
import Usuarios from './pages/Usuarios';

// Componente para proteger rotas autenticadas
const PrivateRoute = ({ children }) => {
  const { token, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        Carregando sessão...
      </div>
    );
  }
  
  return token ? children : <Navigate to="/login" replace />;
};

// Componente para rotas exclusivas de Supervisor
const SupervisorRoute = ({ children }) => {
  const { user } = useAuth();
  return user?.profile === 'Supervisor' ? children : <Navigate to="/chamados" replace />;
};

// Layout com barra de navegação superior compartilhada
const Layout = ({ children }) => {
  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

function AppRoutes() {
  const { token } = useAuth();
  
  return (
    <Routes>
      {/* Rota pública de Login (se autenticado, redireciona) */}
      <Route 
        path="/login" 
        element={token ? <Navigate to="/chamados" replace /> : <Login />} 
      />

      {/* Rota Protegida de Chamados (Geral) */}
      <Route 
        path="/chamados" 
        element={
          <PrivateRoute>
            <Layout>
              <Chamados />
            </Layout>
          </PrivateRoute>
        } 
      />

      {/* Rota Protegida de Gerenciamento de Usuários (Apenas Supervisor) */}
      <Route 
        path="/usuarios" 
        element={
          <PrivateRoute>
            <SupervisorRoute>
              <Layout>
                <Usuarios />
              </Layout>
            </SupervisorRoute>
          </PrivateRoute>
        } 
      />

      {/* Fallback de redirecionamento */}
      <Route path="*" element={<Navigate to="/chamados" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
