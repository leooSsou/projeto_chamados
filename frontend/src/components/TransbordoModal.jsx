import React, { useState } from 'react';
import { api } from '../services/api';

export default function TransbordoModal({ isOpen, onClose, ticketId, onSuccess }) {
  const [targetQueue, setTargetQueue] = useState('Manutenção');
  const [justification, setJustification] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !ticketId) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (justification.trim().length < 10) {
      setError('A justificativa deve ter pelo menos 10 caracteres.');
      return;
    }

    setIsLoading(true);

    try {
      await api.post(`/chamados/${ticketId}/transferir`, {
        target_queue: targetQueue,
        justification: justification.trim()
      });

      setJustification('');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao realizar o transbordo do chamado.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 text-lg">Transbordo de Chamado</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-semibold flex items-center gap-2">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          {/* Fila Destino */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Fila de Destino</label>
            <select
              value={targetQueue}
              onChange={(e) => setTargetQueue(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-sky-500/50"
            >
              <option value="Manutenção">Manutenção</option>
              <option value="TI">TI (Tecnologia)</option>
            </select>
          </div>

          {/* Justificativa */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Justificativa Técnica</label>
            <textarea
              required
              rows="4"
              placeholder="Descreva o motivo da transferência de setor para auditoria..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-sky-500/50 resize-none"
            />
          </div>

          {/* Footer Ações */}
          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:bg-sky-800 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold shadow-lg shadow-sky-600/10 transition-colors"
            >
              {isLoading ? 'Transferindo...' : 'Confirmar Transferência'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
