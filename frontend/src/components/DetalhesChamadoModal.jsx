import React from 'react';

export default function DetalhesChamadoModal({
  isOpen,
  onClose,
  ticket,
  user,
  onIniciar,
  onPausar,
  onRetomar,
  onConcluir,
  onHomologar,
  onReabrir,
  onTransbordo,
  onDownloadPDF
}) {
  if (!isOpen || !ticket) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'Crítica': return 'bg-rose-500/10 text-rose-600 border border-rose-500/20';
      case 'Alta': return 'bg-amber-500/10 text-amber-600 border border-amber-500/20';
      case 'Média': return 'bg-sky-500/10 text-sky-600 border border-sky-500/20';
      default: return 'bg-slate-100 text-slate-600 border border-slate-200';
    }
  };

  const getStatusConfig = (status) => {
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

  const statusConfig = getStatusConfig(ticket.status);
  const isSlaExpired = ticket.sla_deadline && new Date(ticket.sla_deadline) < new Date() && ticket.status !== 'Fechado' && ticket.status !== 'Resolvido';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in zoom-in-95 duration-150">
        
        {/* Cabeçalho do Modal */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/20 border border-sky-400/30 rounded-xl">
              <svg className="w-6 h-6 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">{ticket.code}</h2>
                {ticket.is_room_occupied && (
                  <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">
                    Hóspede Ocupado
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Detalhes completos da Ordem de Serviço</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Conteúdo Principal do Chamado */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">

          {/* Badges de Status, Prioridade e Fila */}
          <div className="flex flex-wrap items-center gap-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${statusConfig.style}`}>
              {statusConfig.label}
            </span>
            <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${getPriorityStyle(ticket.priority)}`}>
              Prioridade {ticket.priority}
            </span>
            <span className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold">
              Fila: {ticket.destination_queue}
            </span>
            {ticket.reopen_count > 0 && (
              <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold">
                ⚠️ Reaberto {ticket.reopen_count}x
              </span>
            )}
          </div>

          {/* Informações Principais Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-100 bg-white space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Localização</span>
              <div className="text-base font-bold text-slate-800">{ticket.location_details}</div>
              <span className="text-xs text-slate-400 capitalize font-medium">Tipo: {ticket.location_type}</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-100 bg-white space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Categoria / Subcategoria</span>
              <div className="text-base font-bold text-slate-800">{ticket.subcategory}</div>
              <span className="text-xs text-slate-400 font-medium">Categoria: {ticket.category}</span>
            </div>
          </div>

          {/* Descrição Completa */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Descrição Completa do Problema</h3>
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-medium">
              {ticket.description}
            </div>
          </div>

          {/* Resumo da Solução (Se Houver) */}
          {ticket.resolution_summary && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Resumo da Solução Técnica
              </h3>
              <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-emerald-950 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                {ticket.resolution_summary}
              </div>
            </div>
          )}

          {/* SLA e Cronograma de Datas */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">SLA e Histórico de Prazos</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold block">Prazo SLA</span>
                <span className="font-bold text-slate-800 text-sm">{ticket.sla_duration_hours}h</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold block">Data Limite (Deadline)</span>
                <span className={`font-bold text-xs ${isSlaExpired ? 'text-rose-600' : 'text-slate-800'}`}>
                  {formatDate(ticket.sla_deadline)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold block">Abertura</span>
                <span className="font-bold text-slate-800">{formatDate(ticket.created_at)}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold block">Início Atendimento</span>
                <span className="font-bold text-slate-800">{formatDate(ticket.started_at)}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold block">Resolução</span>
                <span className="font-bold text-slate-800">{formatDate(ticket.resolved_at)}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold block">Fechamento</span>
                <span className="font-bold text-slate-800">{formatDate(ticket.closed_at)}</span>
              </div>
            </div>
          </div>

          {/* Imagem de Evidência (Se Houver) */}
          {ticket.image_url && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Evidência Anexada</h3>
              <div className="relative rounded-xl overflow-hidden border border-slate-200 max-h-64 bg-slate-900">
                <img
                  src={ticket.image_url}
                  alt={`Evidência ${ticket.code}`}
                  className="w-full h-full object-contain max-h-64 mx-auto"
                />
              </div>
            </div>
          )}

        </div>

        {/* Rodapé com Botões de Ação */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => onDownloadPDF(ticket.id, ticket.code)}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Baixar OS em PDF
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {/* AÇÕES DE TÉCNICO / SUPERVISOR */}
            {user && (user.profile === 'Técnico' || user.profile === 'Supervisor') && (
              <>
                {(ticket.status === 'Aberto' || ticket.status === 'Reaberto') && (
                  <button
                    onClick={() => { onClose(); onIniciar(ticket.id); }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-amber-500/20"
                  >
                    Iniciar Atendimento
                  </button>
                )}
                {ticket.status === 'EmAtendimento' && (
                  <>
                    <button
                      onClick={() => { onClose(); onPausar(ticket.id); }}
                      className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-purple-500/20"
                    >
                      Pausar
                    </button>
                    <button
                      onClick={() => { onClose(); onConcluir(ticket.id); }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-indigo-600/20"
                    >
                      Concluir Chamado
                    </button>
                  </>
                )}
                {ticket.status === 'AguardandoPeca' && (
                  <button
                    onClick={() => { onClose(); onRetomar(ticket.id); }}
                    className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-sky-500/20"
                  >
                    Retomar Atendimento
                  </button>
                )}
              </>
            )}

            {/* AÇÕES DE CLIENTE */}
            {user && user.profile === 'Cliente' && ticket.status === 'Resolvido' && (
              <>
                <button
                  onClick={() => { onClose(); onHomologar(ticket.id); }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-emerald-600/20"
                >
                  Homologar / Aprovar
                </button>
                <button
                  onClick={() => { onClose(); onReabrir(ticket.id); }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-rose-600/20"
                >
                  Reabrir Chamado
                </button>
              </>
            )}

            {/* AÇÃO DE TRANSBORDO SUPERVISOR */}
            {user && user.profile === 'Supervisor' && (
              <button
                onClick={() => { onClose(); onTransbordo(ticket.id); }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Transbordo
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
