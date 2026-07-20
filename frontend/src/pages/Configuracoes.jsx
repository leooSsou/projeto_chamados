import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function Configuracoes() {
  const { user } = useAuth();

  // Abas das Configurações
  const [activeTab, setActiveTab] = useState('perfil');

  // Formulário de Alteração de Senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Preferências Locais (Salvas no localStorage)
  const [emailNotifications, setEmailNotifications] = useState(() => {
    return localStorage.getItem('pref_email_notify') !== 'false';
  });
  const [soundAlerts, setSoundAlerts] = useState(() => {
    return localStorage.getItem('pref_sound_alerts') === 'true';
  });
  const [compactTable, setCompactTable] = useState(() => {
    return localStorage.getItem('pref_compact_table') === 'true';
  });

  // Configurações Específicas do Supervisor
  const [overflowTimeout, setOverflowTimeout] = useState(() => {
    return localStorage.getItem('sup_overflow_timeout') || '60';
  });
  const [slaTargetPercent, setSlaTargetPercent] = useState(() => {
    return localStorage.getItem('sup_sla_target') || '90';
  });
  const [maxReopensAllowed, setMaxReopensAllowed] = useState(() => {
    return localStorage.getItem('sup_max_reopens') || '2';
  });
  const [dutyEmail, setDutyEmail] = useState(() => {
    return localStorage.getItem('sup_duty_email') || 'plantao.ti@hotel.com.br';
  });
  const [supervisorSavedSuccess, setSupervisorSavedSuccess] = useState(false);

  // GERENCIAMENTO DE OPÇÕES DINÂMICAS DO FORMULÁRIO (SUPERVISOR)
  const [systemOptions, setSystemOptions] = useState({
    location_types: [],
    common_areas: [],
    subcategories: []
  });
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState('');
  const [optionsSuccess, setOptionsSuccess] = useState('');

  // Formulários para adicionar novas opções
  const [newLocationType, setNewLocationType] = useState('');
  const [newCommonArea, setNewCommonArea] = useState('');
  const [newSubcategory, setNewSubcategory] = useState('');

  const isSupervisor = user?.profile === 'Supervisor';

  useEffect(() => {
    if (isSupervisor && activeTab === 'opcoes') {
      fetchSystemOptions();
    }
  }, [activeTab, isSupervisor]);

  const fetchSystemOptions = async () => {
    setOptionsLoading(true);
    setOptionsError('');
    try {
      const data = await api.get('/opcoes');
      setSystemOptions(data);
    } catch (err) {
      setOptionsError(err.message || 'Erro ao carregar opções do sistema.');
    } finally {
      setOptionsLoading(false);
    }
  };

  const handleAddOption = async (category, nameValue, setNameState) => {
    if (!nameValue.trim()) return;
    setOptionsError('');
    setOptionsSuccess('');

    try {
      await api.post('/opcoes', {
        category,
        name: nameValue.trim()
      });
      setOptionsSuccess(`Opção "${nameValue}" cadastrada com sucesso!`);
      setNameState('');
      fetchSystemOptions();
    } catch (err) {
      setOptionsError(err.message || 'Erro ao adicionar opção.');
    }
  };

  const handleDeleteOption = async (optionId, optionName) => {
    if (!window.confirm(`Tem certeza de que deseja remover a opção "${optionName}"?`)) return;
    setOptionsError('');
    setOptionsSuccess('');

    try {
      await api.delete(`/opcoes/${optionId}`);
      setOptionsSuccess(`Opção "${optionName}" removida com sucesso!`);
      fetchSystemOptions();
    } catch (err) {
      setOptionsError(err.message || 'Erro ao excluir opção.');
    }
  };

  const handleToggleEmail = (val) => {
    setEmailNotifications(val);
    localStorage.setItem('pref_email_notify', val);
  };

  const handleToggleSound = (val) => {
    setSoundAlerts(val);
    localStorage.setItem('pref_sound_alerts', val);
  };

  const handleToggleCompact = (val) => {
    setCompactTable(val);
    localStorage.setItem('pref_compact_table', val);
  };

  const handleSaveSupervisorSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('sup_overflow_timeout', overflowTimeout);
    localStorage.setItem('sup_sla_target', slaTargetPercent);
    localStorage.setItem('sup_max_reopens', maxReopensAllowed);
    localStorage.setItem('sup_duty_email', dutyEmail);

    setSupervisorSavedSuccess(true);
    setTimeout(() => setSupervisorSavedSuccess(false), 3000);
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('A nova senha e a confirmação não coincidem.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setPasswordLoading(true);
    try {
      await api.post('/auth/alterar-senha', {
        current_password: currentPassword,
        new_password: newPassword
      });
      setPasswordSuccess('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err.message || 'Erro ao alterar a senha. Verifique sua senha atual.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const getProfileBadgeStyle = (profile) => {
    switch (profile) {
      case 'Supervisor': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Técnico': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-sky-100 text-sky-700 border-sky-200';
    }
  };

  const tabList = [
    {
      id: 'perfil',
      label: 'Meu Perfil',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    ...(isSupervisor ? [
      {
        id: 'opcoes',
        label: 'Locais & Subcategorias',
        icon: (
          <svg className="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        )
      },
      {
        id: 'supervisao',
        label: 'Supervisão & Operações',
        icon: (
          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        )
      }
    ] : []),
    {
      id: 'seguranca',
      label: 'Segurança & Senha',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )
    },
    {
      id: 'preferencias',
      label: 'Preferências',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    {
      id: 'sistema',
      label: 'Sobre o Sistema',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Configurações do Sistema</h1>
        <p className="text-slate-500 text-sm mt-1">Gerencie seu perfil, regras operacionais e personalize o formulário de chamados.</p>
      </div>

      {/* Navegação por Abas */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto no-scrollbar">
        {tabList.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-sky-600 text-sky-600 bg-sky-50/50'
                : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTEÚDO DAS ABAS */}

      {/* ABA 1: MEU PERFIL */}
      {activeTab === 'perfil' && user && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-extrabold shadow-lg shadow-sky-500/20 shrink-0">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="text-center sm:text-left space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-xl font-bold text-slate-800">{user.name}</h2>
                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${getProfileBadgeStyle(user.profile)}`}>
                  {user.profile}
                </span>
              </div>
              <p className="text-sm text-slate-500">{user.username}</p>
              <div className="text-xs font-semibold text-slate-400">Setor: {user.department}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nome Completo</span>
              <div className="font-semibold text-slate-800">{user.name}</div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">E-mail / Matrícula</span>
              <div className="font-semibold text-slate-800">{user.username}</div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Setor Hoteleiro</span>
              <div className="font-semibold text-slate-800">{user.department}</div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Perfil de Permissões</span>
              <div className="font-semibold text-slate-800">{user.profile}</div>
            </div>
          </div>
        </div>
      )}

      {/* ABA EXCLUSIVA DO SUPERVISOR: OPÇÕES DINÂMICAS DO FORMULÁRIO (LOCAIS & SUBCATEGORIAS) */}
      {activeTab === 'opcoes' && isSupervisor && (
        <div className="space-y-8">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Personalização de Formulário</h2>
            <p className="text-slate-500 text-xs mt-1">Adicione ou remova Tipos de Local, Locais do Hotel e Subcategorias de TI que aparecem no modal de abertura de chamados.</p>
          </div>

          {optionsSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              {optionsSuccess}
            </div>
          )}

          {optionsError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {optionsError}
            </div>
          )}

          {optionsLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">Carregando opções dinâmicas do formulário...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* COLUNA 1: TIPOS DE LOCAL */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="font-bold text-slate-800 text-sm">Tipos de Local</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 bg-sky-50 text-sky-700 rounded-md">
                      {systemOptions.location_types.length}
                    </span>
                  </div>

                  <ul className="divide-y divide-slate-100 mt-3 max-h-60 overflow-y-auto no-scrollbar">
                    {systemOptions.location_types.map((item) => (
                      <li key={item.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-slate-700">{item.name}</span>
                        <button
                          onClick={() => handleDeleteOption(item.id, item.name)}
                          title="Remover tipo de local"
                          className="text-slate-300 hover:text-rose-600 transition-colors p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <input
                    type="text"
                    placeholder="Novo tipo de local..."
                    value={newLocationType}
                    onChange={(e) => setNewLocationType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    onClick={() => handleAddOption('location_type', newLocationType, setNewLocationType)}
                    className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    + Adicionar Tipo
                  </button>
                </div>
              </div>

              {/* COLUNA 2: LOCAIS DO HOTEL (ÁREAS COMUNS) */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="font-bold text-slate-800 text-sm">Locais do Hotel</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md">
                      {systemOptions.common_areas.length}
                    </span>
                  </div>

                  <ul className="divide-y divide-slate-100 mt-3 max-h-60 overflow-y-auto no-scrollbar">
                    {systemOptions.common_areas.map((item) => (
                      <li key={item.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-slate-700">{item.name}</span>
                        <button
                          onClick={() => handleDeleteOption(item.id, item.name)}
                          title="Remover local hoteleiro"
                          className="text-slate-300 hover:text-rose-600 transition-colors p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <input
                    type="text"
                    placeholder="Novo local (ex: Spa, Bar)..."
                    value={newCommonArea}
                    onChange={(e) => setNewCommonArea(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    onClick={() => handleAddOption('common_area', newCommonArea, setNewCommonArea)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    + Adicionar Local
                  </button>
                </div>
              </div>

              {/* COLUNA 3: SUBCATEGORIAS DE TI */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="font-bold text-slate-800 text-sm">Subcategorias de TI</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md">
                      {systemOptions.subcategories.length}
                    </span>
                  </div>

                  <ul className="divide-y divide-slate-100 mt-3 max-h-60 overflow-y-auto no-scrollbar">
                    {systemOptions.subcategories.map((item) => (
                      <li key={item.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-slate-700">{item.name}</span>
                        <button
                          onClick={() => handleDeleteOption(item.id, item.name)}
                          title="Remover subcategoria"
                          className="text-slate-300 hover:text-rose-600 transition-colors p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <input
                    type="text"
                    placeholder="Nova subcategoria (ex: PABX)..."
                    value={newSubcategory}
                    onChange={(e) => setNewSubcategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    onClick={() => handleAddOption('subcategory', newSubcategory, setNewSubcategory)}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    + Adicionar Subcategoria
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* ABA SUPERVISÃO & OPERAÇÕES (EXCLUSIVA PARA SUPERVISOR) */}
      {activeTab === 'supervisao' && isSupervisor && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6 max-w-2xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-800">Parâmetros de Supervisão Operacional</h2>
                <span className="bg-purple-100 text-purple-700 text-[10px] font-extrabold px-2 py-0.5 rounded uppercase">Exclusivo Supervisor</span>
              </div>
              <p className="text-slate-500 text-xs mt-1">Defina regras globais de transbordo, metas de SLA e e-mail de transbordo da equipe de TI.</p>
            </div>
          </div>

          {supervisorSavedSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              Configurações de supervisão atualizadas com sucesso!
            </div>
          )}

          <form onSubmit={handleSaveSupervisorSettings} className="space-y-6">
            
            {/* 1. Tempo Limite de Atendimento (Transbordo) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Alerta de Transbordo por Inatividade *
              </label>
              <p className="text-xs text-slate-400">Tempo máximo que um chamado pode permanecer em 'Aberto' sem início de atendimento técnico antes de gerar alerta de supervisão.</p>
              <select
                value={overflowTimeout}
                onChange={(e) => setOverflowTimeout(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-sky-500/50 font-semibold"
              >
                <option value="30">30 minutos (Operação Crítica Hoteleira)</option>
                <option value="45">45 minutos</option>
                <option value="60">60 minutos (Padrão Recomendado)</option>
                <option value="120">120 minutos (2 horas)</option>
              </select>
            </div>

            {/* 2. Meta Percentual de SLA */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Meta Global de Cumprimento de SLA (%) *
              </label>
              <p className="text-xs text-slate-400">Percentual mínimo desejado para o indicador de SLA global no Painel de Gestão.</p>
              <select
                value={slaTargetPercent}
                onChange={(e) => setSlaTargetPercent(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-sky-500/50 font-semibold"
              >
                <option value="85">85% - Tolerância Moderada</option>
                <option value="90">90% - Meta Padrão Recomendada</option>
                <option value="95">95% - Alta Performance</option>
                <option value="98">98% - Excelência Hoteleira</option>
              </select>
            </div>

            {/* 3. Máximo de Reaberturas Diretas */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Limite de Reaberturas por Solicitante *
              </label>
              <p className="text-xs text-slate-400">Quantidade máxima de reaberturas consecutivas permitidas antes de exigir mediação direta da supervisão.</p>
              <select
                value={maxReopensAllowed}
                onChange={(e) => setMaxReopensAllowed(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-sky-500/50 font-semibold"
              >
                <option value="1">1 Reabertura Máxima</option>
                <option value="2">2 Reaberturas Máximas (Padrão)</option>
                <option value="3">3 Reaberturas Máximas</option>
              </select>
            </div>

            {/* 4. E-mail do Plantão de TI */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                E-mail do Plantão de TI (Alertas Urgentes) *
              </label>
              <p className="text-xs text-slate-400">Endereço de e-mail institucional para onde notificações de chamados críticos em quartos ocupados são copiadas.</p>
              <input
                type="email"
                required
                value={dutyEmail}
                onChange={(e) => setDutyEmail(e.target.value)}
                placeholder="plantao.ti@hotel.com.br"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-sky-500/50 font-medium"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Salvar Parâmetros de Supervisão
              </button>
            </div>

          </form>
        </div>
      )}

      {/* ABA 2: SEGURANÇA & SENHA */}
      {activeTab === 'seguranca' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6 max-w-xl">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Alteração de Senha</h2>
            <p className="text-slate-500 text-xs mt-1">Atualize sua senha de acesso periodicamente para manter a conta segura.</p>
          </div>

          {passwordSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              {passwordSuccess}
            </div>
          )}

          {passwordError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {passwordError}
            </div>
          )}

          <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Senha Atual *</label>
              <input
                type="password"
                required
                placeholder="Digite sua senha atual"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-sky-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nova Senha *</label>
              <input
                type="password"
                required
                placeholder="Digite a nova senha (mínimo 6 caracteres)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-sky-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Confirmar Nova Senha *</label>
              <input
                type="password"
                required
                placeholder="Confirme a nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-sky-500/50"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={passwordLoading}
                className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:bg-sky-800 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-600/20 transition-all"
              >
                {passwordLoading ? 'Atualizando...' : 'Atualizar Senha'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ABA 3: PREFERÊNCIAS & NOTIFICAÇÕES */}
      {activeTab === 'preferencias' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6 max-w-2xl">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Preferências de Uso</h2>
            <p className="text-slate-500 text-xs mt-1">Personalize como o sistema se comporta para o seu usuário.</p>
          </div>

          <div className="divide-y divide-slate-100">
            {/* Opção 1: Notificações por E-mail */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-bold text-slate-800 text-sm">Notificações por E-mail</div>
                <p className="text-xs text-slate-400 mt-0.5">Receber e-mails automáticos quando um chamado for aberto ou finalizado.</p>
              </div>
              <button
                onClick={() => handleToggleEmail(!emailNotifications)}
                className={`w-12 h-6 rounded-full transition-colors relative focus:outline-none ${
                  emailNotifications ? 'bg-sky-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                    emailNotifications ? 'left-6.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Opção 2: Alert Sonoro em SLAs Críticos */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-bold text-slate-800 text-sm">Alerta Sonoro de Chamados Críticos</div>
                <p className="text-xs text-slate-400 mt-0.5">Emitir som de aviso quando novos chamados urgentes (SLA 2h) entrarem na fila.</p>
              </div>
              <button
                onClick={() => handleToggleSound(!soundAlerts)}
                className={`w-12 h-6 rounded-full transition-colors relative focus:outline-none ${
                  soundAlerts ? 'bg-sky-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                    soundAlerts ? 'left-6.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Opção 3: Modo de Exibição Compacto */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-bold text-slate-800 text-sm">Modo de Exibição Compacto</div>
                <p className="text-xs text-slate-400 mt-0.5">Reduz o espaçamento das linhas da tabela para visualizar mais chamados na tela.</p>
              </div>
              <button
                onClick={() => handleToggleCompact(!compactTable)}
                className={`w-12 h-6 rounded-full transition-colors relative focus:outline-none ${
                  compactTable ? 'bg-sky-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                    compactTable ? 'left-6.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ABA 4: SOBRE O SISTEMA */}
      {activeTab === 'sistema' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6 max-w-2xl">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Sistema de Chamados TI & Hoteleiro</h2>
            <p className="text-slate-500 text-xs mt-1">Plataforma de Gestão de Ordens de Serviço e Acordos de Nível de Serviço (SLA).</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="font-bold text-slate-400 uppercase">Versão da Aplicação</span>
              <div className="font-bold text-slate-800 text-sm">v1.2.0</div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="font-bold text-slate-400 uppercase">Status da API Backend</span>
              <div className="font-bold text-emerald-600 text-sm flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Online (FastAPI)
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="font-bold text-slate-400 uppercase">Motor de SLA</span>
              <div className="font-bold text-slate-800 text-sm">Dinâmico (2h / 24h)</div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="font-bold text-slate-400 uppercase">Suporte Técnico TI</span>
              <div className="font-bold text-slate-800 text-sm">suporte.ti@hotel.com.br</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
