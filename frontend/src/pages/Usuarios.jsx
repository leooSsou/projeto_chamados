import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function Usuarios() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Estados do Formulário de Cadastro
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [profile, setProfile] = useState('Técnico');
  const [department, setDepartment] = useState('TI');
  const [password, setPassword] = useState('');
  
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await api.get('/usuarios');
      setUsers(data);
    } catch (err) {
      setError(err.message || 'Erro ao carregar colaboradores.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (password.length < 6) {
      setFormError('A senha inicial deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post('/usuarios', {
        username: username.trim().toLowerCase(),
        name: name.trim(),
        profile,
        department,
        password
      });

      setFormSuccess('Colaborador cadastrado com sucesso!');
      
      // Limpa formulário
      setUsername('');
      setName('');
      setProfile('Técnico');
      setDepartment('TI');
      setPassword('');

      fetchUsers();
      
      setTimeout(() => {
        setIsCreateOpen(false);
        setFormSuccess('');
      }, 1500);
    } catch (err) {
      setFormError(err.message || 'Erro ao cadastrar usuário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Membros da Equipe</h1>
          <p className="text-slate-500 text-sm">Gerencie credenciais e perfis dos colaboradores do Grand Hotel.</p>
        </div>
        <button 
          onClick={() => setIsCreateOpen(true)}
          className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-sky-600/15 hover:shadow-sky-600/25 transition-all"
        >
          Cadastrar Novo Usuário
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}

      {/* Grid de Usuários */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <span className="font-bold text-slate-800 text-lg">Membros da Equipe ({users.length})</span>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">Supervisor RBAC</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Nome Completo</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">E-mail corporativo</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Departamento</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Perfil (Cargo)</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Alteração Pendente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-slate-400 text-sm">
                    Carregando colaboradores...
                  </td>
                </tr>
              ) : users.length > 0 ? (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="p-4 text-sm font-bold text-slate-800 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-sky-50 text-sky-700 font-bold text-xs flex items-center justify-center border border-sky-100">
                        {u.name.charAt(0)}
                      </div>
                      {u.name}
                    </td>
                    <td className="p-4 text-sm text-slate-600 font-medium">{u.username}</td>
                    <td className="p-4 text-sm text-slate-600 font-semibold">{u.department}</td>
                    <td className="p-4 text-sm">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-200">
                        {u.profile}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {u.must_change_password ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full uppercase">Sim (Primeiro Acesso)</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full uppercase">Não</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-slate-400 text-sm">
                    Nenhum colaborador cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: CADASTRO DE NOVO USUÁRIO */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-800 text-lg">Cadastrar Colaborador</h2>
              <button 
                onClick={() => setIsCreateOpen(false)} 
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold">
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-semibold">
                  {formSuccess}
                </div>
              )}

              {/* Nome Completo */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ana Souza"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-sky-500/50"
                />
              </div>

              {/* Username (E-mail) */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">E-mail corporativo (Login)</label>
                <input
                  type="email"
                  required
                  placeholder="exemplo@hotel.com.br"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-sky-500/50"
                />
              </div>

              {/* Perfil & Departamento */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Perfil (Cargo)</label>
                  <select
                    value={profile}
                    onChange={(e) => setProfile(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-sky-500/50"
                  >
                    <option value="Cliente">Cliente</option>
                    <option value="Técnico">Técnico</option>
                    <option value="Supervisor">Supervisor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Departamento</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-sky-500/50"
                  >
                    <option value="TI">TI (Tecnologia)</option>
                    <option value="Recepção">Recepção</option>
                    <option value="Governança">Governança</option>
                    <option value="Gerência">Gerência</option>
                  </select>
                </div>
              </div>

              {/* Senha Provisória */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Senha Provisória</label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-sky-500/50"
                />
              </div>

              {/* Footer Ações */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:bg-sky-800 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold shadow-lg shadow-sky-600/10 transition-colors"
                >
                  {isSubmitting ? 'Cadastrando...' : 'Confirmar Cadastro'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
