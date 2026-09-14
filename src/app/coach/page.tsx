'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import VipAdminView from '@/components/VipAdminView';
import CloneRoutineModal from '@/components/CloneRoutineModal';
import EditVipClientModal from '@/components/EditVipClientModal';
import ShareVipModal from '@/components/ShareVipModal';
import ExerciseHistoryModal from '@/components/ExerciseHistoryModal';
import { VipClient, DayRoutine } from '@/lib/types';
import { CATALOG_FLAT } from '@/lib/catalog';

function emptyRoutine(): DayRoutine {
  return { sessionName: '', notes: '', exercises: [], cardio: [], isMenstrualCycle: false };
}

export default function CoachPage() {
  const router = useRouter();

  const [coachLoggedIn, setCoachLoggedIn] = useState(false);
  const [coachInfo, setCoachInfo] = useState<{ id: string; name: string; username: string } | null>(null);
  const [vipClients, setVipClients] = useState<VipClient[]>([]);
  const [selectedVipClientId, setSelectedVipClientId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  // Helper: Persist routine changes directly to MySQL
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
      console.error('Error sincronizando rutina a MySQL:', e);
    }
  }, []);

  // Modales
  const [modalAddVip, setModalAddVip] = useState(false);
  const [modalEditVip, setModalEditVip] = useState<VipClient | null>(null);
  const [modalShareVip, setModalShareVip] = useState<VipClient | null>(null);
  const [modalCloneRoutine, setModalCloneRoutine] = useState<string | null>(null);
  const [modalHistory, setModalHistory] = useState(false);
  const [historyExercise, setHistoryExercise] = useState('');

  // Cargar datos y restaurar sesión coach
  const loadData = useCallback(async () => {
    try {
      // Restaurar sesión de coach guardada
      if (typeof window !== 'undefined') {
        const savedCoach = localStorage.getItem('hc_coach_info');
        if (savedCoach) {
          try {
            const parsed = JSON.parse(savedCoach);
            setCoachLoggedIn(true);
            setCoachInfo(parsed);
          } catch (e) {
            console.error('Error parsing saved coach info', e);
          }
        }
      }

      const res = await fetch('/api/routines');
      const data = await res.json();
      if (data.vipClients) {
        setVipClients(data.vipClients);
        if (data.vipClients.length > 0 && !selectedVipClientId) {
          setSelectedVipClientId(data.vipClients[0].id);
        }
      }
    } catch (err) {
      console.error('Error cargando rutinas:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedVipClientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auth Coach
  const handleCoachLogin = async (username: string, password: string) => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'coach_login', username, password }),
      });
      const data = await res.json();
      if (data.success && data.coach) {
        setCoachLoggedIn(true);
        setCoachInfo(data.coach);
        if (typeof window !== 'undefined') {
          localStorage.setItem('hc_coach_info', JSON.stringify(data.coach));
        }
        return { success: true };
      }
      return { success: false, error: data.error || 'Credenciales inválidas' };
    } catch {
      return { success: false, error: 'Error de conexión' };
    }
  };

  const handleCoachLogout = () => {
    setCoachLoggedIn(false);
    setCoachInfo(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('hc_coach_info');
    }
  };

  // Rutinas updates
  const handleSelectDay = (day: string) => {
    if (!selectedVipClientId) return;
    setVipClients((prev) =>
      prev.map((c) => (c.id === selectedVipClientId ? { ...c, activeDay: day } : c))
    );
  };

  const handleUpdateSessionName = (sessionName: string) => {
    if (!selectedVipClientId) return;
    setVipClients((prev) =>
      prev.map((c) => {
        if (c.id !== selectedVipClientId) return c;
        const day = c.activeDay || c.assignedDays?.[0] || 'Lunes';
        const routine = c.routines?.[day] ?? emptyRoutine();
        const updatedRoutine = { ...routine, sessionName };
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(() => syncRoutineToDb(c.id, day, updatedRoutine), 600);
        return { ...c, routines: { ...c.routines, [day]: updatedRoutine } };
      })
    );
  };

  const handleUpdateNote = (notes: string) => {
    if (!selectedVipClientId) return;
    setVipClients((prev) =>
      prev.map((c) => {
        if (c.id !== selectedVipClientId) return c;
        const day = c.activeDay || c.assignedDays?.[0] || 'Lunes';
        const routine = c.routines?.[day] ?? emptyRoutine();
        const updatedRoutine = { ...routine, notes };
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(() => syncRoutineToDb(c.id, day, updatedRoutine), 600);
        return { ...c, routines: { ...c.routines, [day]: updatedRoutine } };
      })
    );
  };

  const handleToggleMenstrualCycle = (clientId: string) => {
    setVipClients((prev) =>
      prev.map((c) => {
        if (c.id !== clientId) return c;
        const day = c.activeDay || c.assignedDays?.[0] || 'Lunes';
        const routine = c.routines?.[day] ?? emptyRoutine();
        const updatedRoutine = { ...routine, isMenstrualCycle: !routine.isMenstrualCycle };
        syncRoutineToDb(clientId, day, updatedRoutine);
        return {
          ...c,
          routines: {
            ...c.routines,
            [day]: updatedRoutine,
          },
        };
      })
    );
  };

  const handleUpdateExerciseField = (exIndex: number, field: string, value: any) => {
    if (!selectedVipClientId) return;
    setVipClients((prev) =>
      prev.map((c) => {
        if (c.id !== selectedVipClientId) return c;
        const day = c.activeDay || c.assignedDays?.[0] || 'Lunes';
        const routine = c.routines?.[day] ?? emptyRoutine();
        const exercises = [...(routine.exercises || [])];
        if (!exercises[exIndex]) return c;
        exercises[exIndex] = { ...exercises[exIndex], [field]: value };
        const updatedRoutine = { ...routine, exercises };
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(() => syncRoutineToDb(c.id, day, updatedRoutine), 600);
        return { ...c, routines: { ...c.routines, [day]: updatedRoutine } };
      })
    );
  };

  const handleChangeExerciseSets = (exIndex: number, delta: number) => {
    if (!selectedVipClientId) return;
    setVipClients((prev) =>
      prev.map((c) => {
        if (c.id !== selectedVipClientId) return c;
        const day = c.activeDay || c.assignedDays?.[0] || 'Lunes';
        const routine = c.routines?.[day] ?? emptyRoutine();
        const exercises = [...(routine.exercises || [])];
        if (!exercises[exIndex]) return c;
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
        syncRoutineToDb(c.id, day, updatedRoutine);
        return { ...c, routines: { ...c.routines, [day]: updatedRoutine } };
      })
    );
  };

  const handleRemoveExercise = (exIndex: number) => {
    if (!selectedVipClientId) return;
    setVipClients((prev) =>
      prev.map((c) => {
        if (c.id !== selectedVipClientId) return c;
        const day = c.activeDay || c.assignedDays?.[0] || 'Lunes';
        const routine = c.routines?.[day] ?? emptyRoutine();
        const exercises = (routine.exercises || []).filter((_, i) => i !== exIndex);
        const updatedRoutine = { ...routine, exercises };
        syncRoutineToDb(c.id, day, updatedRoutine);
        return { ...c, routines: { ...c.routines, [day]: updatedRoutine } };
      })
    );
  };

  const handleAddBlankExercise = () => {
    if (!selectedVipClientId) return;
    setVipClients((prev) =>
      prev.map((c) => {
        if (c.id !== selectedVipClientId) return c;
        const day = c.activeDay || c.assignedDays?.[0] || 'Lunes';
        const routine = c.routines?.[day] ?? emptyRoutine();
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
        syncRoutineToDb(c.id, day, updatedRoutine);
        return {
          ...c,
          routines: { ...c.routines, [day]: updatedRoutine },
        };
      })
    );
  };

  const handleAddCatalogExercise = (name: string) => {
    if (!selectedVipClientId) return;
    setVipClients((prev) =>
      prev.map((c) => {
        if (c.id !== selectedVipClientId) return c;
        const day = c.activeDay || c.assignedDays?.[0] || 'Lunes';
        const routine = c.routines?.[day] ?? emptyRoutine();
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
        syncRoutineToDb(c.id, day, updatedRoutine);
        return {
          ...c,
          routines: { ...c.routines, [day]: updatedRoutine },
        };
      })
    );
  };

  const handleUpdateVipClient = async (id: string, updates: Partial<VipClient>) => {
    try {
      const res = await fetch('/api/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      const data = await res.json();
      if (data.success) {
        setVipClients((prev) =>
          prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
        );
        setModalEditVip(null);
      } else {
        throw new Error(data.error || 'No se pudieron guardar los cambios del cliente.');
      }
    } catch (err: any) {
      console.error('Error updating VIP client:', err);
      throw err;
    }
  };

  const handleDeleteVipClient = async (clientId: string) => {
    const client = vipClients.find((c) => c.id === clientId);
    if (!client) return;
    if (confirm(`¿Eliminar la cuenta VIP de "${client.name}"?`)) {
      try {
        await fetch(`/api/clients?id=${encodeURIComponent(clientId)}`, { method: 'DELETE' });
        setVipClients((prev) => prev.filter((c) => c.id !== clientId));
        if (selectedVipClientId === clientId) {
          const rem = vipClients.filter((c) => c.id !== clientId);
          setSelectedVipClientId(rem.length > 0 ? rem[0].id : null);
        }
      } catch (err) {
        console.error('Error deleting VIP client:', err);
      }
    }
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      const routinesPayload: Record<string, any> = {};
      for (const vc of vipClients) {
        if (vc.routines) {
          for (const [day, routine] of Object.entries(vc.routines)) {
            routinesPayload[`routine_${vc.id}_${day}`] = routine;
          }
        }
      }
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_all', payload: { routines: routinesPayload } }),
      });
      alert('✅ Cambios sincronizados con MySQL.');
    } catch (err) {
      console.error('Error syncing:', err);
      alert('Error al sincronizar datos.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-[#F4F8FB]">
      <Header
        appMode="coach"
        coachLoggedIn={coachLoggedIn}
        coachInfo={coachInfo}
        coachTab="vip"
        onSwitchMode={(mode) => {
          if (mode === 'vip_client') router.push('/cliente');
        }}
        onCoachLogout={handleCoachLogout}
        onSwitchCoachTab={() => {}}
      />

      <main className="flex-1 w-full mx-auto p-3 sm:p-6 xl:px-12 space-y-5">
        {!coachLoggedIn ? (
          <CoachLoginInline onLogin={handleCoachLogin} />
        ) : (
          <VipAdminView
            vipClients={vipClients}
            selectedClientId={selectedVipClientId}
            catalog={CATALOG_FLAT}
            onSelectClient={setSelectedVipClientId}
            onOpenAddVipModal={() => setModalAddVip(true)}
            onOpenEditVipModal={(id) => {
              const c = vipClients.find((v) => v.id === id);
              if (c) setModalEditVip(c);
            }}
            onOpenShareVipModal={(id) => {
              const c = vipClients.find((v) => v.id === id);
              if (c) setModalShareVip(c);
            }}
            onOpenCloneRoutineModal={(id) => setModalCloneRoutine(id)}
            onDeleteVipClient={handleDeleteVipClient}
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
        )}
      </main>

      {/* Modales */}
      {modalEditVip && (
        <EditVipClientModal
          client={modalEditVip}
          onSave={(updates) => handleUpdateVipClient(modalEditVip.id, updates)}
          onClose={() => setModalEditVip(null)}
        />
      )}

      {modalShareVip && (
        <ShareVipModal client={modalShareVip} onClose={() => setModalShareVip(null)} />
      )}

      {modalCloneRoutine && (
        <CloneRoutineModal
          targetClientId={modalCloneRoutine}
          vipClients={vipClients}
          onClose={() => setModalCloneRoutine(null)}
          onSaveClonedRoutine={async (targetId, updatedRoutines, updatedAssignedDays) => {
            setVipClients((prev) =>
              prev.map((c) =>
                c.id === targetId
                  ? { ...c, routines: updatedRoutines, assignedDays: updatedAssignedDays }
                  : c
              )
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
          logs={
            vipClients.find((v) => v.id === selectedVipClientId)?.logs || []
          }
          onClose={() => setModalHistory(false)}
        />
      )}
    </div>
  );
}

function CoachLoginInline({
  onLogin,
}: {
  onLogin: (u: string, p: string) => Promise<{ success: boolean; error?: string }>;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await onLogin(username.trim(), password.trim());
    setLoading(false);
    if (!res.success) setError(res.error || 'Credenciales inválidas');
  };

  return (
    <div className="max-w-md mx-auto py-8 sm:py-12 px-4 animate-fadeIn">
      <div className="bg-white border border-[#e4e4e7] p-6 sm:p-8 shadow-xl relative overflow-hidden space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-gradient-to-tr from-[#004b73] to-[#003857] text-white flex items-center justify-center mx-auto shadow-md text-2xl mb-3 ring-4 ring-blue-50">
            <i className="fa-solid fa-user-shield" style={{ color: '#00fff6' }}></i>
          </div>
          <h3 className="text-xl font-sora-bold text-[#1A3644]">Panel Coach</h3>
          <p className="text-xs text-slate-500 font-poppins-regular">
            Acceso administrativo para gestión de entrenamientos y clientes
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-sora-bold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-sora-bold text-[#004b73] mb-1 uppercase tracking-wider">
              Usuario Coach
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <i className="fa-solid fa-user text-xs"></i>
              </span>
              <input
                type="text"
                required
                autoComplete="username"
                placeholder="Ej: henry_coach"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-[#F0F6F9] border border-[#E2E8F0] text-xs font-mono text-[#1A3644] focus:border-[#004b73] focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-sora-bold text-[#004b73] mb-1 uppercase tracking-wider">
              Contraseña
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <i className="fa-solid fa-lock text-xs"></i>
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 bg-[#F0F6F9] border border-[#E2E8F0] text-xs font-mono text-[#1A3644] focus:border-[#004b73] focus:outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-[#004b73] transition cursor-pointer"
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#004b73] hover:bg-[#003857] font-sora-bold py-3 text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            style={{ color: '#00fff6' }}
          >
            {loading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i>
                <span>Verificando...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-arrow-right-to-bracket"></i>
                <span>Iniciar Sesión Coach</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
