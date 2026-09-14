'use client';

import React, { useState, useEffect } from 'react';
import { VipClient, DayRoutine } from '@/lib/types';

interface CloneRoutineModalProps {
  targetClientId: string;
  vipClients: VipClient[];
  onClose: () => void;
  onSaveClonedRoutine: (
    targetClientId: string,
    updatedRoutines: Record<string, DayRoutine>,
    updatedAssignedDays: string[]
  ) => Promise<void>;
}

const ALL_WEEK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function CloneRoutineModal({
  targetClientId,
  vipClients,
  onClose,
  onSaveClonedRoutine,
}: CloneRoutineModalProps) {
  const targetClient = vipClients.find((c) => c.id === targetClientId);
  const otherClients = vipClients.filter((c) => c.id !== targetClientId);

  const [sourceClientId, setSourceClientId] = useState<string>(
    otherClients.length > 0 ? otherClients[0].id : ''
  );
  const [selectedDays, setSelectedDays] = useState<Record<string, boolean>>({});
  const [targetDayMappings, setTargetDayMappings] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [importSuccess, setImportSuccess] = useState<boolean>(false);
  const [importStats, setImportStats] = useState<{ days: number; exercises: number }>({ days: 0, exercises: 0 });

  const sourceClient = vipClients.find((c) => c.id === sourceClientId);

  const targetDays =
    targetClient?.assignedDays && targetClient.assignedDays.length > 0
      ? targetClient.assignedDays
      : ALL_WEEK_DAYS;

  // Actualizar días sugeridos cuando cambia el cliente origen
  useEffect(() => {
    if (!sourceClient) return;

    const initialSelected: Record<string, boolean> = {};
    const initialMapping: Record<string, string> = {};

    ALL_WEEK_DAYS.forEach((day) => {
      const routine = sourceClient.routines?.[day];
      const count = routine?.exercises ? routine.exercises.length : 0;
      initialSelected[day] = count > 0;
      // Siempre mapea al mismo día por defecto — el usuario puede cambiarlo manualmente
      initialMapping[day] = day;
    });

    setSelectedDays(initialSelected);
    setTargetDayMappings(initialMapping);
  }, [sourceClientId, sourceClient]);

  const handleSelectAll = (check: boolean) => {
    const updated: Record<string, boolean> = {};
    ALL_WEEK_DAYS.forEach((d) => {
      updated[d] = check;
    });
    setSelectedDays(updated);
  };

  const handleAutoMapInOrder = () => {
    const updatedMapping = { ...targetDayMappings };
    let nonCount = 0;
    ALL_WEEK_DAYS.forEach((d) => {
      if (selectedDays[d]) {
        updatedMapping[d] = targetDays[nonCount % targetDays.length];
        nonCount++;
      }
    });
    setTargetDayMappings(updatedMapping);
  };

  const cloneRoutineDeep = (routine: DayRoutine): DayRoutine => {
    const copy: DayRoutine = JSON.parse(JSON.stringify(routine));
    if (copy.exercises && Array.isArray(copy.exercises)) {
      copy.exercises.forEach((ex, exIdx) => {
        ex.id = 've_' + Date.now() + '_' + exIdx + '_' + Math.floor(Math.random() * 1000);
        if (ex.sets && Array.isArray(ex.sets)) {
          ex.sets.forEach((s, sIdx) => {
            s.id = 'vs_' + Date.now() + '_' + exIdx + '_' + sIdx;
            s.completed = false;
          });
        }
      });
    }
    return copy;
  };

  const handleExecuteImport = async () => {
    if (!targetClient || !sourceClient) return;

    const daysToImport = ALL_WEEK_DAYS.filter((d) => selectedDays[d]);
    if (daysToImport.length === 0) {
      alert('⚠️ Selecciona al menos un día para copiar.');
      return;
    }

    setIsProcessing(true);
    try {
      // Solo construir las rutinas que se clonan realmente (NO todas las del cliente)
      const clonedRoutines: Record<string, DayRoutine> = {};
      let totalImported = 0;

      // Fusionar días asignados: existentes + nuevos, ordenados
      const mergedDaysSet = new Set<string>(targetClient.assignedDays || []);
      for (const sourceDay of daysToImport) {
        const targetDay = targetDayMappings[sourceDay] || sourceDay;
        mergedDaysSet.add(targetDay);
      }
      const newAssignedDays = ALL_WEEK_DAYS.filter((d) => mergedDaysSet.has(d));

      for (const sourceDay of daysToImport) {
        const targetDay = targetDayMappings[sourceDay] || sourceDay;
        const sourceRoutine = sourceClient.routines?.[sourceDay];

        if (sourceRoutine && sourceRoutine.exercises && sourceRoutine.exercises.length > 0) {
          clonedRoutines[targetDay] = cloneRoutineDeep(sourceRoutine);
          totalImported += sourceRoutine.exercises.length;
        }
      }

      if (totalImported === 0) {
        alert('⚠️ Los días seleccionados en el cliente origen están vacíos.');
        setIsProcessing(false);
        return;
      }

      // Pasar solo las rutinas clonadas — el padre hace el merge con las existentes
      await onSaveClonedRoutine(targetClient.id, clonedRoutines, newAssignedDays);

      // Mostrar pantalla de éxito (sin alert bloqueante)
      setImportStats({ days: Object.keys(clonedRoutines).length, exercises: totalImported });
      setImportSuccess(true);
      setTimeout(() => onClose(), 2200);
    } catch (err) {
      console.error('Error clonando rutina:', err);
      alert('Error al clonar rutina en la base de datos.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white border border-[#e4e4e7] rounded-none sm:rounded-2xl w-full max-w-lg max-h-[90vh] shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-[#003857] flex justify-between items-center bg-gradient-to-r from-[#004b73] to-[#003857] text-white shrink-0">
          <h3 className="text-sm sm:text-base font-sora-bold text-white flex items-center gap-2 truncate">
            <i className={`fa-solid ${importSuccess ? 'fa-circle-check text-emerald-400' : 'fa-file-import text-amber-400'} text-base`}></i>
            <span>{importSuccess ? '¡Rutina Importada!' : 'Importar Rutina desde otro Cliente'}</span>
          </h3>
          <button
            onClick={onClose}
            type="button"
            className="text-white/80 hover:text-white p-1 ml-2 shrink-0 cursor-pointer transition"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Cuerpo con Scroll Interno */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Información Destino */}
          <div className="bg-blue-50/90 border border-blue-200 rounded-xl p-3 text-xs text-[#004b73] space-y-1">
            <p className="font-sora-bold flex items-center gap-1.5 text-[#004b73] flex-wrap">
              <i className="fa-solid fa-user-check text-[#004b73]"></i>
              <span>
                Importando rutina para:{' '}
                <strong className="font-bold text-[#004b73] text-xs sm:text-sm">
                  {targetClient?.name} (Coach:{' '}
                  {(targetClient?.trainerId || 'HENRY').toUpperCase()})
                </strong>
              </span>
            </p>
            <p className="text-[11px] text-slate-600 font-poppins-regular leading-tight">
              Selecciona de qué cliente deseas traer los ejercicios y qué días deseas asignarle.
            </p>
          </div>

          {/* 1. Cliente Origen */}
          <div className="space-y-1.5">
            <label className="block text-xs font-sora-bold text-slate-800">
              1. Seleccionar Cliente Origen (de quién vas a copiar):
            </label>
            {otherClients.length === 0 ? (
              <p className="text-xs text-rose-500 italic p-2 bg-rose-50 border border-rose-200 rounded-xl">
                No hay otros clientes VIP registrados para copiar.
              </p>
            ) : (
              <select
                value={sourceClientId}
                onChange={(e) => setSourceClientId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-sora-bold text-[#004b73] focus:border-[#004b73] focus:outline-none cursor-pointer shadow-sm truncate"
              >
                {otherClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.username || 'Sin usuario'}) - Coach:{' '}
                    {(c.trainerId || 'HENRY').toUpperCase()}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 2. Días y Mapeo */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-200 pb-2">
              <label className="block text-xs font-sora-bold text-slate-800">
                2. Selecciona los días y hacia dónde asignarlos:
              </label>
              <div className="flex gap-2 items-center flex-wrap">
                <button
                  type="button"
                  onClick={() => handleSelectAll(true)}
                  className="text-[10px] font-sora-bold text-[#004b73] hover:underline cursor-pointer"
                >
                  Marcar Todos
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => handleSelectAll(false)}
                  className="text-[10px] font-sora-bold text-slate-500 hover:underline cursor-pointer"
                >
                  Desmarcar Todos
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={handleAutoMapInOrder}
                  className="text-[10px] font-sora-bold text-amber-600 hover:underline cursor-pointer flex items-center gap-1"
                >
                  ⚡ Mapear en orden
                </button>
              </div>
            </div>

            <div className="space-y-2 text-xs font-poppins-regular max-h-[220px] sm:max-h-[260px] overflow-y-auto p-1">
              {ALL_WEEK_DAYS.map((day) => {
                const routine = sourceClient?.routines?.[day];
                const count = routine?.exercises ? routine.exercises.length : 0;
                const isChecked = Boolean(selectedDays[day]);

                return (
                  <div
                    key={day}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl border transition gap-2 ${
                      count > 0
                        ? 'bg-blue-50/60 border-blue-200 text-slate-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <label className="flex items-center gap-2 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) =>
                          setSelectedDays({ ...selectedDays, [day]: e.target.checked })
                        }
                        className="rounded text-[#004b73] focus:ring-[#004b73]"
                      />
                      <span className="font-sora-bold text-xs text-slate-800">{day}</span>
                      {count > 0 ? (
                        <span className="bg-blue-100 text-[#004b73] px-2 py-0.5 rounded-full font-sora-bold text-[10px] shrink-0">
                          {count} ej.
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px] shrink-0">(vacío)</span>
                      )}
                    </label>

                    <div className="flex items-center gap-1.5 text-[11px] font-poppins-regular shrink-0">
                      <span className="text-slate-500 font-sora-medium text-[11px]">
                        Asignar como:
                      </span>
                      <select
                        value={targetDayMappings[day] || day}
                        onChange={(e) =>
                          setTargetDayMappings({ ...targetDayMappings, [day]: e.target.value })
                        }
                        className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-sora-bold text-[#004b73] focus:border-[#004b73] focus:outline-none cursor-pointer shadow-xs"
                      >
                        {ALL_WEEK_DAYS.map((wd) => (
                          <option key={wd} value={wd}>
                            {wd}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Nota informativa: siempre se fusionan los días */}
          <div className="pt-1 border-t border-slate-100">
            <div className="flex items-start gap-2 text-[11px] text-slate-700 font-sora-medium bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200">
              <i className="fa-solid fa-circle-info text-emerald-600 mt-0.5 shrink-0"></i>
              <div>
                <span className="font-sora-bold text-emerald-700 block">Los días existentes se conservan</span>
                <span className="text-[10px] text-slate-500 font-poppins-regular block leading-tight mt-0.5">
                  Los días clonados se agregan a los que ya tiene el cliente. Ningún día existente se elimina.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Fijo */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-sora-medium text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isProcessing || otherClients.length === 0}
            onClick={handleExecuteImport}
            className="px-5 py-2 rounded-xl bg-[#00fff6] hover:brightness-110 text-black font-sora-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
            style={{ color: '#000000' }}
          >
            {isProcessing ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i>
                <span>Importando...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-file-import"></i>
                <span>Importar Rutina</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
