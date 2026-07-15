import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';

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

// Layout com barra lateral compartilhada
const Layout = ({ children }) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
};

// Placeholder para a página de Chamados (será conectada na Onda 5)
const ChamadosPage = () => {
  const { user } = useAuth();
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Painel de Chamados</h1>
          <p className="text-slate-500 text-sm">Gerencie ordens de serviço e atendimentos de TI.</p>
        </div>
        {user?.profile === 'Cliente' && (
          <button className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-sky-600/10 transition-all">
            Abrir Novo Chamado
          </button>
        )}
      </div>

      {/* Estatísticas base mockadas para o WOW design */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Abertos', value: 0, color: 'bg-amber-500' },
          { label: 'Em Atendimento', value: 0, color: 'bg-blue-500' },
          { label: 'Aguardando Peça', value: 0, color: 'bg-purple-500' },
          { label: 'Resolvidos/Fechados', value: 0, color: 'bg-emerald-500' }
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className={`w-3 h-12 rounded-full ${stat.color}`} />
            <div>
              <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</div>
              <div className="text-3xl font-bold text-slate-800 mt-1">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Estado vazio premium */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-sm">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400 mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">Nenhum chamado encontrado</h3>
        <p className="text-slate-500 text-sm max-w-sm mx-auto">Não há registros cadastrados na fila de atendimento da Tecnologia neste momento.</p>
      </div>
    </div>
  );
};

// Placeholder para a página de Usuários (será conectada na Onda 5)
const UsuariosPage = () => {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gerenciamento de Usuários</h1>
          <p className="text-slate-500 text-sm">Cadastre e configure credenciais de acesso corporativo.</p>
        </div>
        <button className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-sky-600/10 transition-all">
          Cadastrar Usuário
        </button>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <span className="font-bold text-slate-800">Membros da Equipe</span>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">Carregando...</span>
        </div>
        <div className="p-12 text-center text-slate-400">
          Nenhum usuário carregado. A listagem estará conectada na Onda 5.
        </div>
      </div>
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
              <ChamadosPage />
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
                <UsuariosPage />
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
