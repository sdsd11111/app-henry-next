'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import VipClientView from '@/components/VipClientView';
import ExerciseHistoryModal from '@/components/ExerciseHistoryModal';
import { VipClient, DayRoutine, WorkoutLog } from '@/lib/types';

function emptyRoutine(): DayRoutine {
  return { sessionName: '', notes: '', exercises: [], cardio: [], isMenstrualCycle: false };
}

function ClientePortalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [client, setClient] = useState<VipClient | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [modalHistory, setModalHistory] = useState<boolean>(false);
  const [historyExercise, setHistoryExercise] = useState<string>('');
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  // Restaurar sesión guardada o autologin si viene ?user=
  useEffect(() => {
    async function restoreSession() {
      try {
        const savedClientId = typeof window !== 'undefined' ? localStorage.getItem('hc_vip_client_id') : null;
        const res = await fetch('/api/routines');
        if (res.ok) {
          const data = await res.json();
          const vClients: VipClient[] = data.vipClients || [];
          
          const userParam = searchParams.get('user')?.trim().toLowerCase();
          let matchedClient: VipClient | undefined;

          if (userParam) {
            matchedClient = vClients.find(
              (c) =>
                c.username?.toLowerCase() === userParam ||
                c.name?.toLowerCase().includes(userParam)
            );
          } else if (savedClientId) {
            matchedClient = vClients.find((c) => String(c.id) === String(savedClientId));
          }

          if (matchedClient) {
            setClient(matchedClient);
            localStorage.setItem('hc_vip_client_id', matchedClient.id);
          }
        }
      } catch (err) {
        console.error('Error restaurando sesión de cliente:', err);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, [searchParams]);

  const handleLogin = useCallback(
    async (username: string, pass: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'vip_login', username, password: pass }),
        });
        const data = await res.json();
        if (data.success && data.client) {
          setClient(data.client);
          if (typeof window !== 'undefined') {
            localStorage.setItem('hc_vip_client_id', data.client.id);
          }
          return { success: true };
        }
        return { success: false, error: data.error || 'Credenciales inválidas' };
      } catch {
        return { success: false, error: 'Error de conexión con el servidor' };
      }
    },
    []
  );

  const handleLogout = useCallback(() => {
    setClient(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('hc_vip_client_id');
    }
  }, []);

  const handleSelectDay = useCallback((day: string) => {
    setClient((prev) => (prev ? { ...prev, activeDay: day } : prev));
  }, []);

  const syncRoutineToDb = useCallback(async (clientId: string, day: string, routineData: DayRoutine) => {
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_routine',
          clientId,
          routine: routineData,
          day,
        }),
      });
    } catch (err) {
      console.error('Error syncing routine to DB:', err);
    }
  }, []);

  const handleUpdateSet = useCallback(
    (exIndex: number, setIndex: number, field: string, value: any) => {
      if (!client) return;
      const day = client.activeDay || client.assignedDays?.[0] || 'Lunes';
      setClient((prev) => {
        if (!prev) return prev;
        const routine = prev.routines?.[day] ?? emptyRoutine();
        const exercises = [...(routine.exercises || [])];
        if (!exercises[exIndex]) return prev;
        const sets = [...(exercises[exIndex].sets || [])];
        if (!sets[setIndex]) return prev;
        sets[setIndex] = { ...sets[setIndex], [field]: value };
        exercises[exIndex] = { ...exercises[exIndex], sets };
        const updatedRoutine = { ...routine, exercises };
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(() => syncRoutineToDb(prev.id, day, updatedRoutine), 600);
        return { ...prev, routines: { ...prev.routines, [day]: updatedRoutine } };
      });
    },
    [client, syncRoutineToDb]
  );

  const handleToggleSetCompleted = useCallback(
    (exIndex: number, setIndex: number) => {
      if (!client) return;
      const day = client.activeDay || client.assignedDays?.[0] || 'Lunes';
      setClient((prev) => {
        if (!prev) return prev;
        const routine = prev.routines?.[day] ?? emptyRoutine();
        const exercises = [...(routine.exercises || [])];
        if (!exercises[exIndex]) return prev;
        const sets = [...(exercises[exIndex].sets || [])];
        if (!sets[setIndex]) return prev;
        sets[setIndex] = { ...sets[setIndex], completed: !sets[setIndex].completed };
        exercises[exIndex] = { ...exercises[exIndex], sets };
        const updatedRoutine = { ...routine, exercises };
        syncRoutineToDb(prev.id, day, updatedRoutine);
        return { ...prev, routines: { ...prev.routines, [day]: updatedRoutine } };
      });
    },
    [client, syncRoutineToDb]
  );

  const handleAddSet = useCallback(
    (exIndex: number) => {
      if (!client) return;
      const day = client.activeDay || client.assignedDays?.[0] || 'Lunes';
      setClient((prev) => {
        if (!prev) return prev;
        const routine = prev.routines?.[day] ?? emptyRoutine();
        const exercises = [...(routine.exercises || [])];
        if (!exercises[exIndex]) return prev;
        const sets = exercises[exIndex].sets || [];
        const lastSet = sets[sets.length - 1];
        const newSet = {
          setNumber: sets.length + 1,
          weight: lastSet?.weight || 0,
          reps: lastSet?.reps || 0,
          completed: false,
        };
        exercises[exIndex] = { ...exercises[exIndex], sets: [...sets, newSet] };
        const updatedRoutine = { ...routine, exercises };
        syncRoutineToDb(prev.id, day, updatedRoutine);
        return { ...prev, routines: { ...prev.routines, [day]: updatedRoutine } };
      });
    },
    [client, syncRoutineToDb]
  );

  const handleUpdateWellness = useCallback(
    (field: string, value: any) => {
      if (!client) return;
      const day = client.activeDay || client.assignedDays?.[0] || 'Lunes';
      setClient((prev) => {
        if (!prev) return prev;
        const routine = prev.routines?.[day] ?? emptyRoutine();
        const prevWellness = routine.wellness || { mood: null, sleep: null, nutrition: null, weight: 0 };
        const wellness = {
          ...prevWellness,
          [field]: value,
        };
        const updatedRoutine = { ...routine, wellness };
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(() => syncRoutineToDb(prev.id, day, updatedRoutine), 600);
        return { ...prev, routines: { ...prev.routines, [day]: updatedRoutine } };
      });
    },
    [client, syncRoutineToDb]
  );

  const handleToggleMenstrualCycle = useCallback(() => {
    if (!client) return;
    const day = client.activeDay || client.assignedDays?.[0] || 'Lunes';
    setClient((prev) => {
      if (!prev) return prev;
      const routine = prev.routines?.[day] ?? emptyRoutine();
      const updatedRoutine = { ...routine, isMenstrualCycle: !routine.isMenstrualCycle };
      syncRoutineToDb(prev.id, day, updatedRoutine);
      return {
        ...prev,
        routines: {
          ...prev.routines,
          [day]: updatedRoutine,
        },
      };
    });
  }, [client, syncRoutineToDb]);

  const handleSaveSessionLog = useCallback(
    async (notes: string, stagedOverload?: Record<number, number>) => {
      if (!client) return;
      const day = client.activeDay || client.assignedDays?.[0] || 'Lunes';
      const routine = client.routines?.[day] ?? emptyRoutine();
      const wellness = routine.wellness;

      const exercises = routine.exercises || [];
      const completedSets = exercises.reduce(
        (acc, ex) => acc + (ex.sets ? ex.sets.filter((s) => s.completed).length : 0),
        0
      );
      const totalSets = exercises.reduce((acc, ex) => acc + (ex.sets ? ex.sets.length : 0), 0);

      // Log records the actual weights lifted during this session
      const log: WorkoutLog = {
        id: 'log_' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        dayOfWeek: day,
        notes: notes || '',
        exercisesCount: exercises.length,
        setsCount: completedSets,
        readiness: {
          mood: wellness?.mood !== null && wellness?.mood !== undefined ? String(wellness.mood) : undefined,
          sleep: wellness?.sleep || undefined,
          nutrition: wellness?.nutrition || undefined,
        },
        exercises: exercises.map((ex) => ({
          name: ex.name,
          sets: (ex.sets || []).map((s) => ({ weight: s.weight, reps: s.reps, completed: Boolean(s.completed) })),
        })),
      };

      // Future routine: reset completed flags to false, and apply suggested overload weight to next session
      const nextExercises = exercises.map((ex, exIdx) => {
        const nextWeight = stagedOverload && stagedOverload[exIdx] !== undefined ? stagedOverload[exIdx] : null;
        return {
          ...ex,
          progressionPrompted: false,
          sets: (ex.sets || []).map((s) => ({
            ...s,
            weight: nextWeight !== null ? nextWeight : s.weight,
            completed: false,
          })),
        };
      });
      const routineForNextSession = { ...routine, exercises: nextExercises };

      try {
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save_log',
            clientId: client.id,
            log,
            routine: routineForNextSession,
            day,
          }),
        });

        setClient((prev) =>
          prev
            ? {
                ...prev,
                routines: { ...prev.routines, [day]: routineForNextSession },
                logs: [...(prev.logs || []), log],
              }
            : prev
        );
      } catch (err) {
        console.error('Error saving session log:', err);
      }
    },
    [client]
  );

  const handleDeleteLog = useCallback(
    async (logIndex: number) => {
      if (!client) return;
      const log = client.logs?.[logIndex];
      if (!log?.id) return;
      try {
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete_log', clientId: client.id, logId: log.id }),
        });
        setClient((prev) =>
          prev ? { ...prev, logs: (prev.logs || []).filter((_, i) => i !== logIndex) } : prev
        );
      } catch (err) {
        console.error('Error deleting log:', err);
      }
    },
    [client]
  );

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 min-h-screen bg-[#F4F8FB]">
        <Header
          appMode="vip_client"
          coachLoggedIn={false}
          coachInfo={null}
          coachTab="floor"
          onSwitchMode={(mode) => {
            if (mode === 'coach') router.push('/coach');
          }}
          onCoachLogout={() => {}}
          onSwitchCoachTab={() => {}}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div
              className="w-10 h-10 border-4 border-[#00fff6] border-t-transparent animate-spin mx-auto"
              style={{ borderRadius: '50%' }}
            ></div>
            <p className="text-sm text-slate-500 font-poppins-regular">Cargando datos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-[#F4F8FB]">
      <Header
        appMode="vip_client"
        coachLoggedIn={false}
        coachInfo={null}
        coachTab="floor"
        onSwitchMode={(mode) => {
          if (mode === 'coach') router.push('/coach');
        }}
        onCoachLogout={() => {}}
        onSwitchCoachTab={() => {}}
      />

      <main className="flex-1 w-full mx-auto p-3 sm:p-6 xl:px-12 space-y-5">
        <VipClientView
          client={client}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onSelectDay={handleSelectDay}
          onUpdateSet={handleUpdateSet}
          onToggleSetCompleted={handleToggleSetCompleted}
          onAddSet={handleAddSet}
          onUpdateWellness={handleUpdateWellness}
          onToggleMenstrualCycle={handleToggleMenstrualCycle}
          onSaveSessionLog={handleSaveSessionLog}
          onDeleteLog={handleDeleteLog}
          onOpenExerciseHistory={(name) => {
            setHistoryExercise(name);
            setModalHistory(true);
          }}
        />
      </main>

      {modalHistory && (
        <ExerciseHistoryModal
          exerciseName={historyExercise}
          logs={client?.logs || []}
          onClose={() => setModalHistory(false)}
        />
      )}
    </div>
  );
}

export default function ClientePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Cargando portal...</div>}>
      <ClientePortalContent />
    </Suspense>
  );
}
