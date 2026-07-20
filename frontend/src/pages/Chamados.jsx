import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ChamadoModal from '../components/ChamadoModal';
import TransbordoModal from '../components/TransbordoModal';
import DetalhesChamadoModal from '../components/DetalhesChamadoModal';
import ConcluirChamadoModal from '../components/ConcluirChamadoModal';

export default function Chamados() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtros e Buscas
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('Todos');

  // Modais e Estados Auxiliares
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTransbordoOpen, setIsTransbordoOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  // Modal de Detalhes do Chamado (Pop-up)
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedDetailTicket, setSelectedDetailTicket] = useState(null);

  const handleOpenDetailModal = (ticket) => {
    setSelectedDetailTicket(ticket);
    setIsDetailOpen(true);
  };

  // Modal de Conclusão Técnica / Finalização do Chamado
  const [isConcludeOpen, setIsConcludeOpen] = useState(false);
  const [selectedConcludeTicket, setSelectedConcludeTicket] = useState(null);

  const openConcludeModal = (ticketOrId) => {
    const targetTicket = typeof ticketOrId === 'object' 
      ? ticketOrId 
      : tickets.find(t => t.id === ticketOrId);
    setSelectedConcludeTicket(targetTicket);
    setIsConcludeOpen(true);
  };

  // Busca chamados do backend
  const fetchTickets = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await api.get('/chamados');
      setTickets(data);
    } catch (err) {
      setError(err.message || 'Erro ao carregar chamados.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // Transições de Ciclo de Vida do Chamado
  const handleIniciar = async (id) => {
    try {
      await api.post(`/chamados/${id}/iniciar`);
      fetchTickets();
    } catch (err) {
      alert(err.message);
    }
  };

  const handlePausar = async (id) => {
    try {
      await api.post(`/chamados/${id}/pausar`);
      fetchTickets();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRetomar = async (id) => {
    try {
      await api.post(`/chamados/${id}/retomar`);
      fetchTickets();
    } catch (err) {
      alert(err.message);
    }
  };



  const handleHomologar = async (id) => {
    if (!window.confirm('Tem certeza de que deseja homologar a solução e fechar a Ordem de Serviço?')) return;
    try {
      await api.post(`/chamados/${id}/homologar`);
      fetchTickets();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReabrir = async (id) => {
    if (!window.confirm('O problema persistiu? Deseja reabrir este chamado para novo atendimento?')) return;
    try {
      await api.post(`/chamados/${id}/reabrir`);
      fetchTickets();
    } catch (err) {
      alert(err.message);
    }
  };

  // Download do PDF da OS
  const handleDownloadPDF = async (id, code) => {
    try {
      const blob = await api.get(`/chamados/${id}/os/download`);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `OS_${code}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert('Erro ao baixar PDF da Ordem de Serviço.');
    }
  };

  // Cálculo das estatísticas dinâmicas
  const abertosCount = tickets.filter(t => t.status === 'Aberto' || t.status === 'Reaberto').length;
  const atendimentoCount = tickets.filter(t => t.status === 'EmAtendimento').length;
  const pausadosCount = tickets.filter(t => t.status === 'AguardandoPeca').length;
  const resolvidosCount = tickets.filter(t => t.status === 'Resolvido' || t.status === 'Fechado').length;

  const totalSlaCalculable = tickets.filter(t => t.sla_deadline).length;
  const expiredSla = tickets.filter(t => t.sla_deadline && new Date(t.sla_deadline) < new Date() && t.status !== 'Fechado' && t.status !== 'Resolvido').length;
  const slaCompliance = totalSlaCalculable > 0 ? (((totalSlaCalculable - expiredSla) / totalSlaCalculable) * 100).toFixed(1) : '100';

  // Filtros Locais
  const filteredTickets = tickets.filter(t => {
    const matchesSearch = 
      t.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.location_details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.subcategory.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPriority = selectedPriority === 'Todos' || t.priority === selectedPriority;

    return matchesSearch && matchesPriority;
  });

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'Crítica': return 'bg-rose-500/10 text-rose-600 border border-rose-500/20';
      case 'Alta': return 'bg-amber-500/10 text-amber-600 border border-amber-500/20';
      case 'Média': return 'bg-sky-500/10 text-sky-600 border border-sky-500/20';
      default: return 'bg-slate-100 text-slate-600 border border-slate-200';
    }
  };

  const getStatusLabelAndStyle = (status) => {
    switch (status) {
      case 'Aberto': return { label: 'Aberto', style: 'bg-red-500 text-white' };
      case 'EmAtendimento': return { label: 'Em Atendimento', style: 'bg-amber-500 text-white' };
      case 'AguardandoPeca': return { label: 'Pausado / Aguardando Peça', style: 'bg-purple-500 text-white' };
      case 'Resolvido': return { label: 'Resolvido', style: 'bg-indigo-500 text-white' };
      case 'Fechado': return { label: 'Fechado / Homologado', style: 'bg-emerald-500 text-white' };
      case 'Reaberto': return { label: 'Reaberto', style: 'bg-red-600 text-white' };
      default: return { label: status, style: 'bg-slate-400 text-white' };
    }
  };

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Painel de Chamados</h1>
          <p className="text-slate-500 text-sm">Gerencie ordens de serviço e atendimentos de TI.</p>
        </div>
        {user?.profile === 'Cliente' && (
          <button 
            onClick={() => setIsCreateOpen(true)}
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-sky-600/15 hover:shadow-sky-600/25 transition-all"
          >
            Abrir Novo Chamado
          </button>
        )}
      </div>

      {/* Grid de Estatísticas Dinâmico */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { 
            label: 'Tickets Abertos', 
            value: abertosCount, 
            desc: 'Abertos ou Reabertos', 
            percent: tickets.length > 0 ? Math.min(100, (abertosCount / tickets.length) * 100) : 0, 
            color: 'bg-blue-600', 
            bgIcon: 'bg-blue-50', 
            icon: (
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )
          },
          { 
            label: 'Em Atendimento', 
            value: atendimentoCount, 
            desc: 'Técnicos trabalhando', 
            percent: tickets.length > 0 ? Math.min(100, (atendimentoCount / tickets.length) * 100) : 0, 
            color: 'bg-amber-500', 
            bgIcon: 'bg-amber-50', 
            icon: (
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )
          },
          { 
            label: 'Pausados / Peça', 
            value: pausadosCount, 
            desc: 'Aguardando suprimento', 
            percent: tickets.length > 0 ? Math.min(100, (pausadosCount / tickets.length) * 100) : 0, 
            color: 'bg-purple-500', 
            bgIcon: 'bg-purple-50', 
            icon: (
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            )
          },
          { 
            label: 'SLA Cumprido', 
            value: `${slaCompliance}%`, 
            desc: 'Meta de SLA atendida', 
            percent: parseFloat(slaCompliance) || 100, 
            color: 'bg-teal-500', 
            bgIcon: 'bg-teal-50', 
            icon: (
              <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            )
          }
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
                <div className={`h-full ${stat.color} rounded-full transition-all duration-500`} style={{ width: `${stat.percent}%` }} />
              </div>
              <span className="text-xs text-slate-400 font-medium">{stat.desc}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Grid Principal Dividido */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Chamados */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          {/* Header & Filtro de Busca */}
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="font-bold text-slate-800 text-lg">Chamados Registrados ({filteredTickets.length})</h2>
            <div className="flex gap-2">
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 focus:outline-none focus:border-sky-500/50"
              >
                <option value="Todos">Todas Prioridades</option>
                <option value="Crítica">Crítica</option>
                <option value="Alta">Alta</option>
                <option value="Média">Média</option>
                <option value="Baixa">Baixa</option>
              </select>
              <div className="relative w-full sm:w-60">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Código, quarto, subcategoria..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500/50 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Tabela de Tickets */}
          <div className="overflow-x-auto scrollbar-none">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-3.5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Código</th>
                  <th className="px-3.5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Localização</th>
                  <th className="px-3.5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Subcategoria / Descrição</th>
                  <th className="px-3.5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Prioridade</th>
                  <th className="px-3.5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-3.5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="p-12 text-center text-slate-400 text-sm">
                      Carregando chamados...
                    </td>
                  </tr>
                ) : filteredTickets.length > 0 ? (
                  filteredTickets.map((t) => {
                    const statusConfig = getStatusLabelAndStyle(t.status);
                    return (
                      <tr 
                        key={t.id} 
                        onClick={() => handleOpenDetailModal(t)}
                        className="hover:bg-sky-50/30 transition-colors cursor-pointer group"
                      >
                        <td className="px-3.5 py-3.5 text-sm font-bold text-slate-800 align-middle">
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <span className="group-hover:text-sky-600 transition-colors underline decoration-sky-400/0 group-hover:decoration-sky-400">
                              {t.code}
                            </span>
                            {t.is_room_occupied && (
                              <span className="bg-rose-100 text-rose-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase whitespace-nowrap">Ocupado</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3.5 py-3.5 text-sm text-slate-700 align-middle">
                          <div className="font-semibold whitespace-nowrap">{t.location_details}</div>
                          <span className="text-[10px] text-slate-400 font-medium capitalize block">{t.location_type}</span>
                        </td>
                        <td className="px-3.5 py-3.5 text-sm text-slate-700 max-w-[200px] align-middle">
                          <div className="font-bold text-slate-800 truncate">{t.subcategory}</div>
                          <p className="text-xs text-slate-400 truncate mt-0.5" title={t.description}>{t.description}</p>
                        </td>
                        <td className="px-3.5 py-3.5 text-sm align-middle">
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold whitespace-nowrap inline-flex items-center justify-center ${getPriorityStyle(t.priority)}`}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="px-3.5 py-3.5 align-middle">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide whitespace-nowrap inline-flex items-center justify-center ${statusConfig.style}`}>
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-3.5 py-3.5 text-right align-middle">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetailModal(t);
                            }}
                            title="Ver detalhes completos do chamado"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200/80 rounded-xl text-xs font-bold transition-all shadow-sm whitespace-nowrap"
                          >
                            <svg className="w-3.5 h-3.5 text-sky-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Ver Detalhes
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="p-12 text-center text-slate-400 text-sm">
                      Nenhum chamado encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar com SLA e Imagens */}
        <div className="space-y-6">
          {/* Card de SLAs */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-lg">Cumprimento de SLA</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">SLA Geral de TI</span>
                <span className="text-slate-800 font-bold">{slaCompliance}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-teal-500 rounded-full transition-all duration-500" style={{ width: `${slaCompliance}%` }} />
              </div>
              <span className="text-xs text-slate-400 block font-semibold leading-relaxed">
                Reflete a proporção de chamados de TI concluídos ou em andamento dentro do prazo limite (2 horas para prioridade crítica e alta, 24 horas para média/baixa).
              </span>
            </div>
          </div>

          {/* Chamados com Imagens */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-lg">Evidências e Imagens</h3>
            <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
              {tickets.filter(t => t.image_url).length > 0 ? (
                tickets.filter(t => t.image_url).map(t => (
                  <div 
                    key={t.id} 
                    onClick={() => handleOpenDetailModal(t)}
                    className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 h-24 cursor-pointer"
                  >
                    <img 
                      src={t.image_url} 
                      alt={`Evidência ${t.code}`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-2">
                      <span className="text-[10px] font-bold text-white tracking-wider">{t.code}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-8 text-xs text-slate-400 font-medium">
                  Nenhuma imagem carregada no momento.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: ABERTURA DE CHAMADO (CLIENTE) */}
      <ChamadoModal 
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchTickets}
      />

      {/* MODAL: TRANSBORDO (SUPERVISOR) */}
      <TransbordoModal
        isOpen={isTransbordoOpen}
        onClose={() => {
          setIsTransbordoOpen(false);
          setSelectedTicketId(null);
        }}
        ticketId={selectedTicketId}
        onSuccess={fetchTickets}
      />

      {/* MODAL: DETALHES COMPLETOS DO CHAMADO (POPUP) */}
      <DetalhesChamadoModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedDetailTicket(null);
        }}
        ticket={selectedDetailTicket}
        user={user}
        onIniciar={handleIniciar}
        onPausar={handlePausar}
        onRetomar={handleRetomar}
        onConcluir={openConcludeModal}
        onHomologar={handleHomologar}
        onReabrir={handleReabrir}
        onTransbordo={(id) => {
          setSelectedTicketId(id);
          setIsTransbordoOpen(true);
        }}
        onDownloadPDF={handleDownloadPDF}
      />

      {/* MODAL: CONCLUIR CHAMADO (TÉCNICO / RESOLUÇÃO SUMMARY & FOTO) */}
      <ConcluirChamadoModal
        isOpen={isConcludeOpen}
        onClose={() => {
          setIsConcludeOpen(false);
          setSelectedConcludeTicket(null);
        }}
        ticket={selectedConcludeTicket}
        onSuccess={fetchTickets}
      />

    </div>
  );
}
