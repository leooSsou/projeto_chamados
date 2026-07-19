import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function Configuracoes() {
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const placeholderPassword = '••••••••';

  const fetchConfig = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await api.get('/configuracoes/smtp');
      setSmtpHost(data.smtp_host || '');
      setSmtpPort(data.smtp_port || 587);
      setSmtpUser(data.smtp_user || '');
      
      if (data.has_password) {
        setSmtpPassword(placeholderPassword);
      } else {
        setSmtpPassword('');
      }
    } catch (err) {
      setError(err.message || 'Erro ao carregar configurações de e-mail.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const updated = await api.put('/configuracoes/smtp', {
        smtp_host: smtpHost.trim() || null,
        smtp_port: parseInt(smtpPort) || null,
        smtp_user: smtpUser.trim() || null,
        smtp_password: smtpPassword
      });

      setSuccess('Configurações salvas com sucesso!');
      if (updated.has_password) {
        setSmtpPassword(placeholderPassword);
      }
    } catch (err) {
      setError(err.message || 'Erro ao salvar as configurações.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-slate-500 font-medium">
        Carregando parâmetros do sistema...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-200">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Minhas Configurações</h1>
        <p className="text-slate-500 text-sm">Gerencie suas credenciais de e-mail SMTP para envio de notificações.</p>
      </div>

      {/* Main Container */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        {/* Section Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-base">Parâmetros de SMTP Pessoal</h2>
              <p className="text-slate-400 text-xs mt-0.5">Defina as credenciais SMTP do seu e-mail corporativo.</p>
            </div>
          </div>
          <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400">SMTP Core</span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-semibold flex items-center gap-2">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          {success && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm font-semibold flex items-center gap-2">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Host SMTP */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Servidor SMTP (Host)</label>
              <input
                type="text"
                placeholder="Ex: smtp.host.com"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-sky-500/50 transition-colors"
              />
            </div>

            {/* Porta SMTP */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Porta SMTP</label>
              <input
                type="number"
                placeholder="Ex: 587"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-sky-500/50 transition-colors"
              />
            </div>

            {/* Usuário SMTP */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Seu e-mail completo (Login SMTP)</label>
              <input
                type="text"
                placeholder="Ex: usuario@host.com"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-sky-500/50 transition-colors"
              />
            </div>

            {/* Senha SMTP */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Senha do e-mail</label>
              <input
                type="password"
                placeholder="Insira a senha da sua conta de e-mail"
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-sky-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Alert Callout */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-400 leading-relaxed space-y-1.5">
            <div>
              <strong>Locaweb:</strong> Use Host `smtp.locaweb.com.br` e Porta `465` (SSL) ou `587` (STARTTLS).
            </div>
            <div>
              <strong>Gmail:</strong> Use Host `smtp.gmail.com` e Porta `465` (SSL) ou `587` (STARTTLS) com <strong>Senha de App</strong> de 16 dígitos gerada na sua Conta Google.
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:bg-sky-800 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold shadow-lg shadow-sky-600/10 transition-colors"
            >
              {isSubmitting ? 'Salvando Configurações...' : 'Salvar Alterações'}
            </button>
          </div>

        </form>
      </div>

    </div>
  );
}
