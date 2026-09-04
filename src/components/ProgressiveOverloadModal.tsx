'use client';

import React from 'react';

interface ProgressiveOverloadModalProps {
  exerciseName: string;
  targetReps: number;
  currentWeight: number;
  suggestedWeight: number;
  onAccept: () => void;
  onClose: () => void;
}

export default function ProgressiveOverloadModal({
  exerciseName,
  targetReps,
  currentWeight,
  suggestedWeight,
  onAccept,
  onClose,
}: ProgressiveOverloadModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white border-2 border-[#00fff6] rounded-none sm:rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-center relative p-6 sm:p-8 space-y-4 my-auto">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#004b73] to-[#00fff6] text-black flex items-center justify-center mx-auto shadow-lg text-3xl ring-4 ring-cyan-100 animate-bounce">
          <i className="fa-solid fa-fire-flame-curved text-black"></i>
        </div>

        <div className="space-y-1.5">
          <span className="text-[11px] font-sora-bold uppercase tracking-wider bg-cyan-50 text-[#004b73] px-3.5 py-1 rounded-full border border-cyan-200 inline-block">
            🚀 Sobrecarga Progresiva Alcanzada
          </span>
          <h3 className="text-xl sm:text-2xl font-sora-bold text-[#1A3644] mt-1">
            ¡Excelente Trabajo!
          </h3>
          <p className="text-xs sm:text-sm font-poppins-regular text-slate-700 leading-relaxed px-2">
            Has logrado completar el objetivo de <strong>{targetReps} repeticiones</strong> en todas
            las series de <strong className="text-[#004b73] font-sora-bold">{exerciseName}</strong>{' '}
            con <strong>{currentWeight} kg</strong>.
          </p>
        </div>

        <div className="bg-cyan-50/60 border border-cyan-200 rounded-xl p-3.5 text-center space-y-1 shadow-inner">
          <div className="text-xs font-sora-bold text-[#004b73] uppercase tracking-wide flex items-center justify-center gap-1.5">
            <i className="fa-solid fa-bullseye text-[#004b73]"></i> Nueva Carga Sugerida:
          </div>
          <div className="font-mono font-sora-bold text-2xl sm:text-3xl text-slate-900 tracking-tight">
            {suggestedWeight} kg
          </div>
        </div>

        <p className="text-[11px] text-slate-600 font-poppins-regular leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-left">
          💡 <strong className="text-[#004b73] font-sora-bold">Tip de Team Henry Castillo:</strong> Para
          mantener la progresión y estimular el crecimiento muscular, aplica este nuevo peso en tu
          próxima sesión.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={onAccept}
            className="w-full py-3 bg-[#00fff6] hover:brightness-110 text-black font-sora-bold rounded-xl text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            style={{ color: '#000000' }}
          >
            <i className="fa-solid fa-wand-magic-sparkles text-black"></i>
            <span>✅ Aceptar para mi Próxima Sesión</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-sora-medium rounded-xl text-xs transition border border-slate-300 cursor-pointer"
          >
            ¡Entendido!
          </button>
        </div>
      </div>
    </div>
  );
}
