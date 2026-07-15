import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ChamadoModal from '../components/ChamadoModal';
import TransbordoModal from '../components/TransbordoModal';

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

  // Ações de Conclusão Técnica
  const [isConcludeOpen, setIsConcludeOpen] = useState(false);
  const [concludeId, setConcludeId] = useState(null);
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [concludeError, setConcludeError] = useState('');
  const [concludeLoading, setConcludeLoading] = useState(false);

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

  const openConcludeModal = (id) => {
    setConcludeId(id);
    setResolutionSummary('');
    setConcludeError('');
    setIsConcludeOpen(true);
  };

  const handleConcluirSubmit = async (e) => {
    e.preventDefault();
    setConcludeError('');

    if (resolutionSummary.trim().length < 10) {
      setConcludeError('O resumo da solução deve ter pelo menos 10 caracteres.');
      return;
    }

    setConcludeLoading(true);
    try {
      await api.post(`/chamados/${concludeId}/concluir`, {
        resolution_summary: resolutionSummary.trim()
      });
      setIsConcludeOpen(false);
      fetchTickets();
    } catch (err) {
      setConcludeError(err.message || 'Erro ao concluir o chamado.');
    } finally {
      setConcludeLoading(false);
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
          { label: 'Tickets Abertos', value: abertosCount, desc: 'Abertos ou Reabertos', progress: 'w-2/3', color: 'bg-blue-600', bgIcon: 'bg-blue-50', icon: (
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )},
          { label: 'Em Atendimento', value: atendimentoCount, desc: 'Técnicos trabalhando', progress: 'w-1/2', color: 'bg-amber-500', bgIcon: 'bg-amber-50', icon: (
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )},
          { label: 'Pausados / Peça', value: pausadosCount, desc: 'Aguardando suprimento', progress: 'w-1/4', color: 'bg-purple-500', bgIcon: 'bg-purple-50', icon: (
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          )},
          { label: 'SLA Cumprido', value: `${slaCompliance}%`, desc: 'Meta de SLA atendida', progress: `w-[${slaCompliance}%]`, color: 'bg-teal-500', bgIcon: 'bg-teal-50', icon: (
            <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          )}
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
                <div className={`h-full ${stat.color} w-3/4 rounded-full`} />
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
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Código</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Localização</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Subcategoria / Descrição</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Prioridade</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Ações</th>
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
                      <tr key={t.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="p-4 text-sm font-bold text-slate-800">
                          {t.code}
                          {t.is_room_occupied && (
                            <span className="ml-1.5 bg-rose-100 text-rose-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase">Ocupado</span>
                          )}
                        </td>
                        <td className="p-4 text-sm text-slate-700">
                          <div className="font-semibold">{t.location_details}</div>
                          <span className="text-[10px] text-slate-400 font-medium capitalize">{t.location_type}</span>
                        </td>
                        <td className="p-4 text-sm text-slate-700 max-w-[240px]">
                          <div className="font-bold text-slate-800">{t.subcategory}</div>
                          <p className="text-xs text-slate-400 truncate mt-0.5" title={t.description}>{t.description}</p>
                        </td>
                        <td className="p-4 text-sm">
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${getPriorityStyle(t.priority)}`}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase ${statusConfig.style}`}>
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="p-4 text-sm space-x-1.5 flex items-center h-16">
                          {/* AÇÕES DE TÉCNICO E SUPERVISOR */}
                          {user && (user.profile === 'Técnico' || user.profile === 'Supervisor') && (
                            <>
                              {(t.status === 'Aberto' || t.status === 'Reaberto') && (
                                <button
                                  onClick={() => handleIniciar(t.id)}
                                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold shadow-md shadow-amber-500/10 transition-colors"
                                >
                                  Iniciar
                                </button>
                              )}
                              {t.status === 'EmAtendimento' && (
                                <>
                                  <button
                                    onClick={() => handlePausar(t.id)}
                                    className="px-2.5 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-[10px] font-bold shadow-md shadow-purple-500/10 transition-colors"
                                  >
                                    Pausar
                                  </button>
                                  <button
                                    onClick={() => openConcludeModal(t.id)}
                                    className="px-2.5 py-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-[10px] font-bold shadow-md shadow-indigo-500/10 transition-colors"
                                  >
                                    Concluir
                                  </button>
                                </>
                              )}
                              {t.status === 'AguardandoPeca' && (
                                <button
                                  onClick={() => handleRetomar(t.id)}
                                  className="px-2.5 py-1 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-[10px] font-bold shadow-md shadow-sky-500/10 transition-colors"
                                >
                                  Retomar
                                </button>
                              )}
                            </>
                          )}

                          {/* AÇÕES EXCLUSIVAS DE CLIENTE */}
                          {user && user.profile === 'Cliente' && t.status === 'Resolvido' && (
                            <>
                              <button
                                onClick={() => handleHomologar(t.id)}
                                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold shadow-md shadow-emerald-500/10 transition-colors"
                              >
                                Homologar
                              </button>
                              <button
                                onClick={() => handleReabrir(t.id)}
                                className="px-2.5 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[10px] font-bold shadow-md shadow-rose-500/10 transition-colors"
                              >
                                Reabrir
                              </button>
                            </>
                          )}

                          {/* AÇÕES DE SUPERVISOR */}
                          {user && user.profile === 'Supervisor' && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedTicketId(t.id);
                                  setIsTransbordoOpen(true);
                                }}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[10px] font-bold transition-colors"
                              >
                                Transbordo
                              </button>
                            </>
                          )}

                          {/* DOWNLOAD DA OS */}
                          <button
                            onClick={() => handleDownloadPDF(t.id, t.code)}
                            title="Baixar PDF da OS"
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
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
                <div className={`h-full bg-teal-500 rounded-full w-[${slaCompliance}%]`} />
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
                  <div key={t.id} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 h-24 cursor-pointer">
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

      {/* MODAL: CONCLUIR CHAMADO (TÉCNICO / RESOLUÇÃO SUMMARY) */}
      {isConcludeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-800 text-lg">Solução do Chamado</h2>
              <button onClick={() => setIsConcludeOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleConcluirSubmit} className="p-6 space-y-4">
              {concludeError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold rounded-xl">
                  {concludeError}
                </div>
              )}
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Resumo da Solução Técnica</label>
                <textarea
                  required
                  rows="4"
                  placeholder="Descreva detalhadamente qual foi o diagnóstico e a solução adotada..."
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-sky-500/50 resize-none"
                />
              </div>
              
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsConcludeOpen(false)}
                  disabled={concludeLoading}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={concludeLoading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-600/10 transition-colors"
                >
                  {concludeLoading ? 'Concluindo...' : 'Confirmar Conclusão'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
