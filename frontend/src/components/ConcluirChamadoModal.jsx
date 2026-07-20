import React, { useState } from 'react';
import { api } from '../services/api';

export default function ConcluirChamadoModal({ isOpen, onClose, ticket, onSuccess }) {
  if (!isOpen || !ticket) return null;

  const [resolutionSummary, setResolutionSummary] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (resolutionSummary.trim().length < 10) {
      setError('Descreva a solução técnica com pelo menos 10 caracteres.');
      return;
    }

    setIsLoading(true);
    try {
      let imageUrl = null;

      // Se houver anexo de foto de solução, converte para base64/data URL para salvamento no backend
      if (imageFile && imagePreview) {
        imageUrl = imagePreview;
      }

      await api.post(`/chamados/${ticket.id}/concluir`, {
        resolution_summary: resolutionSummary.trim(),
        image_url: imageUrl
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao finalizar o chamado.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Cabeçalho */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 border border-emerald-400/30 rounded-xl">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Finalização da Ordem de Serviço</h2>
              <p className="text-xs text-slate-400">{ticket.code} • {ticket.location_details}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Card Resumo do Chamado */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Problema Relatado</span>
            <div className="text-sm font-bold text-slate-800">{ticket.subcategory}</div>
            <p className="text-xs text-slate-500 truncate">{ticket.description}</p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold rounded-xl">
              {error}
            </div>
          )}

          {/* Campo Texto de Finalização */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Observações e Resumo da Solução Técnica *
            </label>
            <textarea
              required
              rows="4"
              placeholder="Escreva detalhadamente o diagnóstico, a causa raiz do problema, peças substituídas ou os procedimentos realizados..."
              value={resolutionSummary}
              onChange={(e) => setResolutionSummary(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500/50 resize-none font-medium transition-all"
            />
          </div>

          {/* Campo Anexo de Foto da Solução (Opcional) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Comprovante Visual / Foto da Solução (Opcional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
            />

            {imagePreview && (
              <div className="mt-3 relative rounded-xl overflow-hidden border border-slate-200 h-32 bg-slate-900">
                <img src={imagePreview} alt="Preview da solução" className="w-full h-full object-contain mx-auto" />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute top-2 right-2 bg-slate-900/80 text-white p-1 rounded-full text-xs hover:bg-rose-600 transition-colors"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Botões do Rodapé */}
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
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
            >
              {isLoading ? 'Concluindo...' : 'Confirmar e Finalizar'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
