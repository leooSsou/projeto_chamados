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

// Componente do Painel de Chamados reformulado (Design de Alta Fidelidade)
const ChamadosPage = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  // Dados mockados de alta fidelidade para demonstrar o visual reformulado
  const ticketsMock = [
    { id: 'T1034', assunto: 'Wi-Fi instável no quarto', local: 'Qto 412', solicitante: 'Ana Souza', prioridade: 'Alta', status: 'ABERTO', criado: '15/07 07:03', avatar: 'AS' },
    { id: 'T1033', assunto: 'TV sem sinal / VoIP mudo', local: 'Qto 205', solicitante: 'Carlos Lima', prioridade: 'Média', status: 'EM ATENDIMENTO', criado: '15/07 17:47', avatar: 'CL' },
    { id: 'T1032', assunto: 'Impressora Recepção travada', local: 'Recepção', solicitante: 'Julia Costa', prioridade: 'Baixa', status: 'RESOLVIDO', criado: '14/07 18:43', avatar: 'JC' },
    { id: 'T1031', assunto: 'Telefone mudo / sem linha', local: 'Qto 118', solicitante: 'Marcos Silva', prioridade: 'Média', status: 'EM ATENDIMENTO', criado: '14/07 19:36', avatar: 'MS' },
    { id: 'T1030', assunto: 'Acesso PMV falhou no terminal', local: 'Recepção', solicitante: 'Roberto Cruz', prioridade: 'Crítica', status: 'ABERTO', criado: '14/07 09:43', avatar: 'RC' }
  ];

  const filteredTickets = ticketsMock.filter(t => 
    t.assunto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.local.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.solicitante.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'Crítica': return 'bg-rose-500/10 text-rose-600 border border-rose-500/20';
      case 'Alta': return 'bg-amber-500/10 text-amber-600 border border-amber-500/20';
      case 'Média': return 'bg-sky-500/10 text-sky-600 border border-sky-500/20';
      default: return 'bg-slate-100 text-slate-600 border border-slate-200';
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'ABERTO': return 'bg-red-500 text-white font-bold text-[10px] tracking-wider';
      case 'EM ATENDIMENTO': return 'bg-amber-500 text-white font-bold text-[10px] tracking-wider';
      case 'RESOLVIDO': return 'bg-emerald-500 text-white font-bold text-[10px] tracking-wider';
      default: return 'bg-slate-400 text-white font-bold text-[10px] tracking-wider';
    }
  };

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard de TI</h1>
          <p className="text-slate-500 text-sm">Controle de chamados de suporte técnico do Grand Hotel.</p>
        </div>
        {user?.profile === 'Cliente' && (
          <button className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-sky-600/15 hover:shadow-sky-600/25 transition-all">
            Abrir Novo Chamado
          </button>
        )}
      </div>

      {/* Grid de Estatísticas Reformulado */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Tickets Abertos', value: '84', desc: 'Total de chamados pendentes', progress: 'w-2/3', color: 'bg-blue-600', icon: (
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ), bgIcon: 'bg-blue-50' },
          { label: 'Em Atendimento', value: '32', desc: 'Técnicos trabalhando', progress: 'w-1/2', color: 'bg-amber-500', icon: (
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ), bgIcon: 'bg-amber-50' },
          { label: 'Resolvidos Hoje', value: '115', desc: 'Concluídos nas últimas 24h', progress: 'w-4/5', color: 'bg-emerald-500', icon: (
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          ), bgIcon: 'bg-emerald-50' },
          { label: 'SLA Cumprido', value: '98.2%', desc: 'Meta mensal de atendimento', progress: 'w-[98%]', color: 'bg-teal-500', icon: (
            <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          ), bgIcon: 'bg-teal-50' }
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between h-36">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</span>
                <div className="text-3xl font-bold text-slate-800 mt-1">{stat.value}</div>
              </div>
              <div className={`p-2 rounded-xl ${stat.bgIcon}`}>
                {stat.icon}
              </div>
            </div>
            <div className="space-y-2 mt-4">
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${stat.color} ${stat.progress} rounded-full`} />
              </div>
              <span className="text-xs text-slate-400 font-medium">{stat.desc}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Grid Principal Dividido */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel da Esquerda: Fila de Tickets */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          {/* Header & Filtro de Busca */}
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="font-bold text-slate-800 text-lg">Lista de Tickets</h2>
            <div className="relative w-full sm:w-72">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Buscar por ticket, quarto, hóspede..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500/50 transition-all"
              />
            </div>
          </div>

          {/* Tabela de Tickets */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">ID</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Assunto</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Local</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Solicitante</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Prioridade</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Criado em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTickets.length > 0 ? (
                  filteredTickets.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-4 text-sm font-semibold text-slate-800">{t.id}</td>
                      <td className="p-4 text-sm text-slate-700 font-medium truncate max-w-[200px]">{t.assunto}</td>
                      <td className="p-4 text-sm text-slate-600 font-semibold">{t.local}</td>
                      <td className="p-4 text-sm text-slate-600 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 flex items-center justify-center border border-slate-200">
                          {t.avatar}
                        </div>
                        <span>{t.solicitante}</span>
                      </td>
                      <td className="p-4 text-sm">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${getPriorityStyle(t.prioridade)}`}>
                          {t.prioridade}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1.5 rounded-lg text-[9px] font-extrabold uppercase ${getStatusStyle(t.status)}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-400 font-medium">{t.criado}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="p-12 text-center text-slate-400 text-sm">
                      Nenhum ticket encontrado para esta busca.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Painel da Direita: Métricas SLA e Tendência de Volume */}
        <div className="flex flex-col gap-6">
          {/* Card: Status do SLA */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
            <h2 className="font-bold text-slate-800 text-lg">Status SLA Ativos</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-slate-600 font-medium">Tempo de Resposta</span>
                  <span className="text-slate-800 font-bold">98% <span className="text-xs text-slate-400 font-medium">[Meta 95%]</span></span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 w-[98%] rounded-full" />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-slate-600 font-medium">Tempo de Solução</span>
                  <span className="text-slate-800 font-bold">96% <span className="text-xs text-slate-400 font-medium">[Meta 90%]</span></span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 w-[96%] rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Card: Tendência de Tickets (SVG Line Chart) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between flex-1">
            <div>
              <h2 className="font-bold text-slate-800 text-lg">Tendência de Tickets</h2>
              <span className="text-xs text-slate-400 font-medium">Volume de chamados nos últimos 7 dias</span>
            </div>

            {/* Gráfico de Linha em SVG Responsivo */}
            <div className="h-36 w-full mt-4 flex items-end relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 50" preserveAspectRatio="none">
                {/* Linhas de Grade Horizontal */}
                <line x1="0" y1="12.5" x2="100" y2="12.5" stroke="#f1f5f9" strokeWidth="0.5" />
                <line x1="0" y1="25" x2="100" y2="25" stroke="#f1f5f9" strokeWidth="0.5" />
                <line x1="0" y1="37.5" x2="100" y2="37.5" stroke="#f1f5f9" strokeWidth="0.5" />
                
                {/* Preenchimento de Área (Gradient Mock) */}
                <path
                  d="M0 50 L0 35 Q15 25 30 30 T60 10 T90 20 L100 25 L100 50 Z"
                  fill="url(#gradient)"
                  opacity="0.15"
                />
                
                {/* Linha do Gráfico */}
                <path
                  d="M0 35 Q15 25 30 30 T60 10 T90 20 L100 25"
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                
                {/* Definições de Gradiente */}
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#0ea5e9" />
                    <stop offset="100%" stopColor="#ffffff" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            
            {/* Legendas dos Dias */}
            <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-2 pt-2 border-t border-slate-100">
              <span>09 Set</span>
              <span>11 Set</span>
              <span>13 Set</span>
              <span>15 Set (Hoje)</span>
            </div>
          </div>
        </div>
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
