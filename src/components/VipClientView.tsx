'use client';

import React, { useState } from 'react';
import { VipClient, DayRoutine, RoutineExercise, ExerciseSet } from '@/lib/types';
import ProgressiveOverloadModal from '@/components/ProgressiveOverloadModal';

interface VipClientViewProps {
  client: VipClient | null;
  onLogin: (username: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  onLogout: () => void;
  onSelectDay: (day: string) => void;
  onUpdateSet: (exIndex: number, setIndex: number, field: 'weight' | 'reps', value: number | string) => void;
  onToggleSetCompleted: (exIndex: number, setIndex: number) => void;
  onAddSet: (exIndex: number) => void;
  onUpdateWellness: (field: string, value: any) => void;
  onToggleMenstrualCycle: () => void;
  onSaveSessionLog: (notes: string, stagedOverload?: Record<number, number>) => Promise<void>;
  onDeleteLog: (logIndex: number) => Promise<void>;
  onOpenExerciseHistory: (exName: string) => void;
}

export default function VipClientView({
  client,
  onLogin,
  onLogout,
  onSelectDay,
  onUpdateSet,
  onToggleSetCompleted,
  onAddSet,
  onUpdateWellness,
  onToggleMenstrualCycle,
  onSaveSessionLog,
  onDeleteLog,
  onOpenExerciseHistory,
}: VipClientViewProps) {
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Sobrecarga progresiva estado
  const [pendingOverload, setPendingOverload] = useState<{
    exIndex: number;
    exerciseName: string;
    targetReps: number;
    currentWeight: number;
    suggestedWeight: number;
  } | null>(null);

  // Overloads programados para la próxima sesión: { [exIndex]: nuevoPeso }
  const [stagedOverloads, setStagedOverloads] = useState<Record<number, number>>({});

  // If client is not logged in, render exclusive login card
  if (!client) {
    const handleFormSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoginError('');
      setLoginLoading(true);
      const res = await onLogin(loginUser.trim(), loginPass.trim());
      setLoginLoading(false);
      if (!res.success) {
        setLoginError(res.error || 'Credenciales inválidas');
      }
    };

    return (
      <div className="max-w-md mx-auto py-8 sm:py-12 px-4">
        <div className="bg-white border border-[#e4e4e7] p-6 sm:p-8 shadow-xl relative overflow-hidden space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-gradient-to-tr from-[#004b73] to-[#003857] text-white flex items-center justify-center mx-auto shadow-md text-2xl mb-3 ring-4 ring-blue-50">
              <i className="fa-solid fa-user-lock"></i>
            </div>
            <h3 className="text-xl font-sora-bold text-[#1A3644]">Team Henry Castillo</h3>
            <p className="text-xs text-slate-500 font-poppins-regular">
              Accede a tu planificación personalizada y registro de cargas
            </p>
          </div>

          {loginError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-sora-bold text-center">
              {loginError}
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-sora-bold text-[#004b73] mb-1 uppercase tracking-wider">
                Usuario / Código Exclusivo
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                  <i className="fa-solid fa-user text-xs"></i>
                </span>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="Ej: silvia_vip"
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-[#F0F6F9] border border-[#E2E8F0] text-xs font-mono text-[#1A3644] focus:border-[#004b73] focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-sora-bold text-[#004b73] mb-1 uppercase tracking-wider">
                Contraseña / Clave
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                  <i className="fa-solid fa-key text-xs"></i>
                </span>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-[#F0F6F9] border border-[#E2E8F0] text-xs font-mono text-[#1A3644] focus:border-[#004b73] focus:outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-[#004b73] hover:bg-[#003857] text-black font-sora-bold py-3 text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              style={{ color: '#000000' }}
            >
              {loginLoading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <span>Ingresando...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-arrow-right-to-bracket"></i>
                  <span>Entrar a Mi Entrenamiento</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const activeDay = client.activeDay || (client.assignedDays && client.assignedDays[0]) || 'Lunes';
  const routinesMap = client.routines || {};
  const routine: DayRoutine = routinesMap[activeDay] || { exercises: [], cardio: [] };
  const completedSetsCount = (routine.exercises || []).reduce(
    (acc, ex) => acc + (ex.sets ? ex.sets.filter((s) => s.completed).length : 0),
    0
  );
  const totalSetsCount = (routine.exercises || []).reduce(
    (acc, ex) => acc + (ex.sets ? ex.sets.length : 0),
    0
  );
  const progressPercent = totalSetsCount > 0 ? Math.round((completedSetsCount / totalSetsCount) * 100) : 0;
  const wellness = routine.wellness || { mood: null, sleep: null, nutrition: null, weight: 0 };

  const handleToggleSetWithOverloadCheck = (exIndex: number, setIndex: number) => {
    onToggleSetCompleted(exIndex, setIndex);

    const ex = routine.exercises?.[exIndex];
    if (!ex || !ex.sets || ex.sets.length === 0) return;

    // Crear simulación del estado de sets tras el clic
    const simulatedSets = ex.sets.map((s, idx) => ({
      ...s,
      completed: idx === setIndex ? !s.completed : s.completed,
    }));

    // Extraer objetivo de repeticiones
    const repsTargetStr = String(ex.repsTarget || '');
    const nums = repsTargetStr.match(/\d+/g);
    let targetReps = 0;
    if (nums && nums.length > 0) {
      targetReps = Math.max(...nums.map(Number));
    } else {
      targetReps = ex.sets[0] && Number(ex.sets[0].reps) > 0 ? Number(ex.sets[0].reps) : 8;
    }

    if (targetReps <= 0) return;

    // Verificar si todas las series cumplen objetivo de repeticiones y peso
    const allSetsMet = simulatedSets.every((s) => {
      const r = Number(s.reps) || 0;
      const w = Number(s.weight) || 0;
      return r >= targetReps && w > 0 && s.completed;
    });

    if (allSetsMet && !ex.progressionPrompted) {
      const currentWeight = Math.max(...simulatedSets.map((s) => Number(s.weight) || 0));
      const minInc = currentWeight * 0.02;
      const maxInc = currentWeight * 0.03;
      let sugRounded = Math.round((currentWeight + (minInc + maxInc) / 2) * 2) / 2;
      if (sugRounded <= currentWeight) sugRounded = Number((currentWeight + 0.5).toFixed(1));

      setPendingOverload({
        exIndex,
        exerciseName: ex.name,
        targetReps,
        currentWeight,
        suggestedWeight: sugRounded,
      });
    }
  };

  const handleApplyOverload = () => {
    if (!pendingOverload) return;
    const { exIndex, suggestedWeight, exerciseName } = pendingOverload;
    const ex = routine.exercises?.[exIndex];
    if (ex) {
      ex.progressionPrompted = true;
    }
    // Guardamos la carga sugerida para aplicarla a la siguiente sesión al guardar
    setStagedOverloads((prev) => ({ ...prev, [exIndex]: suggestedWeight }));
    setPendingOverload(null);
    alert(
      `🚀 ¡Anotado! Tu entrenamiento de hoy se registrará con la carga lograda (${pendingOverload.currentWeight} kg). Al guardar la sesión, "${exerciseName}" se actualizará automáticamente a ${suggestedWeight} kg para tu próxima rutina.`
    );
  };

  const handleSaveRoutine = async () => {
    setIsSaving(true);
    await onSaveSessionLog(sessionNotes, stagedOverloads);
    setIsSaving(false);
    setSessionNotes('');
    setStagedOverloads({});
  };

  const handleSendWhatsApp = () => {
    const notesText = sessionNotes.trim() || 'Sesión completada con gran rendimiento.';
    const wellnessStr = `\n📋 *Check-in Diario:*\n- Ánimo: ${wellness.mood || '-'}/10\n- Sueño: ${wellness.sleep || '-'}\n- Nutrición: ${wellness.nutrition || '-'}\n- Peso: ${wellness.weight ? wellness.weight + ' kg' : '-'}\n`;
    const reportMsg = `¡Hola Coach ${(client.trainerId || 'henry').toUpperCase()}! 🏋️‍♂️\nTe comparto el reporte de mi sesión VIP:\n\n👤 *Socio:* ${client.name}\n📅 *Día:* ${activeDay}\n📊 *Progreso de series:* ${completedSetsCount}/${totalSetsCount} completadas\n${wellnessStr}\n📝 *Sensaciones y feedback de hoy:*\n"${notesText}"\n\n¡Quedo atento a tus indicaciones!`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(reportMsg)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Banner de Perfil del Socio VIP */}
      <div className="bg-white border border-slate-300 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-gradient-to-tr from-[#004b73] to-amber-500 text-white font-sora-bold text-lg flex items-center justify-center shadow-md shrink-0">
            {client.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-sora-bold text-[#1A3644]">{client.name}</h3>
              <span className="px-2 py-0.5 text-[10px] font-sora-bold bg-amber-50 text-amber-800 border border-amber-300">
                <i className="fa-solid fa-crown text-amber-500 mr-1"></i>Socio VIP
              </span>
            </div>
            <p className="text-xs text-slate-500 font-poppins-regular flex items-center gap-2 mt-0.5">
              <span>
                <i className="fa-solid fa-bullseye text-[#004b73] mr-1"></i>
                {client.goal}
              </span>
              <span>•</span>
              <span>
                <i className="fa-solid fa-user-tie text-[#004b73] mr-1"></i>
                Coach: <strong className="text-[#1A3644] uppercase">{client.trainerId}</strong>
              </span>
            </p>
            <div className="text-[11px] text-slate-600 font-poppins-regular flex items-center gap-2 mt-1.5">
              <span className="bg-white/80 border border-slate-200 px-2.5 py-0.5 flex items-center gap-1.5 shadow-sm">
                <i
                  className={`fa-solid ${
                    client.gender === 'Mujer' ? 'fa-venus text-pink-500' : 'fa-mars text-blue-500'
                  }`}
                ></i>{' '}
                {client.gender || 'Hombre'}
              </span>
              {client.gender === 'Mujer' && (
                <button
                  type="button"
                  onClick={onToggleMenstrualCycle}
                  className={`px-2.5 py-0.5 flex items-center gap-1.5 shadow-sm transition border cursor-pointer ${
                    routine.isMenstrualCycle
                      ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                  }`}
                  title="Haz clic para actualizar tu estado"
                >
                  <i
                    className={`fa-solid fa-droplet ${
                      routine.isMenstrualCycle ? 'text-rose-500' : 'text-slate-400'
                    } text-[10px]`}
                  ></i>
                  {routine.isMenstrualCycle ? 'Ciclo Activo' : 'Marcar Ciclo Menstrual'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={onLogout}
            className="px-3.5 py-2 text-xs font-sora-bold bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition flex items-center gap-1.5 cursor-pointer"
          >
            <i className="fa-solid fa-right-from-bracket"></i> <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Selector de Días y Barra de Progreso */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
        {/* Pestañas de Día */}
        <div className="lg:col-span-2 flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <div className="flex items-center gap-1.5 shrink-0 mr-1">
            <span className="text-xs font-sora-bold text-[#004b73] uppercase flex items-center">
              <i className="fa-solid fa-calendar-day mr-1"></i>Día:
            </span>
            <span className="text-[10px] text-slate-500 font-poppins-regular flex items-center gap-1 sm:hidden bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60 animate-pulse">
              <i className="fa-solid fa-arrows-left-right text-[#004b73] text-[9px]"></i> Desliza
            </span>
          </div>
          {(client.assignedDays || ['Lunes', 'Miércoles', 'Viernes']).map((day) => {
            const isSel = day === activeDay;
            const dayRoutine = client.routines[day] || { exercises: [] };
            const isDone =
              dayRoutine.exercises &&
              dayRoutine.exercises.length > 0 &&
              dayRoutine.exercises.every((ex) => ex.sets && ex.sets.every((s) => s.completed));
            return (
              <button
                key={day}
                type="button"
                onClick={() => onSelectDay(day)}
                className={`px-4 py-2 text-xs font-sora-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
                  isSel
                    ? 'bg-[#004b73] text-black shadow-md'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                }`}
                style={isSel ? { color: '#000000' } : {}}
              >
                <span>{day}</span>
                {isDone ? (
                  <i className="fa-solid fa-circle-check text-emerald-600 text-xs"></i>
                ) : (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 ${
                      isSel ? 'bg-black/10 text-black' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {dayRoutine.exercises ? dayRoutine.exercises.length : 0}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Resumen de progreso */}
        <div className="bg-white border border-slate-300 p-3 flex items-center gap-3 shadow-sm">
          <div className="flex-1">
            <div className="flex justify-between items-center text-xs font-sora-bold mb-1">
              <span className="text-[#1A3644]">Progreso del Día ({activeDay})</span>
              <span className="text-[#004b73] font-mono">
                {completedSetsCount}/{totalSetsCount} Sets ({progressPercent}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#004b73] to-emerald-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Indicación Clínica del Coach para hoy */}
      <div className="bg-[#00fff6]/10 border border-[#00b5b0]/30 p-4 flex items-start gap-3 shadow-sm">
        <div className="w-8 h-8 bg-[#004b73] text-white flex items-center justify-center font-sora-bold shrink-0 mt-0.5 shadow">
          <i className="fa-solid fa-quote-left text-xs" style={{ color: '#ffffff' }}></i>
        </div>
        <div className="flex-1">
          <h4 className="text-xs font-sora-bold text-[#004b73] uppercase tracking-wider flex items-center gap-1.5">
            <span>Indicación Clínica de tu Coach ({client.trainerId.toUpperCase()}) para hoy:</span>
          </h4>
          <p className="text-xs font-poppins-regular text-[#1A3644] mt-1 leading-relaxed italic">
            &quot;{routine.notes || 'Realiza un calentamiento de movilidad articular de 5 a 10 minutos antes de comenzar las series efectivas. Mantén la hidratación continua.'}&quot;
          </p>
        </div>
      </div>

      {/* Cuestionario de Bienestar Diario (Readiness Check) */}
      <div className="py-4 mb-4 mt-2 px-2 sm:px-4 bg-white border border-slate-200">
        <div className="flex justify-end mb-2">
          <div className="flex flex-col items-end mr-2 sm:mr-6">
            <label className="text-[10px] font-sora-bold text-slate-500 uppercase flex items-center gap-1 mb-1 border-b-2 border-slate-300 pb-0.5">
              <i className="fa-solid fa-weight-scale text-slate-700"></i> PESO EN KG
            </label>
            <input
              type="number"
              step="0.1"
              value={wellness.weight || ''}
              onChange={(e) => onUpdateWellness('weight', parseFloat(e.target.value) || 0)}
              className="w-20 bg-white border border-slate-300 p-1.5 text-center text-sm font-sora-bold text-[#1A3644] focus:border-[#004b73] focus:outline-none shadow-sm"
              placeholder="--"
            />
          </div>
        </div>

        <div className="space-y-5">
          {/* ESTADO DE ÁNIMO */}
          <div className="flex flex-col xl:flex-row xl:items-center gap-3">
            <div className="w-full xl:w-56 font-sora-bold text-sm text-[#1A3644] flex items-center justify-between">
              <span>Estado de ánimo:</span>
              <span className="text-[10px] text-slate-400 font-poppins-regular normal-case xl:hidden flex items-center gap-1">
                <i className="fa-solid fa-arrows-left-right text-[#004b73]"></i> Desliza horizontalmente
              </span>
            </div>
            <div className="flex-1 overflow-x-auto no-scrollbar pb-1">
              <div className="flex items-center justify-between gap-1 sm:gap-2 min-w-[500px]">
                <span className="text-[11px] text-slate-500 italic mr-1 shrink-0 text-right leading-tight">
                  Estresado/
                  <br />
                  ansioso
                </span>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => onUpdateWellness('mood', num)}
                    className={`flex-1 h-10 min-w-[28px] border text-sm font-sora-bold transition cursor-pointer ${
                      wellness.mood === num
                        ? 'bg-[#004b73] text-black border-[#004b73] shadow-md scale-105'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                    style={wellness.mood === num ? { color: '#000000' } : {}}
                  >
                    {num}
                  </button>
                ))}
                <span className="text-[11px] text-slate-500 italic ml-1 shrink-0 leading-tight">
                  Feliz/
                  <br />
                  relajado
                </span>
              </div>
            </div>
          </div>

          {/* SUEÑO */}
          <div className="flex flex-col xl:flex-row xl:items-center gap-2 sm:gap-3">
            <div className="w-full xl:w-56 font-sora-bold text-xs sm:text-sm text-[#1A3644]">
              ¿Cómo dormiste anoche?
            </div>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-3 w-full flex-1">
              {['Sueño profundo', 'Regular', 'No dormí'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onUpdateWellness('sleep', opt)}
                  className={`py-2 px-1.5 sm:py-2.5 border text-[11px] sm:text-xs font-sora-medium transition flex items-center justify-center gap-1 sm:gap-2 cursor-pointer ${
                    wellness.sleep === opt
                      ? 'bg-white text-[#1A3644] border-2 border-[#00fff6] shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <i
                    className={`fa-solid text-[10px] sm:text-xs shrink-0 ${
                      wellness.sleep === opt ? 'fa-circle-dot text-[#004b73]' : 'fa-regular fa-circle text-slate-400'
                    }`}
                  ></i>
                  <span className="truncate">{opt}</span>
                </button>
              ))}
            </div>
          </div>

          {/* NUTRICIÓN */}
          <div className="flex flex-col xl:flex-row xl:items-center gap-2 sm:gap-3">
            <div className="w-full xl:w-56 font-sora-bold text-xs sm:text-sm text-[#1A3644]">
              Nutrición las últimas 24 horas:
            </div>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-3 w-full flex-1">
              {['Cumplí con los macros', 'Regular', 'Terrible'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onUpdateWellness('nutrition', opt)}
                  className={`py-2 px-1.5 sm:py-2.5 border text-[11px] sm:text-xs font-sora-medium transition flex items-center justify-center gap-1 sm:gap-2 cursor-pointer ${
                    wellness.nutrition === opt
                      ? 'bg-white text-[#1A3644] border-2 border-[#00fff6] shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <i
                    className={`fa-solid text-[10px] sm:text-xs shrink-0 ${
                      wellness.nutrition === opt ? 'fa-circle-dot text-[#004b73]' : 'fa-regular fa-circle text-slate-400'
                    }`}
                  ></i>
                  <span className="truncate">{opt}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabla Maestro Spreadsheet de Rutina VIP */}
      <div className="bg-white border border-slate-300 shadow-xl overflow-hidden">
        {/* Barra Superior de Sesión */}
        <div
          className="bg-[#004b73] text-black px-5 py-3.5 text-sm sm:text-base font-sora-bold italic uppercase tracking-wider flex flex-row justify-between items-center gap-2 border-b border-[#003857] shadow-inner"
          style={{ color: '#000000' }}
        >
          <span className="flex items-center gap-2.5">
            <i className="fa-solid fa-table-list not-italic text-lg"></i>
            <span>{routine.sessionName || `SESIÓN ${activeDay.toUpperCase()}`}</span>
          </span>
          <span className="text-[10px] font-poppins-regular not-italic bg-black/20 text-white px-2.5 py-1 sm:hidden flex items-center gap-1 shrink-0">
            <i className="fa-solid fa-hand-pointer text-amber-300"></i> Desliza para ver más
          </span>
        </div>

        {/* Tabla Contenedor Horizontal */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[960px]">
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
                <th className="py-3.5 px-3 w-36" style={{ color: '#FFFFFF' }}>
                  REPETICIONES
                </th>
                <th className="py-3.5 px-3 w-48" style={{ color: '#FFFFFF' }}>
                  DESCANSO
                </th>
                <th
                  className="py-3.5 px-4 w-80 not-italic bg-[#1A3644] text-[#00fff6] font-sora-bold shadow-inner"
                  style={{ color: '#00fff6' }}
                >
                  REGISTRO DE CARGAS (HOY)
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
                    <i className="fa-solid fa-dumbbell text-3xl text-slate-300 block mb-2"></i>
                    No hay ejercicios programados en{' '}
                    <strong className="text-[#004b73]">{activeDay}</strong>. Tu coach actualizará tu
                    rutina pronto.
                  </td>
                </tr>
              ) : (
                routine.exercises.map((ex, exIndex) => {
                  const completedSets = ex.sets ? ex.sets.filter((s) => s.completed).length : 0;
                  const totalSets = ex.sets ? ex.sets.length : 0;
                  const isAllDone = totalSets > 0 && completedSets === totalSets;

                  return (
                    <tr
                      key={ex.id || exIndex}
                      className={`${
                        exIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'
                      } divide-x divide-slate-200 border-b border-slate-200 hover:bg-blue-50/20 transition text-center font-poppins-regular text-slate-700`}
                    >
                      <td className="p-3 font-sora-bold text-sm text-slate-800">
                        {ex.order || String.fromCharCode(65 + exIndex)}
                      </td>
                      <td className="p-3 italic text-slate-600 font-sora-medium">
                        {ex.pattern || 'Bisagra de cadera'}
                      </td>
                      <td className="p-3 font-sora-bold normal-case text-sm text-[#004b73] bg-blue-50/20 text-center">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <span className="leading-tight">
                            {ex.name
                              ? ex.name.charAt(0).toUpperCase() + ex.name.slice(1).toLowerCase()
                              : ''}
                          </span>
                          {isAllDone && (
                            <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 font-sora-bold shadow-sm">
                              <i className="fa-solid fa-check"></i> Completado
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenExerciseHistory(ex.name)}
                            className="mt-1 text-[9px] bg-blue-50 border border-blue-200 text-[#004b73] hover:bg-[#004b73] hover:text-white transition px-2 py-1 flex items-center justify-center gap-1 cursor-pointer font-sora-bold uppercase shadow-xs mx-auto"
                          >
                            <i className="fa-solid fa-chart-line"></i> Ver Progreso
                          </button>
                        </div>
                      </td>
                      <td className="p-3 text-left">
                        <div className="text-center font-sora-bold text-sm text-slate-900 mb-1">
                          {ex.setsTarget || (ex.sets ? ex.sets.length : '3')}
                        </div>
                        <div className="text-[11px] text-slate-500 leading-tight text-center font-poppins-regular">
                          {ex.setsNote ||
                            'Misma carga en todas las series. Auméntala un 2-3% cada vez que alcances el objetivo en todas ellas.'}
                        </div>
                      </td>
                      <td className="p-3 font-sora-bold text-sm text-slate-900">
                        {ex.repsTarget || '8'}
                      </td>
                      <td className="p-3 text-slate-600 leading-snug text-xs">
                        {ex.rest || 'Lo justo para rendir al 100% en cada serie'}
                      </td>
                      <td className="p-3 bg-slate-50/60 text-left">
                        <div className="space-y-1.5">
                          {(ex.sets || []).map((set, setIndex) => (
                            <div
                              key={set.id || setIndex}
                              className={`flex items-center justify-between gap-1.5 text-xs ${
                                set.completed
                                  ? 'bg-emerald-50/90 text-emerald-950 p-1.5 border border-emerald-300 font-sora-medium'
                                  : 'p-1 hover:bg-white'
                              } transition font-mono`}
                            >
                              <span className="font-sora-bold text-slate-500 w-5 text-center">
                                {setIndex + 1}:
                              </span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={set.weight !== undefined && set.weight !== null ? set.weight : ''}
                                  onFocus={(e) => {
                                    if (e.target.value === '0') e.target.select();
                                  }}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                      onUpdateSet(exIndex, setIndex, 'weight', val);
                                    }
                                  }}
                                  onBlur={(e) => {
                                    const num = parseFloat(e.target.value);
                                    onUpdateSet(exIndex, setIndex, 'weight', isNaN(num) ? 0 : num);
                                  }}
                                  className="w-14 bg-white border border-slate-300 px-1.5 py-0.5 text-xs font-sora-bold text-center text-[#1A3644] focus:border-[#004b73] focus:outline-none shadow-sm"
                                  title="Carga (Kg)"
                                />
                                <span className="text-[10px] text-slate-400">kg</span>
                              </div>
                              <span className="text-slate-300">×</span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={set.reps !== undefined && set.reps !== null ? set.reps : ''}
                                  onFocus={(e) => {
                                    if (e.target.value === '0') e.target.select();
                                  }}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '' || /^\d*$/.test(val)) {
                                      onUpdateSet(exIndex, setIndex, 'reps', val);
                                    }
                                  }}
                                  onBlur={(e) => {
                                    const num = parseInt(e.target.value, 10);
                                    onUpdateSet(exIndex, setIndex, 'reps', isNaN(num) ? 0 : num);
                                  }}
                                  className="w-12 bg-white border border-slate-300 px-1.5 py-0.5 text-xs font-sora-bold text-center text-[#1A3644] focus:border-[#004b73] focus:outline-none shadow-sm"
                                  title="Reps logradas"
                                />
                                <span className="text-[10px] text-slate-400">reps</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleSetWithOverloadCheck(exIndex, setIndex)}
                                className={`px-2.5 py-1 font-sora-bold text-[10px] transition ml-auto flex items-center gap-1 cursor-pointer ${
                                  set.completed
                                    ? 'bg-emerald-500 text-white shadow-sm'
                                    : 'bg-white hover:bg-blue-50 text-[#004b73] border border-slate-300'
                                }`}
                                title={set.completed ? 'Completada' : 'Marcar serie'}
                              >
                                <i
                                  className={`fa-solid ${
                                    set.completed ? 'fa-check-double' : 'fa-check'
                                  }`}
                                ></i>
                                <span className="hidden sm:inline">
                                  {set.completed ? 'Listo' : 'Marcar'}
                                </span>
                              </button>
                            </div>
                          ))}
                          <div className="flex justify-end items-center pt-2 border-t border-slate-200/80 text-[10px]">
                            <button
                              type="button"
                              onClick={() => onAddSet(exIndex)}
                              className="text-[#004b73] font-sora-bold hover:underline flex items-center gap-1 bg-blue-50/50 px-2 py-0.5 border border-blue-200/50 cursor-pointer"
                            >
                              <i className="fa-solid fa-plus text-[9px]"></i> + Serie
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Anotaciones Finales de Sesión */}
      <div className="bg-white border border-slate-300 p-5 shadow-lg space-y-4">
        <h4 className="text-sm font-sora-bold text-[#1A3644] flex items-center gap-2">
          <i className="fa-solid fa-comment-medical text-[#004b73]"></i> Retroalimentación y
          Sensaciones del Entrenamiento
        </h4>
        <p className="text-xs text-slate-500 font-poppins-regular">
          ¿Cómo sentiste las cargas hoy? ¿Alguna molestia articular o récord alcanzado? Tu coach
          revisará estas notas para calibrar tu próxima semana.
        </p>
        <textarea
          rows={2}
          value={sessionNotes}
          onChange={(e) => setSessionNotes(e.target.value)}
          placeholder="Ej: Sentí muy sólidas las sentadillas hoy, sin molestia lumbar. En prensa me quedó energía en la última serie..."
          className="w-full bg-[#F0F6F9] border border-[#E2E8F0] p-3 text-xs text-[#1A3644] focus:border-[#004b73] focus:outline-none font-poppins-regular"
        ></textarea>
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <button
            type="button"
            onClick={handleSendWhatsApp}
            className="w-full sm:w-auto px-5 py-3 whitespace-nowrap font-sora-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-black transition flex items-center justify-center gap-2 border border-emerald-500/50 cursor-pointer shadow-sm"
            style={{ color: '#000000' }}
          >
            <i className="fa-brands fa-whatsapp text-sm"></i>
            <span>Enviar Resumen por WhatsApp a Coach</span>
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveRoutine}
            className="w-full sm:w-auto px-6 py-3 whitespace-nowrap font-sora-bold text-xs bg-[#00fff6] hover:brightness-110 text-black transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
            style={{ color: '#000000' }}
          >
            {isSaving ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i>
                <span>Guardando en BD...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-paper-plane"></i>
                <span>Guardar Rutina</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Historial Reciente de Entrenamientos */}
      {client.logs && client.logs.length > 0 && (
        <div className="bg-slate-50 border border-slate-300 p-4 space-y-3">
          <h4 className="text-xs font-sora-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <i className="fa-solid fa-clock-rotate-left text-[#004b73]"></i> Tu Historial Reciente de
            Entrenamientos Registrados
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {client.logs
              .map((log, origIndex) => ({ log, origIndex }))
              .reverse()
              .slice(0, 6)
              .map(({ log, origIndex }) => (
                <div
                  key={origIndex}
                  className="bg-white p-3 border border-slate-200 text-xs space-y-2 shadow-sm relative hover:border-[#004b73]/40 transition"
                >
                  <div className="flex justify-between items-center font-sora-bold gap-2">
                    <span className="text-[#004b73] truncate">
                      {log.date} ({log.dayOfWeek})
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 font-mono">
                        {log.setsCount} series
                      </span>
                      <button
                        type="button"
                        onClick={() => onDeleteLog(origIndex)}
                        title="Eliminar registro"
                        className="w-6 h-6 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center transition cursor-pointer"
                        style={{ color: '#e11d48' }}
                      >
                        <i className="fa-solid fa-trash-can text-[11px]"></i>
                      </button>
                    </div>
                  </div>
                  <p className="text-slate-600 italic font-poppins-regular text-[11px] leading-relaxed">
                    &quot;{log.notes || 'Sesión completada y cargas registradas por el cliente.'}&quot;
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Monitor Semanal de Bienestar */}
      {client.logs && client.logs.length > 0 && (
        <div className="bg-white border border-slate-300 p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-sora-bold text-[#1A3644] uppercase tracking-wider flex items-center gap-1.5">
              <i className="fa-solid fa-heart-pulse text-rose-500"></i> Monitor Semanal de Bienestar
            </h4>
            <span className="text-[10px] text-slate-400 font-poppins-regular">Últimas 7 sesiones</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-[#003857] text-white font-sora-bold uppercase tracking-wide text-center divide-x divide-white/10">
                  <th className="py-2.5 px-3 text-left" style={{ color: '#FFFFFF' }}>Fecha</th>
                  <th className="py-2.5 px-3" style={{ color: '#FFFFFF' }}>Ánimo (1-10)</th>
                  <th className="py-2.5 px-3" style={{ color: '#FFFFFF' }}>Sueño</th>
                  <th className="py-2.5 px-3" style={{ color: '#FFFFFF' }}>Nutrición</th>
                  <th className="py-2.5 px-3" style={{ color: '#FFFFFF' }}>Peso</th>
                  <th className="py-2.5 px-3" style={{ color: '#FFFFFF' }}>Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {client.logs
                  .slice(-7)
                  .reverse()
                  .map((log, idx) => {
                    const mood = log.readiness?.mood;
                    const sleep = log.readiness?.sleep;
                    const nutrition = log.readiness?.nutrition;
                    const moodNum = typeof mood === 'number' ? mood : parseInt(String(mood), 10);
                    return (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        <td className="py-2.5 px-3 text-left font-sora-bold text-[#004b73]">
                          {log.date}<br />
                          <span className="text-[10px] font-poppins-regular text-slate-400">{log.dayOfWeek}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {moodNum > 0 ? (
                            <div className="flex items-center gap-1.5 justify-center">
                              <div className="h-2 bg-slate-200 flex-1 max-w-[80px] overflow-hidden rounded-full">
                                <div
                                  className="h-full bg-[#004b73] rounded-full transition-all"
                                  style={{ width: `${(moodNum / 10) * 100}%` }}
                                ></div>
                              </div>
                              <span className="font-sora-bold text-[#004b73]">{moodNum}</span>
                            </div>
                          ) : <span className="text-slate-300">--</span>}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {sleep ? (
                            <span className={`px-2 py-0.5 text-[10px] font-sora-bold ${
                              sleep === 'Sueño profundo' ? 'bg-emerald-100 text-emerald-700' :
                              sleep === 'Regular' ? 'bg-amber-100 text-amber-700' :
                              'bg-rose-100 text-rose-700'
                            }`}>{sleep}</span>
                          ) : <span className="text-slate-300">--</span>}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {nutrition ? (
                            <span className={`px-2 py-0.5 text-[10px] font-sora-bold ${
                              nutrition === 'Cumplí con los macros' ? 'bg-emerald-100 text-emerald-700' :
                              nutrition === 'Regular' ? 'bg-amber-100 text-amber-700' :
                              'bg-rose-100 text-rose-700'
                            }`}>{nutrition}</span>
                          ) : <span className="text-slate-300">--</span>}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                          --
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => onDeleteLog(client.logs.length - 1 - idx)}
                            className="w-6 h-6 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto transition cursor-pointer"
                          >
                            <i className="fa-solid fa-trash-can text-[10px]"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: SOBRECARGA PROGRESIVA ALCANZADA */}
      {pendingOverload && (
        <ProgressiveOverloadModal
          exerciseName={pendingOverload.exerciseName}
          targetReps={pendingOverload.targetReps}
          currentWeight={pendingOverload.currentWeight}
          suggestedWeight={pendingOverload.suggestedWeight}
          onAccept={handleApplyOverload}
          onClose={() => setPendingOverload(null)}
        />
      )}
    </div>
  );
}
