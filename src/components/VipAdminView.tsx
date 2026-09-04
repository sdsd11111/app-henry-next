'use client';

import React, { useState } from 'react';
import { VipClient, DayRoutine } from '@/lib/types';
import { PATRONES_PRINCIPALES, PATRONES_ACCESORIOS, DEFAULT_CATALOG_GROUPS } from '@/lib/catalog';

interface VipAdminViewProps {
  vipClients: VipClient[];
  selectedClientId: string | null;
  catalog: string[];
  onSelectClient: (clientId: string) => void;
  onOpenAddVipModal: () => void;
  onOpenEditVipModal: (clientId: string) => void;
  onOpenShareVipModal: (clientId: string) => void;
  onOpenCloneRoutineModal: (clientId: string) => void;
  onDeleteVipClient: (clientId: string) => void;
  onSelectDay: (day: string) => void;
  onUpdateSessionName: (title: string) => void;
  onUpdateNote: (note: string) => void;
  onToggleMenstrualCycle: (clientId: string) => void;
  onUpdateExerciseField: (exIndex: number, field: string, value: any) => void;
  onChangeExerciseSets: (exIndex: number, delta: number) => void;
  onRemoveExercise: (exIndex: number) => void;
  onAddBlankExercise: () => void;
  onAddCatalogExercise: (name: string) => void;
  onOpenExerciseHistory: (exName: string) => void;
  onSyncAll: () => Promise<void>;
  isSyncing?: boolean;
}

export default function VipAdminView({
  vipClients,
  selectedClientId,
  catalog,
  onSelectClient,
  onOpenAddVipModal,
  onOpenEditVipModal,
  onOpenShareVipModal,
  onOpenCloneRoutineModal,
  onDeleteVipClient,
  onSelectDay,
  onUpdateSessionName,
  onUpdateNote,
  onToggleMenstrualCycle,
  onUpdateExerciseField,
  onChangeExerciseSets,
  onRemoveExercise,
  onAddBlankExercise,
  onAddCatalogExercise,
  onOpenExerciseHistory,
  onSyncAll,
  isSyncing,
}: VipAdminViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatalogEx, setSelectedCatalogEx] = useState('');
  const [customCatalogEx, setCustomCatalogEx] = useState('');

  const selectedClient =
    vipClients.find((c) => c.id === selectedClientId) || vipClients[0] || null;

  const filteredClients = vipClients.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.username || '').toLowerCase().includes(q) ||
      (c.goal || '').toLowerCase().includes(q) ||
      (c.trainerId || '').toLowerCase().includes(q)
    );
  });

  const activeDay = selectedClient
    ? selectedClient.activeDay ||
      (selectedClient.assignedDays && selectedClient.assignedDays[0]) ||
      'Lunes'
    : 'Lunes';

  const routine: DayRoutine =
    selectedClient && selectedClient.routines && selectedClient.routines[activeDay]
      ? selectedClient.routines[activeDay]
      : { exercises: [], cardio: [] };

  const handleAddCatalogSubmit = () => {
    const name = customCatalogEx.trim() || selectedCatalogEx;
    if (!name) {
      alert('⚠️ Selecciona o escribe el nombre del ejercicio.');
      return;
    }
    onAddCatalogExercise(name);
    setSelectedCatalogEx('');
    setCustomCatalogEx('');
  };

  return (
    <div className="flex flex-col lg:flex-row gap-5 lg:gap-6 items-start animate-fadeIn">
      {/* Columna Izquierda: Directorio de Clientes VIP */}
      <div className="bg-white border border-[#e4e4e7] p-4 shadow-sm space-y-4 w-full lg:w-[320px] xl:w-[350px] shrink-0">
        <div className="flex justify-between items-center border-b border-slate-200 pb-3">
          <h4 className="text-xs font-sora-bold text-[#004b73] uppercase tracking-wider flex items-center gap-1.5">
            <i className="fa-solid fa-users text-amber-500"></i> Clientes VIP ({vipClients.length})
          </h4>
          <button
            type="button"
            onClick={onOpenAddVipModal}
            title="Añadir Cliente VIP"
            className="w-7 h-7 bg-[#004b73] hover:bg-[#003857] text-white flex items-center justify-center transition shadow cursor-pointer"
            style={{ color: '#FFFFFF' }}
          >
            <i className="fa-solid fa-plus text-xs" style={{ color: '#FFFFFF' }}></i>
          </button>
        </div>

        {/* Buscador de Clientes VIP */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Buscar por nombre, usuario..."
            className="w-full bg-[#F0F6F9] border border-[#E2E8F0] focus:border-[#004b73] px-3 py-2 text-xs font-sora-medium text-slate-900 focus:outline-none pr-8"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          )}
        </div>

        {/* Listado de Clientes */}
        <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
          {filteredClients.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400 font-poppins-regular italic bg-slate-50 border border-dashed border-slate-200">
              No se encontraron clientes VIP
            </div>
          ) : (
            filteredClients.map((c) => {
              const isSel = selectedClient && c.id === selectedClient.id;
              return (
                <div
                  key={c.id}
                  onClick={() => onSelectClient(c.id)}
                  className={`p-3.5 border transition cursor-pointer text-left space-y-2.5 ${
                    isSel
                      ? 'bg-blue-50 border-2 border-[#004b73] shadow-sm'
                      : 'bg-white hover:bg-slate-50 border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-sora-bold text-xs sm:text-sm text-[#004b73] truncate">
                      {c.name}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 font-sora-bold uppercase shrink-0 ${
                        c.trainerId === 'henry'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {c.trainerId}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[#1A3644] flex justify-between items-center bg-slate-100 p-2 border border-slate-300">
                    <span>
                      <strong className="text-[#004b73]">👤</strong> {c.username}
                    </span>
                    <span>
                      <strong className="text-amber-500">🔑</strong>{' '}
                      {c.password || c.password_plain || '***'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-700 font-poppins-regular truncate flex items-center gap-1.5">
                    <strong className="text-[#004b73]">🎯</strong>
                    <span className="truncate">{c.goal}</span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-poppins-regular flex items-center gap-2">
                    <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 flex items-center gap-1 text-slate-600">
                      <i
                        className={`fa-solid ${
                          c.gender === 'Mujer' ? 'fa-venus text-pink-500' : 'fa-mars text-blue-500'
                        }`}
                      ></i>{' '}
                      {c.gender || 'Hombre'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {(c.assignedDays || []).join(', ')}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <button
          type="button"
          onClick={onOpenAddVipModal}
          className="w-full py-3 bg-[#004b73] hover:bg-[#003857] font-sora-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
          style={{ color: '#00fff6' }}
        >
          <i className="fa-solid fa-user-plus"></i>
          <span>+ Nuevo Cliente VIP</span>
        </button>
      </div>

      {/* Columna Derecha: Programador de Rutina */}
      <div className="space-y-5 flex-1 min-w-0 w-full">
        {!selectedClient ? (
          <div className="bg-white border border-slate-300 p-8 text-center text-slate-500 text-xs">
            Selecciona un cliente de la izquierda o crea uno nuevo para empezar a planificar su
            rutina.
          </div>
        ) : (
          <div className="bg-white border border-slate-300 p-5 shadow-sm space-y-4">
            {/* Header del Cliente Seleccionado */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <span className="text-[10px] font-sora-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 uppercase">
                  Planificador Coach VIP
                </span>
                <h3 className="text-lg font-sora-bold text-[#1A3644] mt-1 flex items-center gap-2 flex-wrap">
                  <span>
                    Rutina de: <strong className="text-[#004b73]">{selectedClient.name}</strong>
                  </span>
                </h3>

                {selectedClient.gender === 'Mujer' && (
                  <div className="text-[11px] text-slate-600 font-poppins-regular flex items-center gap-2 mt-1.5">
                    <span className="bg-white border border-slate-200 px-2.5 py-0.5 flex items-center gap-1.5 shadow-xs">
                      <i className="fa-solid fa-venus text-pink-500"></i> Mujer
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleMenstrualCycle(selectedClient.id)}
                      className={`px-2.5 py-0.5 flex items-center gap-1.5 shadow-xs transition border cursor-pointer ${
                        routine.isMenstrualCycle
                          ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 font-sora-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                      title="Haz clic para actualizar estado de ciclo menstrual"
                    >
                      <i
                        className={`fa-solid fa-droplet ${
                          routine.isMenstrualCycle ? 'text-rose-500' : 'text-slate-400'
                        } text-[10px]`}
                      ></i>
                      {routine.isMenstrualCycle ? 'Ciclo Activo' : 'Marcar Ciclo Menstrual'}
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => onOpenEditVipModal(selectedClient.id)}
                    className="bg-blue-50 hover:bg-blue-100 text-[#004b73] font-sora-bold px-3.5 py-2 text-xs transition flex items-center gap-1.5 border border-blue-200 cursor-pointer"
                  >
                    <i className="fa-solid fa-pen-to-square"></i>
                    <span>Editar Datos</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenShareVipModal(selectedClient.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-black font-sora-bold px-4 py-2 text-xs transition flex items-center gap-2 border border-emerald-500 cursor-pointer"
                    style={{ color: '#000000' }}
                  >
                    <i className="fa-brands fa-whatsapp text-sm"></i>
                    <span>Compartir por WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenCloneRoutineModal(selectedClient.id)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-sora-bold px-3.5 py-2 text-xs transition flex items-center gap-1.5 border border-indigo-500 cursor-pointer"
                    style={{ color: '#FFFFFF' }}
                  >
                    <i className="fa-solid fa-copy" style={{ color: '#FFFFFF' }}></i>
                    <span style={{ color: '#FFFFFF' }}>Clonar Rutina</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteVipClient(selectedClient.id)}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-sora-bold px-3.5 py-2 text-xs transition flex items-center gap-1.5 border border-rose-200 cursor-pointer"
                  >
                    <i className="fa-solid fa-user-xmark"></i>
                    <span>Eliminar Membresía</span>
                  </button>
                </div>
              </div>

              {/* Day Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                {(selectedClient.assignedDays || [
                  'Lunes',
                  'Martes',
                  'Miércoles',
                  'Jueves',
                  'Viernes',
                  'Sábado',
                ]).map((day) => {
                  const isSel = day === activeDay;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => onSelectDay(day)}
                      className={`px-4 py-2 shrink-0 whitespace-nowrap text-xs font-sora-bold transition flex items-center justify-center cursor-pointer ${
                        isSel
                          ? 'bg-[#004b73] text-black shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                      style={isSel ? { color: '#000000' } : {}}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inputs de Título de Sesión e Indicación Clínica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 border border-slate-200">
              <div>
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide flex items-center gap-1">
                  <i className="fa-solid fa-tag"></i> Título de la Sesión para {activeDay}:
                </label>
                <input
                  type="text"
                  value={routine.sessionName || `SESIÓN ${activeDay.toUpperCase()}`}
                  onChange={(e) => onUpdateSessionName(e.target.value)}
                  placeholder="Ej: SESIÓN LUNES - PIERNA A..."
                  className="w-full bg-white border border-slate-300 p-2.5 text-xs font-sora-bold uppercase text-black focus:border-[#004b73] focus:outline-none"
                  style={{ color: '#000000' }}
                />
              </div>
              <div>
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide flex items-center gap-1">
                  <i className="fa-solid fa-user-doctor"></i> Indicación Clínica para {activeDay}:
                </label>
                <input
                  type="text"
                  value={routine.notes || ''}
                  onChange={(e) => onUpdateNote(e.target.value)}
                  placeholder="Ej: Realizar calentamiento de movilidad articular de 5 a 10 min..."
                  className="w-full bg-white border border-slate-300 p-2.5 text-xs text-black focus:border-[#004b73] focus:outline-none font-poppins-regular"
                  style={{ color: '#000000' }}
                />
              </div>
            </div>

            {/* Planificador Spreadsheet */}
            <div className="bg-white border border-slate-300 shadow-md overflow-hidden space-y-0 mt-3">
              <div
                className="bg-[#004b73] text-black px-5 py-3 text-sm sm:text-base font-sora-bold italic uppercase tracking-wider flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#003857] shadow-inner"
                style={{ color: '#000000' }}
              >
                <div className="flex items-center gap-2 flex-1 w-full sm:w-auto flex-wrap">
                  <i className="fa-solid fa-pen-to-square text-lg shrink-0"></i>
                  <span className="shrink-0 font-sora-bold">PLANIFICADOR COACH:</span>
                  <div className="relative flex-1 min-w-[200px] max-w-md">
                    <input
                      type="text"
                      value={routine.sessionName || `SESIÓN ${activeDay.toUpperCase()}`}
                      onChange={(e) => onUpdateSessionName(e.target.value)}
                      placeholder="SESIÓN LUNES - PIERNA A"
                      className="w-full bg-white/90 hover:bg-white focus:bg-white border border-[#003857]/50 focus:border-[#003857] px-3.5 py-1.5 text-xs sm:text-sm font-sora-bold italic uppercase transition outline-none shadow-inner"
                      style={{ color: '#000000' }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-poppins-regular not-italic bg-white/30 px-3 py-1.5 border border-black/10 shrink-0"
                    style={{ color: '#000000' }}
                  >
                    {routine.exercises ? routine.exercises.length : 0} ejercicios prescritos
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full text-xs text-left border-collapse min-w-[850px]">
                  <thead>
                    <tr
                      className="bg-[#003857] text-white font-sora-bold italic uppercase text-xs tracking-wide divide-x divide-white/15 border-b-2 border-[#004b73] text-center shadow-md"
                      style={{ color: '#FFFFFF' }}
                    >
                      <th className="py-3.5 px-2 w-16" style={{ color: '#FFFFFF' }}>
                        ORDEN
                      </th>
                      <th className="py-3.5 px-3 w-44" style={{ color: '#FFFFFF' }}>
                        PATRÓN
                      </th>
                      <th className="py-3.5 px-3 w-52" style={{ color: '#FFFFFF' }}>
                        EJERCICIOS
                      </th>
                      <th className="py-3.5 px-3 w-64" style={{ color: '#FFFFFF' }}>
                        SERIES
                      </th>
                      <th className="py-3.5 px-3 w-32" style={{ color: '#FFFFFF' }}>
                        REPETICIONES
                      </th>
                      <th className="py-3.5 px-3 w-48" style={{ color: '#FFFFFF' }}>
                        DESCANSO
                      </th>
                      <th
                        className="py-3.5 px-3 w-44 not-italic bg-[#1A3644] text-[#00fff6] font-sora-bold shadow-inner"
                        style={{ color: '#00fff6' }}
                      >
                        ACCIONES Y FILAS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {!routine.exercises || routine.exercises.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-12 text-center text-slate-500 font-poppins-regular bg-slate-50/50"
                        >
                          <i className="fa-solid fa-table text-3xl text-slate-300 block mb-2"></i>
                          No hay ejercicios en esta sesión. Haz clic en{' '}
                          <strong>&quot;+ Agregar Fila en Blanco&quot;</strong> o usa el catálogo inferior.
                        </td>
                      </tr>
                    ) : (
                      routine.exercises.map((ex, exIdx) => (
                        <tr
                          key={ex.id || exIdx}
                          className={`${
                            exIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'
                          } divide-x divide-slate-200 border-b border-slate-200 transition text-center`}
                        >
                          <td className="p-2">
                            <input
                              type="text"
                              value={ex.order || String.fromCharCode(65 + exIdx)}
                              onChange={(e) =>
                                onUpdateExerciseField(exIdx, 'order', e.target.value)
                              }
                              className="w-12 text-center font-sora-bold bg-white border border-slate-300 p-1.5 text-xs text-slate-800 focus:border-[#004b73] focus:outline-none shadow-xs"
                            />
                          </td>
                          <td className="p-2">
                            <select
                              value={ex.pattern || 'Bisagra de cadera'}
                              onChange={(e) =>
                                onUpdateExerciseField(exIdx, 'pattern', e.target.value)
                              }
                              className="w-full text-left italic bg-white border border-slate-300 py-1.5 pl-2 pr-4 text-xs text-slate-700 focus:border-[#004b73] focus:outline-none shadow-xs font-sora-medium cursor-pointer truncate"
                            >
                              <optgroup label="Patrones Principales">
                                {PATRONES_PRINCIPALES.map((p) => (
                                  <option key={p} value={p}>
                                    {p}
                                  </option>
                                ))}
                              </optgroup>
                              <optgroup label="Patrones Accesorios">
                                {PATRONES_ACCESORIOS.map((p) => (
                                  <option key={p} value={p}>
                                    {p}
                                  </option>
                                ))}
                              </optgroup>
                              {ex.pattern &&
                                !PATRONES_PRINCIPALES.includes(ex.pattern) &&
                                !PATRONES_ACCESORIOS.includes(ex.pattern) && (
                                  <option value={ex.pattern}>{ex.pattern}</option>
                                )}
                            </select>
                          </td>
                          <td className="p-2">
                            <div className="flex flex-col gap-1.5">
                              <div className="relative flex items-center">
                                <input
                                  type="text"
                                  list="catalogSuggestions"
                                  value={
                                    ex.name
                                      ? ex.name.charAt(0).toUpperCase() +
                                        ex.name.slice(1).toLowerCase()
                                      : ''
                                  }
                                  onChange={(e) =>
                                    onUpdateExerciseField(exIdx, 'name', e.target.value)
                                  }
                                  placeholder="Escribe o elige..."
                                  className="w-full text-left font-sora-bold normal-case bg-white border border-slate-300 py-1.5 pl-2 pr-7 text-xs text-[#004b73] focus:border-[#004b73] focus:outline-none shadow-xs truncate"
                                />
                                <select
                                  value=""
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      onUpdateExerciseField(exIdx, 'name', e.target.value);
                                    }
                                  }}
                                  title="Ver y elegir de todos los ejercicios"
                                  className="absolute right-0 top-0 bottom-0 w-6 opacity-80 hover:opacity-100 bg-transparent cursor-pointer text-slate-500 focus:outline-none text-xs"
                                >
                                  <option value="" disabled>
                                    ▼ Desplegar lista completa
                                  </option>
                                  {DEFAULT_CATALOG_GROUPS.map((grp) => (
                                    <optgroup key={grp.group} label={grp.group}>
                                      {grp.exercises.map((item) => (
                                        <option key={item} value={item}>
                                          {item}
                                        </option>
                                      ))}
                                    </optgroup>
                                  ))}
                                </select>
                              </div>
                              <button
                                type="button"
                                onClick={() => onOpenExerciseHistory(ex.name)}
                                className="text-[9px] bg-blue-50 border border-blue-200 text-[#004b73] hover:bg-[#004b73] hover:text-white transition px-1.5 py-0.5 flex items-center justify-center gap-1 cursor-pointer font-sora-bold uppercase mx-auto"
                              >
                                <i className="fa-solid fa-chart-line"></i> Ver Progreso
                              </button>
                            </div>
                          </td>
                          <td className="p-2 space-y-1.5">
                            <input
                              type="text"
                              value={ex.setsTarget || (ex.sets ? ex.sets.length : '3')}
                              onChange={(e) =>
                                onUpdateExerciseField(exIdx, 'setsTarget', e.target.value)
                              }
                              className="w-full text-center font-sora-bold text-xs bg-white border border-slate-300 p-1 text-slate-900 focus:border-[#004b73] focus:outline-none shadow-xs"
                              placeholder="Ej: 3 o 2+AMRAP"
                            />
                            <textarea
                              rows={2}
                              value={
                                ex.setsNote !== undefined
                                  ? ex.setsNote
                                  : 'Misma carga en todas las series. Auméntala un 2-3% cada vez que alcances el objetivo en todas ellas.'
                              }
                              onChange={(e) =>
                                onUpdateExerciseField(exIdx, 'setsNote', e.target.value)
                              }
                              className="w-full text-[10px] text-slate-600 font-poppins-regular bg-white border border-slate-300 p-1 text-center focus:border-[#004b73] focus:outline-none shadow-xs leading-tight"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={ex.repsTarget || '8'}
                              onChange={(e) =>
                                onUpdateExerciseField(exIdx, 'repsTarget', e.target.value)
                              }
                              className="w-full text-center font-sora-bold text-xs bg-white border border-slate-300 p-1.5 text-slate-900 focus:border-[#004b73] focus:outline-none shadow-xs"
                              placeholder="Ej: 8, 10"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={ex.rest || 'Lo justo para rendir al 100% en cada serie'}
                              onChange={(e) =>
                                onUpdateExerciseField(exIdx, 'rest', e.target.value)
                              }
                              className="w-full text-center font-poppins-regular text-xs bg-white border border-slate-300 p-1.5 text-slate-700 focus:border-[#004b73] focus:outline-none shadow-xs"
                            />
                          </td>
                          <td className="p-2.5 bg-slate-50 space-y-2 text-center">
                            <div className="text-[10px] font-sora-bold text-slate-600">
                              Filas de registro:{' '}
                              <span className="text-[#004b73] bg-blue-100 px-1.5 py-0.5 font-mono">
                                {ex.sets ? ex.sets.length : 3} series
                              </span>
                            </div>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => onChangeExerciseSets(exIdx, -1)}
                                className="px-2 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-sora-bold text-[10px] cursor-pointer"
                                title="Quitar 1 fila"
                              >
                                - Serie
                              </button>
                              <button
                                type="button"
                                onClick={() => onChangeExerciseSets(exIdx, 1)}
                                className="px-2 py-1 bg-[#004b73] text-white font-sora-bold text-[10px] shadow hover:bg-[#003857] cursor-pointer"
                                style={{ color: '#FFFFFF' }}
                                title="Añadir 1 fila"
                              >
                                + Serie
                              </button>
                            </div>
                            <div className="pt-1 border-t border-slate-200 flex justify-center">
                              <button
                                type="button"
                                onClick={() => onRemoveExercise(exIdx)}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-sora-bold text-[10px] flex items-center gap-1 border border-rose-200 transition shadow-xs cursor-pointer"
                              >
                                <i className="fa-solid fa-trash-can"></i>
                                <span>Eliminar Fila</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Botón para Agregar Fila Rápida en Blanco */}
              <div className="p-3.5 bg-slate-50 border-t border-slate-300 flex justify-between items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={onAddBlankExercise}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 text-slate-950 font-sora-bold text-xs shadow transition flex items-center gap-2 border border-amber-600/30 cursor-pointer"
                >
                  <i className="fa-solid fa-table-cells-plus"></i> + Agregar Fila en Blanco a la
                  Sesión
                </button>
                <span className="text-xs text-slate-500 font-poppins-regular italic">
                  Tip: Modifica las celdas directamente; todo se guarda al instante.
                </span>
              </div>
            </div>

            {/* Datalist de ejercicios */}
            <datalist id="catalogSuggestions">
              {catalog.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>

            {/* Caja para Añadir Ejercicio desde Catálogo */}
            <div className="bg-white border border-slate-300 p-4 shadow-sm space-y-3 mt-4">
              <h5 className="text-xs font-sora-bold text-[#004b73] uppercase tracking-wide flex items-center gap-1.5">
                <i className="fa-solid fa-book-open"></i> O añadir desde el Catálogo Global a la
                Sesión de {activeDay}
              </h5>
              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch">
                <select
                  value={selectedCatalogEx}
                  onChange={(e) => setSelectedCatalogEx(e.target.value)}
                  className="flex-1 bg-[#F0F6F9] border border-[#E2E8F0] px-3 py-2.5 text-xs font-sora-medium text-[#1A3644] focus:border-[#004b73] focus:outline-none truncate cursor-pointer"
                >
                  <option value="">-- Seleccionar Ejercicio del Catálogo --</option>
                  {catalog.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={customCatalogEx}
                  onChange={(e) => setCustomCatalogEx(e.target.value)}
                  placeholder="O escribir ejercicio nuevo..."
                  className="flex-1 bg-[#F0F6F9] border border-[#E2E8F0] px-3 py-2.5 text-xs font-poppins-regular text-[#1A3644] focus:border-[#004b73] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCatalogSubmit}
                  className="px-5 py-3 shrink-0 font-sora-bold text-xs bg-[#004b73] hover:bg-[#003857] text-white shadow-sm transition whitespace-nowrap flex items-center justify-center cursor-pointer"
                  style={{ color: '#FFFFFF' }}
                >
                  + Añadir al Plan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
