import React, { useState, useEffect } from 'react';
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

  // Opções dinâmicas carregadas do banco de dados
  const [locationTypes, setLocationTypes] = useState(["Quarto", "Área Comum"]);
  const [commonAreas, setCommonAreas] = useState(["Recepção", "Restaurante", "Corredor", "Estacionamento", "Piscina", "Academia", "Eventos", "Outros"]);
  const [subcategories, setSubcategories] = useState(["Wi-Fi", "Fechadura Eletrônica", "TV / VoIP", "Catraca", "Computador", "Outros"]);

  useEffect(() => {
    if (isOpen) {
      fetchDynamicOptions();
    }
  }, [isOpen]);

  const fetchDynamicOptions = async () => {
    try {
      const data = await api.get('/opcoes');
      if (data.location_types && data.location_types.length > 0) {
        setLocationTypes(data.location_types.map(o => o.name));
      }
      if (data.common_areas && data.common_areas.length > 0) {
        const names = data.common_areas.map(o => o.name);
        setCommonAreas(names);
        if (!names.includes(commonArea)) {
          setCommonArea(names[0]);
        }
      }
      if (data.subcategories && data.subcategories.length > 0) {
        const names = data.subcategories.map(o => o.name);
        setSubcategories(names);
        if (!names.includes(subcategory)) {
          setSubcategory(names[0]);
        }
      }
    } catch (err) {
      console.warn("Erro ao carregar opções dinâmicas. Utilizando padrões.", err);
    }
  };

  if (!isOpen) return null;

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

      // Limpa os campos e fecha
      setRoomNumber('');
      setDescription('');
      setImageFile(null);
      setIsRoomOccupied(false);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao registrar chamado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Modal */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-lg">Abrir Novo Chamado de TI</h2>
              <p className="text-xs text-slate-400">Registre uma ocorrência operacional no hotel.</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-sky-500/50 font-medium"
              >
                {locationTypes.map(lt => (
                  <option key={lt} value={lt}>{lt}</option>
                ))}
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-sky-500/50 font-medium"
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
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-sky-500/50 font-medium"
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
              placeholder="Descreva detalhadamente o problema técnico encontrado..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-sky-500/50 resize-none"
            />
          </div>

          {/* Upload de Imagem */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Foto / Evidência (Opcional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 transition-all cursor-pointer"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:bg-sky-800 text-white text-xs font-bold rounded-xl shadow-md shadow-sky-600/20 transition-all"
            >
              {isLoading ? 'Registrando...' : 'Criar Chamado'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
