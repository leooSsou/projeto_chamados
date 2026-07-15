import React, { useState } from 'react';
import { api } from '../services/api';

export default function ChamadoModal({ isOpen, onClose, onSuccess }) {
  const [locationType, setLocationType] = useState('Quarto');
  const [roomNumber, setRoomNumber] = useState('');
  const [commonArea, setCommonArea] = useState('Recepção');
  const [isRoomOccupied, setIsRoomOccupied] = useState(false);
  const [subcategory, setSubcategory] = useState('Wi-Fi');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const subcategories = ["Wi-Fi", "Fechadura Eletrônica", "TV / VoIP", "Catraca", "Computador", "Outros"];
  const commonAreas = ["Recepção", "Restaurante", "Corredor", "Estacionamento", "Piscina", "Academia", "Eventos", "Outros"];

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      let imageUrl = null;

      // 1. Faz o upload da foto se houver arquivo
      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);

        const uploadRes = await api.post('/chamados/upload', formData);
        imageUrl = uploadRes.image_url;
      }

      // 2. Monta o payload do chamado
      const locationDetails = locationType === 'Quarto' ? roomNumber.trim() : commonArea;
      if (locationType === 'Quarto' && !locationDetails) {
        throw new Error('Por favor, informe o número do quarto.');
      }

      const ticketPayload = {
        location_type: locationType,
        location_details: locationDetails,
        is_room_occupied: locationType === 'Quarto' ? isRoomOccupied : false,
        category: 'Tecnologia',
        subcategory,
        description: description.trim(),
        image_url: imageUrl
      };

      // 3. Salva o chamado no backend
      await api.post('/chamados', ticketPayload);

      // Limpa formulário
      setRoomNumber('');
      setCommonArea('Recepção');
      setIsRoomOccupied(false);
      setSubcategory('Wi-Fi');
      setDescription('');
      setImageFile(null);

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao abrir o chamado.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 text-lg">Abrir Novo Chamado de TI</h2>
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

          {/* Tipo de Local Cascade */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tipo de Local</label>
              <select
                value={locationType}
                onChange={(e) => setLocationType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-sky-500/50"
              >
                <option value="Quarto">Quarto</option>
                <option value="Área Comum">Área Comum</option>
              </select>
            </div>

            {locationType === 'Quarto' ? (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Número do Quarto</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 205"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-sky-500/50"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Selecione o Local</label>
                <select
                  value={commonArea}
                  onChange={(e) => setCommonArea(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-sky-500/50"
                >
                  {commonAreas.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Se for Quarto, pergunta se está ocupado para a regra de SLA */}
          {locationType === 'Quarto' && (
            <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <input
                type="checkbox"
                id="isOccupied"
                checked={isRoomOccupied}
                onChange={(e) => setIsRoomOccupied(e.target.checked)}
                className="w-4 h-4 text-sky-600 border-slate-300 rounded focus:ring-sky-500"
              />
              <label htmlFor="isOccupied" className="text-xs font-semibold text-slate-600 cursor-pointer select-none">
                Quarto ocupado por hóspede? (Impacta a prioridade do chamado)
              </label>
            </div>
          )}

          {/* Subcategoria */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Subcategoria do Problema</label>
            <select
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-sky-500/50"
            >
              {subcategories.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Descrição da Ocorrência</label>
            <textarea
              required
              rows="3"
              placeholder="Descreva detalhadamente o problema técnico..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-sky-500/50 resize-none"
            />
          </div>

          {/* Foto de Evidência */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Foto / Imagem de Evidência (Opcional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-600 hover:file:bg-slate-200 file:cursor-pointer cursor-pointer"
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
              {isLoading ? 'Abrindo Chamado...' : 'Confirmar Abertura'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
