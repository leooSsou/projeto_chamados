import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const isActive = (path) => location.pathname === path;

  // Opções dinâmicas de menu baseado no perfil
  const menuItems = [
    {
      label: 'Painel de Chamados',
      path: '/chamados',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      roles: ['Cliente', 'Técnico', 'Supervisor', 'Gerente']
    },
    {
      label: 'Gerenciar Usuários',
      path: '/usuarios',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      roles: ['Supervisor']
    }
  ];

  const visibleMenuItems = menuItems.filter(item => item.roles.includes(user.profile));

  return (
    <div className="w-64 bg-slate-900 text-slate-100 flex flex-col h-screen shadow-xl">
      {/* Hotel Branding */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center font-bold text-white shadow-md shadow-sky-500/20">
          H
        </div>
        <div>
          <h2 className="font-bold text-lg leading-tight">Grand Hotel</h2>
          <span className="text-xs text-slate-400 font-medium">Suporte Técnico</span>
        </div>
      </div>

      {/* User Information Summary */}
      <div className="p-4 mx-4 my-3 rounded-xl bg-slate-800/50 border border-slate-700/50 flex flex-col gap-1">
        <div className="font-semibold text-sm text-slate-200 truncate">{user.name}</div>
        <div className="text-xs text-slate-400 capitalize">{user.profile} • {user.department}</div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-3 flex flex-col gap-1 overflow-y-auto">
        {visibleMenuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              isActive(item.path)
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/10'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Log out option */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-950/20 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sair do Sistema
        </button>
      </div>
    </div>
  );
}
