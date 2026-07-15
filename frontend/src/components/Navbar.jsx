import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const isActive = (path) => location.pathname === path;

  // Opções de navegação do menu baseadas no perfil (RBAC)
  const menuItems = [
    {
      label: 'Painel de Chamados',
      path: '/chamados',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
        </svg>
      ),
      roles: ['Cliente', 'Técnico', 'Supervisor', 'Gerente']
    },
    {
      label: 'Gerenciar Usuários',
      path: '/usuarios',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      roles: ['Supervisor']
    }
  ];

  const visibleMenuItems = menuItems.filter(item => item.roles.includes(user.profile));

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/85 shadow-sm">
      <div className="max-w-7xl mx-auto h-16 px-6 flex items-center justify-between">
        
        {/* Branding & Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center font-bold text-white shadow-md shadow-sky-500/20">
            H
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-sm leading-tight">Grand Hotel</h2>
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">TI Support Portal</span>
          </div>
        </div>

        {/* Links de Navegação Horizontal */}
        <nav className="hidden md:flex items-center gap-1">
          {visibleMenuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                isActive(item.path)
                  ? 'bg-sky-50 text-sky-700'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Informações do Usuário e Logout */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-bold text-slate-700">{user.name}</div>
            <div className="text-[10px] text-slate-400 capitalize font-semibold">{user.profile} • {user.department}</div>
          </div>
          
          <div className="h-8 w-px bg-slate-200" />
          
          <button
            onClick={logout}
            title="Sair do sistema"
            className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>

      </div>
    </header>
  );
}
