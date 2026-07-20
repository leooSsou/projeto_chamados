import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function Gestao() {
  const [kpis, setKpis] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchKpis = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await api.get('/gestao/kpis');
      setKpis(data);
    } catch (err) {
      setError(err.message || 'Erro ao carregar indicadores de gestão.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKpis();
  }, []);

  const handleExportCSV = () => {
    if (!kpis) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Métrica,Valor\n";
    csvContent += `Total de Chamados,${kpis.total_chamados}\n`;
    csvContent += `Compliance de SLA (%),${kpis.cumprimento_sla_percent}%\n`;
    csvContent += `MTTR Médio (Horas),${kpis.mttr_medio_horas}h\n`;
    csvContent += `Chamados Críticos em Quartos Ocupados,${kpis.chamados_criticos_ocupados}\n`;
    csvContent += `Taxa de Reabertura (%),${kpis.taxa_reabertura_percent}%\n\n`;

    csvContent += "Desempenho da Equipe Técnica\n";
    csvContent += "Nome,Username,Perfil,Total Atribuídos,Concluídos,MTTR Médio (h)\n";
    kpis.desempenho_tecnicos.forEach(t => {
      csvContent += `"${t.nome}","${t.username}","${t.perfil}",${t.total_atribuidos},${t.concluidos},${t.mttr_medio_horas}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Relatorio_Gestao_TI_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-400 text-sm">
        Carregando painel analítico de gestão...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold rounded-2xl">
        {error}
      </div>
    );
  }

  const isSlaTargetMet = kpis?.cumprimento_sla_percent >= 90.0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">Painel de Gestão & KPIs</h1>
            <span className="bg-purple-100 text-purple-700 border border-purple-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg uppercase tracking-wider">
              Alta Gerência
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">Acompanhamento em tempo real de nível de serviço (SLA), MTTR e produtividade da TI.</p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-lg shadow-slate-900/10 transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Exportar Relatório CSV
        </button>
      </div>

      {/* Grid de 4 Cartões Executivos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* 1. SLA Global */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cumprimento de SLA</span>
              <div className={`text-3xl font-extrabold mt-1 ${isSlaTargetMet ? 'text-emerald-600' : 'text-rose-600'}`}>
                {kpis.cumprimento_sla_percent}%
              </div>
            </div>
            <div className={`p-2.5 rounded-xl ${isSlaTargetMet ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${isSlaTargetMet ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                style={{ width: `${kpis.cumprimento_sla_percent}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-400 font-semibold block">Meta de SLA: ≥ 90.0%</span>
          </div>
        </div>

        {/* 2. MTTR Médio */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">MTTR (Tempo Resolução)</span>
              <div className="text-3xl font-extrabold text-slate-800 mt-1">
                {kpis.mttr_medio_horas}h
              </div>
            </div>
            <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 font-semibold">Tempo médio líquido até a solução</p>
        </div>

        {/* 3. Chamados em Quartos Ocupados */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hóspedes Afetados</span>
              <div className="text-3xl font-extrabold text-slate-800 mt-1">
                {kpis.chamados_criticos_ocupados}
              </div>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 font-semibold">Chamados em UHs com hóspede presente</p>
        </div>

        {/* 4. Taxa de Reabertura */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Taxa de Retrabalho</span>
              <div className="text-3xl font-extrabold text-slate-800 mt-1">
                {kpis.taxa_reabertura_percent}%
              </div>
            </div>
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 font-semibold">Percentual de chamados reabertos</p>
        </div>

      </div>

      {/* Grid Principal: Produtividade e Causa Raiz */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Tabela de Produtividade dos Técnicos */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100">
            <h2 className="font-bold text-slate-800 text-lg">Produtividade da Equipe de TI</h2>
            <p className="text-xs text-slate-400 mt-0.5">Desempenho individual por técnico e supervisor.</p>
          </div>

          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Técnico</th>
                  <th className="px-4 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Perfil</th>
                  <th className="px-4 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Atribuídos</th>
                  <th className="px-4 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Concluídos</th>
                  <th className="px-4 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">MTTR Médio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {kpis.desempenho_tecnicos.length > 0 ? (
                  kpis.desempenho_tecnicos.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-4 text-sm font-bold text-slate-800">
                        <div>{t.nome}</div>
                        <span className="text-[10px] text-slate-400 font-normal">{t.username}</span>
                      </td>
                      <td className="px-4 py-4 text-xs font-semibold text-slate-600">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                          {t.perfil}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm font-bold text-slate-800 text-center">
                        {t.total_atribuidos}
                      </td>
                      <td className="px-4 py-4 text-sm font-bold text-emerald-600 text-center">
                        {t.concluidos}
                      </td>
                      <td className="px-4 py-4 text-sm font-bold text-slate-800 text-right">
                        {t.mttr_medio_horas}h
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-400 text-sm">
                      Nenhum técnico registrado no sistema.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Causa Raiz por Subcategoria */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">Distribuição por Causa Raiz</h2>
            <p className="text-xs text-slate-400 mt-0.5">Volume total de chamados por subcategoria de TI.</p>
          </div>

          <div className="space-y-4">
            {Object.keys(kpis.distribuicao_subcategorias).length > 0 ? (
              Object.entries(kpis.distribuicao_subcategorias).map(([subcat, count]) => {
                const percent = ((count / kpis.total_chamados) * 100).toFixed(1);
                return (
                  <div key={subcat} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-700">{subcat}</span>
                      <span className="text-slate-400">{count} chamados ({percent}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-sky-500 rounded-full transition-all duration-500" 
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                Nenhum chamado registrado.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
