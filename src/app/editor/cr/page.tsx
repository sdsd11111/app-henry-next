'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import VipAdminView from '@/components/VipAdminView';
import CloneRoutineModal from '@/components/CloneRoutineModal';
import ShareVipModal from '@/components/ShareVipModal';
import ExerciseHistoryModal from '@/components/ExerciseHistoryModal';
import { VipClient, DayRoutine } from '@/lib/types';
import { CATALOG_FLAT } from '@/lib/catalog';

function emptyRoutine(): DayRoutine {
  return { sessionName: '', notes: '', exercises: [], cardio: [], isMenstrualCycle: false };
}

const MAGIC_SECRET = 'cr_magic_2026';

function MagicEditorContent() {
  const searchParams = useSearchParams();
  const secret = searchParams.get('key') || searchParams.get('secret') || '';

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [crClient, setCrClient] = useState<VipClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  // Modales
  const [modalShareVip, setModalShareVip] = useState<VipClient | null>(null);
  const [modalCloneRoutine, setModalCloneRoutine] = useState<string | null>(null);
  const [modalHistory, setModalHistory] = useState(false);
  const [historyExercise, setHistoryExercise] = useState('');

  const syncRoutineToDb = useCallback(async (clientId: string, day: string, routine: DayRoutine) => {
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_routine',
          clientId,
          day,
          routine,
        }),
      });
    } catch (e) {
      console.error('Error sincronizando rutina de CR:', e);
    }
  }, []);

  const loadCrData = useCallback(async () => {
    if (secret !== MAGIC_SECRET) {
      setAuthorized(false);
      setIsLoading(false);
      return;
    }
    setAuthorized(true);
    try {
      const res = await fetch(`/api/routines?clientId=vip_cr&secret=${MAGIC_SECRET}`);
      const data = await res.json();
      if (data.vipClients && data.vipClients.length > 0) {
        setCrClient(data.vipClients[0]);
      }
    } catch (err) {
      console.error('Error cargando datos de CR:', err);
    } finally {
      setIsLoading(false);
    }
  }, [secret]);

  useEffect(() => {
    loadCrData();
  }, [loadCrData]);

  // Routine Handlers
  const handleSelectDay = (day: string) => {
    setCrClient((prev) => (prev ? { ...prev, activeDay: day } : null));
  };

  const handleUpdateSessionName = (sessionName: string) => {
    if (!crClient) return;
    const day = crClient.activeDay || crClient.assignedDays?.[0] || 'Lunes';
    const routine = crClient.routines?.[day] ?? emptyRoutine();
    const updatedRoutine = { ...routine, sessionName };
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => syncRoutineToDb(crClient.id, day, updatedRoutine), 600);
    setCrClient({ ...crClient, routines: { ...crClient.routines, [day]: updatedRoutine } });
  };

  const handleUpdateNote = (notes: string) => {
    if (!crClient) return;
    const day = crClient.activeDay || crClient.assignedDays?.[0] || 'Lunes';
    const routine = crClient.routines?.[day] ?? emptyRoutine();
    const updatedRoutine = { ...routine, notes };
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => syncRoutineToDb(crClient.id, day, updatedRoutine), 600);
    setCrClient({ ...crClient, routines: { ...crClient.routines, [day]: updatedRoutine } });
  };

  const handleToggleMenstrualCycle = (clientId: string) => {
    if (!crClient) return;
    const day = crClient.activeDay || crClient.assignedDays?.[0] || 'Lunes';
    const routine = crClient.routines?.[day] ?? emptyRoutine();
    const updatedRoutine = { ...routine, isMenstrualCycle: !routine.isMenstrualCycle };
    syncRoutineToDb(clientId, day, updatedRoutine);
    setCrClient({ ...crClient, routines: { ...crClient.routines, [day]: updatedRoutine } });
  };

  const handleUpdateExerciseField = (exIndex: number, field: string, value: any) => {
    if (!crClient) return;
    const day = crClient.activeDay || crClient.assignedDays?.[0] || 'Lunes';
    const routine = crClient.routines?.[day] ?? emptyRoutine();
    const exercises = [...(routine.exercises || [])];
    if (!exercises[exIndex]) return;
    exercises[exIndex] = { ...exercises[exIndex], [field]: value };
    const updatedRoutine = { ...routine, exercises };
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => syncRoutineToDb(crClient.id, day, updatedRoutine), 600);
    setCrClient({ ...crClient, routines: { ...crClient.routines, [day]: updatedRoutine } });
  };

  const handleChangeExerciseSets = (exIndex: number, delta: number) => {
    if (!crClient) return;
    const day = crClient.activeDay || crClient.assignedDays?.[0] || 'Lunes';
    const routine = crClient.routines?.[day] ?? emptyRoutine();
    const exercises = [...(routine.exercises || [])];
    if (!exercises[exIndex]) return;
    const sets = [...(exercises[exIndex].sets || [])];
    if (delta > 0) {
      const lastSet = sets[sets.length - 1];
      sets.push({
        id: 'vs_' + Date.now() + '_' + (sets.length + 1),
        setNumber: sets.length + 1,
        weight: lastSet?.weight || 0,
        reps: lastSet?.reps || 0,
        completed: false,
      });
    } else if (delta < 0 && sets.length > 1) {
      sets.pop();
    }
    exercises[exIndex] = { ...exercises[exIndex], sets, setsTarget: String(sets.length) };
    const updatedRoutine = { ...routine, exercises };
    syncRoutineToDb(crClient.id, day, updatedRoutine);
    setCrClient({ ...crClient, routines: { ...crClient.routines, [day]: updatedRoutine } });
  };

  const handleRemoveExercise = (exIndex: number) => {
    if (!crClient) return;
    const day = crClient.activeDay || crClient.assignedDays?.[0] || 'Lunes';
    const routine = crClient.routines?.[day] ?? emptyRoutine();
    const exercises = (routine.exercises || []).filter((_, i) => i !== exIndex);
    const updatedRoutine = { ...routine, exercises };
    syncRoutineToDb(crClient.id, day, updatedRoutine);
    setCrClient({ ...crClient, routines: { ...crClient.routines, [day]: updatedRoutine } });
  };

  const handleAddBlankExercise = () => {
    if (!crClient) return;
    const day = crClient.activeDay || crClient.assignedDays?.[0] || 'Lunes';
    const routine = crClient.routines?.[day] ?? emptyRoutine();
    const exCount = (routine.exercises || []).length;
    const orderLetter = String.fromCharCode(65 + exCount);
    const newEx = {
      id: 've_' + Date.now(),
      order: orderLetter,
      pattern: 'Bisagra de cadera',
      name: 'NUEVO EJERCICIO',
      setsTarget: '3',
      setsNote: 'Misma carga en todas las series.',
      repsTarget: '8-10',
      rest: 'Lo justo para rendir al 100% en cada serie',
      rpe: 8,
      sets: [
        { id: 'vs_1', setNumber: 1, weight: 0, reps: 0, completed: false },
        { id: 'vs_2', setNumber: 2, weight: 0, reps: 0, completed: false },
        { id: 'vs_3', setNumber: 3, weight: 0, reps: 0, completed: false },
      ],
    };
    const updatedRoutine = { ...routine, exercises: [...(routine.exercises || []), newEx] };
    syncRoutineToDb(crClient.id, day, updatedRoutine);
    setCrClient({ ...crClient, routines: { ...crClient.routines, [day]: updatedRoutine } });
  };

  const handleAddCatalogExercise = (name: string) => {
    if (!crClient) return;
    const day = crClient.activeDay || crClient.assignedDays?.[0] || 'Lunes';
    const routine = crClient.routines?.[day] ?? emptyRoutine();
    const exCount = (routine.exercises || []).length;
    const orderLetter = String.fromCharCode(65 + exCount);
    const newEx = {
      id: 've_' + Date.now(),
      order: orderLetter,
      pattern: 'Patrón Principal',
      name: name.toUpperCase(),
      setsTarget: '3',
      setsNote: 'Misma carga en todas las series.',
      repsTarget: '8-10',
      rest: 'Lo justo para rendir al 100% en cada serie',
      rpe: 8,
      sets: [
        { id: 'vs_1', setNumber: 1, weight: 0, reps: 0, completed: false },
        { id: 'vs_2', setNumber: 2, weight: 0, reps: 0, completed: false },
        { id: 'vs_3', setNumber: 3, weight: 0, reps: 0, completed: false },
      ],
    };
    const updatedRoutine = { ...routine, exercises: [...(routine.exercises || []), newEx] };
    syncRoutineToDb(crClient.id, day, updatedRoutine);
    setCrClient({ ...crClient, routines: { ...crClient.routines, [day]: updatedRoutine } });
  };

  const handleSyncAll = async () => {
    if (!crClient) return;
    setIsSyncing(true);
    try {
      const routinesPayload: Record<string, any> = {};
      if (crClient.routines) {
        for (const [day, routine] of Object.entries(crClient.routines)) {
          routinesPayload[`routine_${crClient.id}_${day}`] = routine;
        }
      }
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_all', payload: { routines: routinesPayload } }),
      });
      alert('✅ Cambios guardados para CR exitosamente.');
    } catch (err) {
      console.error('Error syncing CR:', err);
      alert('Error al sincronizar datos.');
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F4F8FB]">
        <div className="w-10 h-10 border-4 border-[#004b73] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-mono text-slate-500">Cargando Editor Mágico CR...</p>
      </div>
    );
  }

  if (!authorized || !crClient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F4F8FB] p-6 text-center">
        <div className="bg-white border border-red-200 p-8 max-w-md shadow-md">
          <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-xl">
            <i className="fa-solid fa-lock"></i>
          </div>
          <h2 className="text-sm font-sora-bold text-slate-800 uppercase tracking-wider mb-2">Acceso No Autorizado</h2>
          <p className="text-xs text-slate-500 mb-6">
            Este enlace mágico requiere una clave secreta válida para acceder al editor privado.
          </p>
          <div className="text-[11px] font-mono bg-slate-100 p-2 text-slate-600">
            Link: /editor/cr?key=cr_magic_2026
          </div>
        </div>
      </div>
    );
  }

  const clientsList = [crClient];

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-[#F4F8FB]">
      <Header
        appMode="coach"
        coachLoggedIn={true}
        coachInfo={{ id: 'magic_cr', name: 'Master Editor CR', username: 'CR' }}
        coachTab="vip"
        onSwitchMode={() => {}}
        onCoachLogout={() => {}}
        onSwitchCoachTab={() => {}}
      />

      <div className="bg-[#002f48] text-white px-4 py-2 text-xs flex justify-between items-center shadow-inner">
        <span className="flex items-center gap-2">
          <i className="fa-solid fa-wand-magic-sparkles text-amber-400"></i>
          <strong>Link Mágico Activo:</strong> Editando perfil privado <strong>CR</strong> (Invisible para los demás coach)
        </span>
        <button
          onClick={handleSyncAll}
          disabled={isSyncing}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-sora-bold px-3 py-1 text-[11px] shadow transition cursor-pointer"
        >
          {isSyncing ? 'Guardando...' : '💾 Guardar Cambios'}
        </button>
      </div>

      <main className="flex-1 w-full mx-auto p-3 sm:p-6 xl:px-12 space-y-5">
        <VipAdminView
          vipClients={clientsList}
          selectedClientId={crClient.id}
          catalog={CATALOG_FLAT}
          onSelectClient={() => {}}
          onOpenAddVipModal={() => {}}
          onOpenEditVipModal={() => {}}
          onOpenShareVipModal={(id) => {
            if (crClient.id === id) setModalShareVip(crClient);
          }}
          onOpenCloneRoutineModal={(id) => setModalCloneRoutine(id)}
          onDeleteVipClient={() => alert('No se puede eliminar la cuenta personal CR desde aquí.')}
          onSelectDay={handleSelectDay}
          onUpdateSessionName={handleUpdateSessionName}
          onUpdateNote={handleUpdateNote}
          onToggleMenstrualCycle={handleToggleMenstrualCycle}
          onUpdateExerciseField={handleUpdateExerciseField}
          onChangeExerciseSets={handleChangeExerciseSets}
          onRemoveExercise={handleRemoveExercise}
          onAddBlankExercise={handleAddBlankExercise}
          onAddCatalogExercise={handleAddCatalogExercise}
          onOpenExerciseHistory={(name) => {
            setHistoryExercise(name);
            setModalHistory(true);
          }}
          onSyncAll={handleSyncAll}
          isSyncing={isSyncing}
        />
      </main>

      {/* Modales */}
      {modalShareVip && (
        <ShareVipModal client={modalShareVip} onClose={() => setModalShareVip(null)} />
      )}

      {modalCloneRoutine && (
        <CloneRoutineModal
          targetClientId={modalCloneRoutine}
          vipClients={clientsList}
          onClose={() => setModalCloneRoutine(null)}
          onSaveClonedRoutine={async (targetId, updatedRoutines, updatedAssignedDays) => {
            setCrClient((prev) =>
              prev ? { ...prev, routines: updatedRoutines, assignedDays: updatedAssignedDays } : prev
            );
            try {
              const routinesPayload: Record<string, any> = {};
              for (const [d, r] of Object.entries(updatedRoutines)) {
                routinesPayload[`routine_${targetId}_${d}`] = r;
              }
              await fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'sync_all',
                  payload: {
                    clients: [{ id: targetId, assignedDays: updatedAssignedDays }],
                    routines: routinesPayload,
                  },
                }),
              });
            } catch (e) {
              console.error('Error sincronizando rutina clonada:', e);
            }
          }}
        />
      )}

      {modalHistory && (
        <ExerciseHistoryModal
          exerciseName={historyExercise}
          logs={crClient.logs || []}
          onClose={() => setModalHistory(false)}
        />
      )}
    </div>
  );
}

export default function MagicEditorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#F4F8FB]">
          <div className="w-10 h-10 border-4 border-[#004b73] border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <MagicEditorContent />
    </Suspense>
  );
}
