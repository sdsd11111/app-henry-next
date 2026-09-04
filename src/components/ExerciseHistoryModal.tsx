'use client';

import React from 'react';
import { WorkoutLog } from '@/lib/types';

interface ExerciseHistoryModalProps {
  exerciseName: string;
  logs: WorkoutLog[];
  onClose: () => void;
}

export default function ExerciseHistoryModal({
  exerciseName,
  logs,
  onClose,
}: ExerciseHistoryModalProps) {
  const searchName = (exerciseName || '').trim().toLowerCase();

  // Extraer el historial de cargas para este ejercicio específico
  const historyList: Array<{
    date: string;
    dayOfWeek: string;
    maxWeight: number;
    volume: number;
    setsStr: string;
    wellnessMood: string;
  }> = [];

  (logs || []).forEach((log) => {
    if (log.exercises && Array.isArray(log.exercises)) {
      const matchedExercises = log.exercises.filter(
        (e: any) => (e.name || '').trim().toLowerCase() === searchName
      );
      matchedExercises.forEach((exData: any) => {
        if (exData && exData.sets && exData.sets.length > 0) {
          const validSets = exData.sets.filter(
            (s: any) => s.completed || Number(s.weight) > 0 || Number(s.reps) > 0
          );
          if (validSets.length > 0) {
            const maxWeight = Math.max(...validSets.map((s: any) => Number(s.weight) || 0));
            const vol = validSets.reduce(
              (sum: number, s: any) => sum + (Number(s.weight) || 0) * (Number(s.reps) || 0),
              0
            );
            const setsStr = validSets
              .map(
                (s: any) => `${s.weight || 0}kg × ${s.reps || 0}${s.completed ? ' ✓' : ''}`
              )
              .join(' | ');

            const moodVal =
              log.readiness?.mood ||
              '-';

            historyList.push({
              date: log.date || '',
              dayOfWeek: log.dayOfWeek || '',
              maxWeight,
              volume: vol,
              setsStr,
              wellnessMood: String(moodVal),
            });
          }
        }
      });
    }
  });

  const displayName = exerciseName
    ? exerciseName.charAt(0).toUpperCase() + exerciseName.slice(1).toLowerCase()
    : 'Historial de Ejercicio';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white border-2 border-[#00fff6] rounded-none sm:rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden max-h-[90vh]">
        {/* Header con estilo idéntico al branding Team Henry Castillo */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex justify-between items-center bg-[#004b73] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00fff6] text-black flex items-center justify-center shadow">
              <i className="fa-solid fa-chart-line text-sm"></i>
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-sora-bold text-white leading-tight">
                {displayName}
              </h3>
              <span className="text-[11px] text-[#00fff6] font-mono">
                Historial de Progreso y Cargas
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 transition cursor-pointer"
            title="Cerrar"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto bg-[#F8FAFC]">
          {historyList.length === 0 ? (
            <div className="text-center py-12 space-y-3 bg-white border border-slate-200 rounded-xl p-6">
              <div className="w-12 h-12 rounded-full bg-cyan-50 text-[#004b73] flex items-center justify-center mx-auto text-xl">
                <i className="fa-solid fa-folder-open"></i>
              </div>
              <p className="text-sm font-sora-bold text-slate-700">
                Aún no hay registros de cargas guardadas
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-poppins-regular leading-relaxed">
                Cuando el cliente complete sus series de <strong>{displayName}</strong> y guarde su sesión, aquí se graficará su historial de récords y volumen total.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {historyList.slice().reverse().map((h, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-[#004b73]/40 transition"
                >
                  <div className="min-w-[120px]">
                    <span className="text-xs font-sora-bold text-[#004b73] flex items-center gap-1.5">
                      <i className="fa-regular fa-calendar text-[11px]"></i>
                      {h.date} {h.dayOfWeek ? `(${h.dayOfWeek})` : ''}
                    </span>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                      <i className="fa-solid fa-face-smile text-amber-500 text-xs"></i>
                      <span>Ánimo: {h.wellnessMood}/10</span>
                    </div>
                  </div>

                  <div className="flex-1 text-center text-xs font-mono font-sora-medium text-slate-800 bg-slate-50 border border-slate-200 py-2 px-3 rounded-lg break-words">
                    {h.setsStr}
                  </div>

                  <div className="text-right shrink-0 min-w-[90px] space-y-0.5">
                    <div className="text-xs font-sora-bold text-slate-900 flex items-center justify-end gap-1">
                      <span>{h.maxWeight} kg</span>
                      <i className="fa-solid fa-trophy text-amber-500 text-xs"></i>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Vol: {h.volume} kg
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-white border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-sora-medium rounded-xl text-xs transition border border-slate-300 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
