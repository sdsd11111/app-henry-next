'use client';

import React from 'react';
import Image from 'next/image';

type AppMode = 'vip_client' | 'coach';
type CoachTab = 'floor' | 'vip';

interface HeaderProps {
  appMode: AppMode;
  coachLoggedIn: boolean;
  coachInfo: { id: string; name: string; username: string } | null;
  coachTab: CoachTab;
  onSwitchMode: (mode: AppMode) => void;
  onCoachLogout: () => void;
  onSwitchCoachTab: (tab: CoachTab) => void;
}

export default function Header({
  appMode,
  coachLoggedIn,
  coachInfo,
  coachTab,
  onSwitchMode,
  onCoachLogout,
  onSwitchCoachTab,
}: HeaderProps) {
  return (
    <header className="bg-white border-b border-[#e4e4e7] sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Brand & Title */}
        <div className="flex items-center space-x-3">
          <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 flex items-center justify-center relative">
            <Image
              src="/logo.png"
              alt="Logo Team Henry Castillo"
              width={80}
              height={80}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-brand font-bold tracking-tight text-[#171717] flex items-center gap-1.5">
              TEAM HENRY CASTILLO
            </h1>
            <p className="text-[11px] font-poppins-regular text-[#004b73] tracking-wider font-semibold">
              Planificador de Rutinas
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Portal Cliente VIP button */}
          <button
            id="btnPortalCliente"
            onClick={() => onSwitchMode('vip_client')}
            className={`px-3 py-2 text-xs font-sora-bold transition flex items-center gap-1.5 cursor-pointer ${
              appMode === 'vip_client'
                ? 'bg-[#00fff6]'
                : 'bg-slate-100 hover:bg-slate-200 border border-slate-200'
            }`}
            style={{ color: '#000000' }}
          >
            <i className="fa-solid fa-user-check"></i>
            <span>Portal Cliente</span>
          </button>

          {/* Panel Coach button */}
          <button
            id="btnPanelCoach"
            onClick={() => onSwitchMode('coach')}
            className={`px-3 py-2 text-xs font-sora-bold transition flex items-center gap-1.5 cursor-pointer ${
              appMode === 'coach'
                ? 'bg-[#00fff6]'
                : 'bg-slate-100 hover:bg-slate-200 border border-slate-200'
            }`}
            style={{ color: '#000000' }}
          >
            <i className="fa-solid fa-user-gear"></i>
            <span>Panel Coach</span>
          </button>

          {/* If coach is logged in, show Coach info & logout */}
          {coachLoggedIn && appMode === 'coach' && (
            <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-slate-300">
              {/* Coach info */}
              {coachInfo && (
                <span className="text-xs text-slate-600 font-poppins-regular hidden sm:inline">
                  <i className="fa-solid fa-circle-user mr-1 text-[#004b73]"></i>
                  {coachInfo.name}
                </span>
              )}

              {/* Logout */}
              <button
                onClick={onCoachLogout}
                title="Cerrar Sesión Coach"
                className="p-1.5 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
              >
                <i className="fa-solid fa-power-off"></i>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
