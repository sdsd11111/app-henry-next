'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from '@/components/Header';
import VipClientView from '@/components/VipClientView';
import VipAdminView from '@/components/VipAdminView';
import CoachFloorPanel from '@/components/CoachFloorPanel';
import CloneRoutineModal from '@/components/CloneRoutineModal';
import ShareVipModal from '@/components/ShareVipModal';
import ExerciseHistoryModal from '@/components/ExerciseHistoryModal';
import { FloorClient, VipClient, DayRoutine, WorkoutLog } from '@/lib/types';
import { CATALOG_FLAT } from '@/lib/catalog';

// ──────────────────────────────────────────
// MODE TYPES
// ──────────────────────────────────────────
type AppMode = 'vip_client' | 'coach';
type CoachTab = 'floor' | 'vip';

// ──────────────────────────────────────────
// INITIAL EMPTY ROUTINE
// ──────────────────────────────────────────
function emptyRoutine(): DayRoutine {
  return { sessionName: '', notes: '', exercises: [], cardio: [], isMenstrualCycle: false };
}

// ──────────────────────────────────────────
// MAIN APP COMPONENT
// ──────────────────────────────────────────
export default function Home() {
  // ── App Mode ──
  const [appMode, setAppMode] = useState<AppMode>('vip_client');
  const [coachTab, setCoachTab] = useState<CoachTab>('floor');

  // ── Coach Session ──
  const [coachLoggedIn, setCoachLoggedIn] = useState(false);
  const [coachInfo, setCoachInfo] = useState<{ id: string; name: string; username: string } | null>(null);

  // ── VIP Client Session ──
  const [loggedVipClient, setLoggedVipClient] = useState<VipClient | null>(null);

  // ── Data ──
  const [floorClients, setFloorClients] = useState<FloorClient[]>([]);
  const [vipClients, setVipClients] = useState<VipClient[]>([]);
  const [selectedVipClientId, setSelectedVipClientId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialLoad = useRef(true);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  // ── Modals ──
  const [modalAddFloor, setModalAddFloor] = useState(false);
  const [modalEditFloor, setModalEditFloor] = useState<FloorClient | null>(null);
  const [modalAddVip, setModalAddVip] = useState(false);
  const [modalEditVip, setModalEditVip] = useState<VipClient | null>(null);
  const [modalShareVip, setModalShareVip] = useState<VipClient | null>(null);
  const [modalCloneRoutine, setModalCloneRoutine] = useState<string | null>(null);
  const [modalHistory, setModalHistory] = useState(false);
  const [historyExercise, setHistoryExercise] = useState('');

  // ──────────────────────────────────────────
  // INITIAL LOAD — fetch all data from MySQL & Restore Sessions
  // ──────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        // Restaurar coach session si existe
        if (typeof window !== 'undefined') {
          const savedCoach = localStorage.getItem('hc_coach_info');
          if (savedCoach) {
            try {
              const parsed = JSON.parse(savedCoach);
              setCoachLoggedIn(true);
              setCoachInfo(parsed);
              setAppMode('coach');
            } catch (e) {
              console.error('Error parsing coach info', e);
            }
          }
        }

        const [floorRes, vipRes] = await Promise.all([
          fetch('/api/clients?type=floor'),
          fetch('/api/routines'),
        ]);
        if (floorRes.ok) {
          const data = await floorRes.json();
          setFloorClients(data.clients || []);
        }
        if (vipRes.ok) {
          const data = await vipRes.json();
          const vClients: VipClient[] = data.vipClients || [];
          setVipClients(vClients);
          if (vClients.length > 0) {
            setSelectedVipClientId(vClients[0].id);
          }

          // Restaurar VIP client session si no estaba en modo coach
          if (typeof window !== 'undefined') {
            const savedVipId = localStorage.getItem('hc_vip_client_id');
            if (savedVipId) {
              const matched = vClients.find((c) => String(c.id) === String(savedVipId));
              if (matched) {
                setLoggedVipClient(matched);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setIsLoading(false);
        setTimeout(() => {
          isInitialLoad.current = false;
        }, 500);
      }
    }
    loadData();
  }, []);

  // ── Auto-save debounced sync to MySQL ──
  useEffect(() => {
    if (isInitialLoad.current || vipClients.length === 0) return;

    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    autoSaveTimer.current = setTimeout(async () => {
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
          body: JSON.stringify({
            action: 'sync_all',
            payload: {
              clients: floorClients,
              vip_clients: vipClients,
              routines: routinesPayload,
            },
          }),
        });
      } catch (err) {
        console.error('Auto-sync error:', err);
      }
    }, 1500);

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [vipClients, floorClients]);

  // ──────────────────────────────────────────
  // COACH LOGIN
  // ──────────────────────────────────────────
  const handleCoachLogin = useCallback(async (username: string, password: string) => {
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
        setAppMode('coach');
        setCoachTab('floor');
        if (typeof window !== 'undefined') {
          localStorage.setItem('hc_coach_info', JSON.stringify(data.coach));
        }
        return { success: true };
      }
      return { success: false, error: data.error || 'Credenciales inválidas' };
    } catch {
      return { success: false, error: 'Error de conexión' };
    }
  }, []);

  const handleCoachLogout = useCallback(() => {
    setCoachLoggedIn(false);
    setCoachInfo(null);
    setAppMode('vip_client');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('hc_coach_info');
    }
  }, []);

  // ──────────────────────────────────────────
  // VIP CLIENT LOGIN
  // ──────────────────────────────────────────
  const handleVipLogin = useCallback(async (username: string, password: string) => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'vip_login', username, password }),
      });
      const data = await res.json();
      if (data.success && data.client) {
        setLoggedVipClient(data.client);
        if (typeof window !== 'undefined') {
          localStorage.setItem('hc_vip_client_id', data.client.id);
        }
        return { success: true };
      }
      return { success: false, error: data.error || 'Usuario o contraseña incorrectos' };
    } catch {
      return { success: false, error: 'Error de conexión' };
    }
  }, []);

  const handleVipLogout = useCallback(() => {
    setLoggedVipClient(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('hc_vip_client_id');
    }
  }, []);

  // ──────────────────────────────────────────
  // FLOOR CLIENTS CRUD
  // ──────────────────────────────────────────
  const handleAddFloorClient = useCallback(async (clientData: Omit<FloorClient, 'id'>) => {
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'floor', ...clientData }),
      });
      const data = await res.json();
      if (data.success && data.client) {
        setFloorClients(prev => [...prev, data.client]);
        setModalAddFloor(false);
      }
    } catch (err) {
      console.error('Error adding floor client:', err);
    }
  }, []);

  const handleUpdateFloorClient = useCallback(async (id: string, updates: Partial<FloorClient>) => {
    try {
      const res = await fetch('/api/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      const data = await res.json();
      if (data.success) {
        setFloorClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
        setModalEditFloor(null);
      }
    } catch (err) {
      console.error('Error updating floor client:', err);
    }
  }, []);

  const handleDeleteFloorClient = useCallback(async (id: string) => {
    if (!confirm('¿Eliminar este cliente? Esta acción no se puede deshacer.')) return;
    try {
      const res = await fetch(`/api/clients?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setFloorClients(prev => prev.filter(c => c.id !== id));
      }
    } catch (err) {
      console.error('Error deleting floor client:', err);
    }
  }, []);

  const handleToggleFloorActive = useCallback(async (id: string) => {
    const client = floorClients.find(c => c.id === id);
    if (!client) return;
    const newActive = !client.isActiveFloor;
    await handleUpdateFloorClient(id, { isActiveFloor: newActive });
  }, [floorClients, handleUpdateFloorClient]);

  // ──────────────────────────────────────────
  // VIP CLIENTS CRUD
  // ──────────────────────────────────────────
  const handleAddVipClient = useCallback(async (clientData: any) => {
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'vip', ...clientData }),
      });
      const data = await res.json();
      if (data.success && data.client) {
        setVipClients(prev => [...prev, data.client]);
        setSelectedVipClientId(data.client.id);
        setModalAddVip(false);
      }
    } catch (err) {
      console.error('Error adding VIP client:', err);
    }
  }, []);

  const handleUpdateVipClient = useCallback(async (id: string, updates: Partial<VipClient>) => {
    try {
      const res = await fetch('/api/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      const data = await res.json();
      if (data.success) {
        setVipClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
        setModalEditVip(null);
      }
    } catch (err) {
      console.error('Error updating VIP client:', err);
    }
  }, []);

  const handleDeleteVipClient = useCallback(async (id: string) => {
    if (!confirm('¿Eliminar este cliente VIP? Se eliminarán también sus rutinas y registros.')) return;
    try {
      const res = await fetch(`/api/clients?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setVipClients(prev => prev.filter(c => c.id !== id));
        if (selectedVipClientId === id) {
          const remaining = vipClients.filter(c => c.id !== id);
          setSelectedVipClientId(remaining.length > 0 ? remaining[0].id : null);
        }
      }
    } catch (err) {
      console.error('Error deleting VIP client:', err);
    }
  }, [selectedVipClientId, vipClients]);

  // ──────────────────────────────────────────
  // ROUTINE EDITOR — VIP ADMIN VIEW
  // ──────────────────────────────────────────
  const selectedVipClient = vipClients.find(c => c.id === selectedVipClientId) || null;

  const updateSelectedVipLocally = useCallback((updater: (prev: VipClient) => VipClient) => {
    setVipClients(prev => prev.map(c => c.id === selectedVipClientId ? updater(c) : c));
  }, [selectedVipClientId]);

  const getActiveDay = useCallback(() => {
    if (!selectedVipClient) return 'Lunes';
    return selectedVipClient.activeDay || (selectedVipClient.assignedDays?.[0]) || 'Lunes';
  }, [selectedVipClient]);

  const getActiveRoutine = useCallback((): DayRoutine => {
    const day = getActiveDay();
    return selectedVipClient?.routines?.[day] ?? emptyRoutine();
  }, [selectedVipClient, getActiveDay]);

  const handleSelectDay = useCallback((day: string) => {
    updateSelectedVipLocally(c => ({ ...c, activeDay: day }));
  }, [updateSelectedVipLocally]);

  const handleUpdateSessionName = useCallback((title: string) => {
    const day = getActiveDay();
    setVipClients(prev => prev.map(c => {
      if (c.id !== selectedVipClientId) return c;
      const updatedRoutine = { ...(c.routines?.[day] ?? emptyRoutine()), sessionName: title };
      // Debounce sync while typing
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save_routine', clientId: c.id, day, routine: updatedRoutine }) });
      }, 800);
      return { ...c, routines: { ...c.routines, [day]: updatedRoutine } };
    }));
  }, [getActiveDay, selectedVipClientId]);

  const handleUpdateNote = useCallback((note: string) => {
    const day = getActiveDay();
    setVipClients(prev => prev.map(c => {
      if (c.id !== selectedVipClientId) return c;
      const updatedRoutine = { ...(c.routines?.[day] ?? emptyRoutine()), notes: note };
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save_routine', clientId: c.id, day, routine: updatedRoutine }) });
      }, 800);
      return { ...c, routines: { ...c.routines, [day]: updatedRoutine } };
    }));
  }, [getActiveDay, selectedVipClientId]);

  const handleToggleMenstrualCycle = useCallback((clientId: string) => {
    const day = getActiveDay();
    setVipClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const routine = c.routines?.[day] ?? emptyRoutine();
      const updatedRoutine = { ...routine, isMenstrualCycle: !routine.isMenstrualCycle };

      // Sincronizar inmediatamente a MySQL
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_routine',
          clientId,
          routine: updatedRoutine,
          day,
        }),
      }).catch((e) => console.error('Error syncing menstrual cycle:', e));

      return {
        ...c,
        routines: { ...c.routines, [day]: updatedRoutine }
      };
    }));
  }, [getActiveDay]);

  // Helper: persist coach routine change immediately to DB
  const syncCoachRoutineToDb = useCallback(async (clientId: string, day: string, routine: DayRoutine) => {
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_routine', clientId, day, routine }),
      });
    } catch (e) {
      console.error('Error syncing coach routine:', e);
    }
  }, []);

  const handleUpdateExerciseField = useCallback((exIndex: number, field: string, value: any) => {
    const day = getActiveDay();
    setVipClients(prev => prev.map(c => {
      if (c.id !== selectedVipClientId) return c;
      const routine = c.routines?.[day] ?? emptyRoutine();
      const exercises = [...(routine.exercises || [])];
      if (!exercises[exIndex]) return c;
      exercises[exIndex] = { ...exercises[exIndex], [field]: value };
      const updatedRoutine = { ...routine, exercises };
      // Debounce DB sync on field changes (typing)
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => syncCoachRoutineToDb(c.id, day, updatedRoutine), 800);
      return { ...c, routines: { ...c.routines, [day]: updatedRoutine } };
    }));
  }, [getActiveDay, selectedVipClientId, syncCoachRoutineToDb]);

  const handleChangeExerciseSets = useCallback((exIndex: number, delta: number) => {
    const day = getActiveDay();
    setVipClients(prev => prev.map(c => {
      if (c.id !== selectedVipClientId) return c;
      const routine = c.routines?.[day] ?? emptyRoutine();
      const exercises = [...(routine.exercises || [])];
      if (!exercises[exIndex]) return c;
      const ex = exercises[exIndex];
      const currentSets = ex.sets || [];
      let newSets;
      if (delta > 0) {
        const lastSet = currentSets[currentSets.length - 1];
        newSets = [...currentSets, { setNumber: currentSets.length + 1, weight: lastSet?.weight || 0, reps: lastSet?.reps || 0, completed: false }];
      } else {
        newSets = currentSets.slice(0, Math.max(1, currentSets.length - 1));
      }
      exercises[exIndex] = { ...ex, sets: newSets };
      const updatedRoutine = { ...routine, exercises };
      syncCoachRoutineToDb(c.id, day, updatedRoutine);
      return { ...c, routines: { ...c.routines, [day]: updatedRoutine } };
    }));
  }, [getActiveDay, selectedVipClientId, syncCoachRoutineToDb]);

  const handleRemoveExercise = useCallback((exIndex: number) => {
    const day = getActiveDay();
    setVipClients(prev => prev.map(c => {
      if (c.id !== selectedVipClientId) return c;
      const routine = c.routines?.[day] ?? emptyRoutine();
      const exercises = (routine.exercises || []).filter((_, i) => i !== exIndex);
      const updatedRoutine = { ...routine, exercises };
      syncCoachRoutineToDb(c.id, day, updatedRoutine);
      return { ...c, routines: { ...c.routines, [day]: updatedRoutine } };
    }));
  }, [getActiveDay, selectedVipClientId, syncCoachRoutineToDb]);

  const handleAddBlankExercise = useCallback(() => {
    const day = getActiveDay();
    const newEx = {
      id: `ve_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name: '',
      pattern: '',
      order: '',
      setsTarget: '3',
      repsTarget: '10',
      rest: '60s',
      rpe: 7,
      sets: [{ setNumber: 1, weight: 0, reps: 10, completed: false }, { setNumber: 2, weight: 0, reps: 10, completed: false }, { setNumber: 3, weight: 0, reps: 10, completed: false }],
    };
    setVipClients(prev => prev.map(c => {
      if (c.id !== selectedVipClientId) return c;
      const routine = c.routines?.[day] ?? emptyRoutine();
      const updatedRoutine = { ...routine, exercises: [...(routine.exercises || []), newEx] };
      syncCoachRoutineToDb(c.id, day, updatedRoutine);
      return { ...c, routines: { ...c.routines, [day]: updatedRoutine } };
    }));
  }, [getActiveDay, selectedVipClientId, syncCoachRoutineToDb]);

  const handleAddCatalogExercise = useCallback((name: string) => {
    const day = getActiveDay();
    const newEx = {
      id: `ve_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name,
      pattern: '',
      order: '',
      setsTarget: '3',
      repsTarget: '10',
      rest: '60s',
      rpe: 7,
      sets: [{ setNumber: 1, weight: 0, reps: 10, completed: false }, { setNumber: 2, weight: 0, reps: 10, completed: false }, { setNumber: 3, weight: 0, reps: 10, completed: false }],
    };
    setVipClients(prev => prev.map(c => {
      if (c.id !== selectedVipClientId) return c;
      const routine = c.routines?.[day] ?? emptyRoutine();
      const updatedRoutine = { ...routine, exercises: [...(routine.exercises || []), newEx] };
      syncCoachRoutineToDb(c.id, day, updatedRoutine);
      return { ...c, routines: { ...c.routines, [day]: updatedRoutine } };
    }));
  }, [getActiveDay, selectedVipClientId, syncCoachRoutineToDb]);

  // ──────────────────────────────────────────
  // VIP CLIENT — set updates
  // ──────────────────────────────────────────
  const syncVipRoutineToDb = useCallback(async (clientId: string, day: string, routineData: DayRoutine) => {
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

  const handleVipUpdateSet = useCallback((exIndex: number, setIndex: number, field: 'weight' | 'reps', value: number | string) => {
    if (!loggedVipClient) return;
    const day = loggedVipClient.activeDay || loggedVipClient.assignedDays?.[0] || 'Lunes';
    setLoggedVipClient(prev => {
      if (!prev) return prev;
      const routine = prev.routines?.[day] ?? emptyRoutine();
      const exercises = [...(routine.exercises || [])];
      if (!exercises[exIndex]) return prev;
      const sets = [...(exercises[exIndex].sets || [])];
      if (!sets[setIndex]) return prev;
      sets[setIndex] = { ...sets[setIndex], [field]: value };
      exercises[exIndex] = { ...exercises[exIndex], sets };
      const updatedRoutine = { ...routine, exercises };
      syncVipRoutineToDb(prev.id, day, updatedRoutine);
      return { ...prev, routines: { ...prev.routines, [day]: updatedRoutine } };
    });
  }, [loggedVipClient, syncVipRoutineToDb]);

  const handleVipToggleSetCompleted = useCallback((exIndex: number, setIndex: number) => {
    if (!loggedVipClient) return;
    const day = loggedVipClient.activeDay || loggedVipClient.assignedDays?.[0] || 'Lunes';
    setLoggedVipClient(prev => {
      if (!prev) return prev;
      const routine = prev.routines?.[day] ?? emptyRoutine();
      const exercises = [...(routine.exercises || [])];
      if (!exercises[exIndex]) return prev;
      const sets = [...(exercises[exIndex].sets || [])];
      if (!sets[setIndex]) return prev;
      sets[setIndex] = { ...sets[setIndex], completed: !sets[setIndex].completed };
      exercises[exIndex] = { ...exercises[exIndex], sets };
      const updatedRoutine = { ...routine, exercises };
      syncVipRoutineToDb(prev.id, day, updatedRoutine);
      return { ...prev, routines: { ...prev.routines, [day]: updatedRoutine } };
    });
  }, [loggedVipClient, syncVipRoutineToDb]);

  const handleVipAddSet = useCallback((exIndex: number) => {
    if (!loggedVipClient) return;
    const day = loggedVipClient.activeDay || loggedVipClient.assignedDays?.[0] || 'Lunes';
    setLoggedVipClient(prev => {
      if (!prev) return prev;
      const routine = prev.routines?.[day] ?? emptyRoutine();
      const exercises = [...(routine.exercises || [])];
      if (!exercises[exIndex]) return prev;
      const sets = exercises[exIndex].sets || [];
      const lastSet = sets[sets.length - 1];
      const newSet = { setNumber: sets.length + 1, weight: lastSet?.weight || 0, reps: lastSet?.reps || 0, completed: false };
      exercises[exIndex] = { ...exercises[exIndex], sets: [...sets, newSet] };
      const updatedRoutine = { ...routine, exercises };
      syncVipRoutineToDb(prev.id, day, updatedRoutine);
      return { ...prev, routines: { ...prev.routines, [day]: updatedRoutine } };
    });
  }, [loggedVipClient, syncVipRoutineToDb]);

  const handleVipUpdateWellness = useCallback((field: string, value: any) => {
    if (!loggedVipClient) return;
    const day = loggedVipClient.activeDay || loggedVipClient.assignedDays?.[0] || 'Lunes';
    setLoggedVipClient(prev => {
      if (!prev) return prev;
      const routine = prev.routines?.[day] ?? emptyRoutine();
      const updatedRoutine = { ...routine, wellness: { ...(routine.wellness || {}), [field]: value } as any };
      syncVipRoutineToDb(prev.id, day, updatedRoutine);
      return {
        ...prev,
        routines: { ...prev.routines, [day]: updatedRoutine }
      };
    });
  }, [loggedVipClient, syncVipRoutineToDb]);

  const handleVipToggleMenstrualCycle = useCallback(() => {
    if (!loggedVipClient) return;
    const day = loggedVipClient.activeDay || loggedVipClient.assignedDays?.[0] || 'Lunes';
    setLoggedVipClient(prev => {
      if (!prev) return prev;
      const routine = prev.routines?.[day] ?? emptyRoutine();
      const updatedRoutine = { ...routine, isMenstrualCycle: !routine.isMenstrualCycle };
      syncVipRoutineToDb(prev.id, day, updatedRoutine);
      return { ...prev, routines: { ...prev.routines, [day]: updatedRoutine } };
    });
  }, [loggedVipClient, syncVipRoutineToDb]);

  const handleVipSelectDay = useCallback((day: string) => {
    setLoggedVipClient(prev => prev ? { ...prev, activeDay: day } : prev);
  }, []);

  const handleVipSaveSessionLog = useCallback(async (notes: string, stagedOverload?: Record<number, number>) => {
    if (!loggedVipClient) return;
    const day = loggedVipClient.activeDay || loggedVipClient.assignedDays?.[0] || 'Lunes';
    const routine = loggedVipClient.routines?.[day] ?? emptyRoutine();
    const wellness = routine.wellness;
    const log: WorkoutLog = {
      id: `log_${Date.now()}`,
      date: new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      dayOfWeek: day,
      notes,
      exercisesCount: routine.exercises?.length || 0,
      setsCount: routine.exercises?.reduce((sum, ex) => sum + (ex.sets?.filter(s => s.completed)?.length || 0), 0) || 0,
      exercises: routine.exercises?.map(ex => ({
        name: ex.name,
        sets: ex.sets?.map(s => ({
          weight: Number(s.weight) || 0,
          reps: Number(s.reps) || 0,
          completed: Boolean(s.completed),
        })) || []
      })) || [],
      readiness: {
        mood: wellness?.mood !== null && wellness?.mood !== undefined ? String(wellness.mood) : undefined,
        sleep: wellness?.sleep || undefined,
        nutrition: wellness?.nutrition || undefined,
      },
    };

    const nextExercises = (routine.exercises || []).map((ex, exIdx) => {
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
          clientId: loggedVipClient.id,
          log,
          routine: routineForNextSession,
          day,
        }),
      });

      setLoggedVipClient(prev => prev ? {
        ...prev,
        routines: { ...prev.routines, [day]: routineForNextSession },
        logs: [...(prev.logs || []), log]
      } : prev);
    } catch (err) {
      console.error('Error saving session log:', err);
    }
  }, [loggedVipClient]);

  const handleVipDeleteLog = useCallback(async (logIndex: number) => {
    if (!loggedVipClient) return;
    const log = loggedVipClient.logs?.[logIndex];
    if (!log?.id) return;
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_log', clientId: loggedVipClient.id, logId: log.id }),
      });
      setLoggedVipClient(prev => prev ? { ...prev, logs: (prev.logs || []).filter((_, i) => i !== logIndex) } : prev);
    } catch (err) {
      console.error('Error deleting log:', err);
    }
  }, [loggedVipClient]);

  // ──────────────────────────────────────────
  // SYNC ALL — saves coach changes to MySQL
  // ──────────────────────────────────────────
  const handleSyncAll = useCallback(async () => {
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
        body: JSON.stringify({
          action: 'sync_all',
          payload: {
            clients: floorClients,
            vip_clients: vipClients,
            routines: routinesPayload,
          },
        }),
      });
    } catch (err) {
      console.error('Error syncing:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [vipClients, floorClients]);

  // ──────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 min-h-screen bg-[#fafafa]">
        <Header
          appMode="vip_client"
          coachLoggedIn={false}
          coachInfo={null}
          coachTab="floor"
          onSwitchMode={() => {}}
          onCoachLogout={() => {}}
          onSwitchCoachTab={() => {}}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-[#00fff6] border-t-transparent animate-spin mx-auto" style={{ borderRadius: '50%' }}></div>
            <p className="text-sm text-slate-500 font-poppins-regular">Cargando datos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-[#fafafa]">
      {/* HEADER */}
      <Header
        appMode={appMode}
        coachLoggedIn={coachLoggedIn}
        coachInfo={coachInfo}
        coachTab={coachTab}
        onSwitchMode={(mode) => {
          setAppMode(mode);
          if (mode === 'coach') {
            window.history.pushState(null, '', '/coach');
          } else {
            window.history.pushState(null, '', '/cliente');
          }
        }}
        onCoachLogout={handleCoachLogout}
        onSwitchCoachTab={setCoachTab}
      />

      {/* MAIN CONTENT */}
      <main className="flex-1 w-full mx-auto p-3 sm:p-6 xl:px-12 space-y-5">
        {/* VIP CLIENT MODE */}
        {appMode === 'vip_client' && (
          <VipClientView
            client={loggedVipClient}
            onLogin={handleVipLogin}
            onLogout={handleVipLogout}
            onSelectDay={handleVipSelectDay}
            onUpdateSet={handleVipUpdateSet}
            onToggleSetCompleted={handleVipToggleSetCompleted}
            onAddSet={handleVipAddSet}
            onUpdateWellness={handleVipUpdateWellness}
            onToggleMenstrualCycle={handleVipToggleMenstrualCycle}
            onSaveSessionLog={handleVipSaveSessionLog}
            onDeleteLog={handleVipDeleteLog}
            onOpenExerciseHistory={(name) => { setHistoryExercise(name); setModalHistory(true); }}
          />
        )}

        {/* COACH MODE — Vista directa sin pop-up */}
        {appMode === 'coach' && !coachLoggedIn && (
          <CoachLoginView onLogin={handleCoachLogin} />
        )}

        {appMode === 'coach' && coachLoggedIn && (
          <VipAdminView
            vipClients={vipClients}
            selectedClientId={selectedVipClientId}
            catalog={CATALOG_FLAT}
            onSelectClient={setSelectedVipClientId}
            onOpenAddVipModal={() => setModalAddVip(true)}
            onOpenEditVipModal={(id) => { const c = vipClients.find(v => v.id === id); if (c) setModalEditVip(c); }}
            onOpenShareVipModal={(id) => { const c = vipClients.find(v => v.id === id); if (c) setModalShareVip(c); }}
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
            onOpenExerciseHistory={(name) => { setHistoryExercise(name); setModalHistory(true); }}
            onSyncAll={handleSyncAll}
            isSyncing={isSyncing}
          />
        )}
      </main>

      {/* MODALS */}
      {modalAddFloor && (
        <AddFloorClientModal onSave={handleAddFloorClient} onClose={() => setModalAddFloor(false)} />
      )}
      {modalEditFloor && (
        <EditFloorClientModal
          client={modalEditFloor}
          onSave={(updates) => handleUpdateFloorClient(modalEditFloor.id, updates)}
          onClose={() => setModalEditFloor(null)}
        />
      )}
      {modalAddVip && (
        <AddVipClientModal onSave={handleAddVipClient} onClose={() => setModalAddVip(false)} />
      )}
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
            // Sincronizar de inmediato con MySQL
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
            appMode === 'coach'
              ? selectedVipClient?.logs || []
              : loggedVipClient?.logs || []
          }
          onClose={() => setModalHistory(false)}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// INLINE MODAL COMPONENTS
// ══════════════════════════════════════════════════════════════

// ── Coach Login View (In-page tab) ────────────────────────────
function CoachLoginView({ onLogin }: {
  onLogin: (u: string, p: string) => Promise<{ success: boolean; error?: string }>;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-[#F0F6F9] border border-[#E2E8F0] text-xs font-mono text-[#1A3644] focus:border-[#004b73] focus:outline-none transition"
              />
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

// ── Add Floor Client Modal ─────────────────────────────────────
const TIME_SLOTS = [
  '07:00 - 08:00 AM', '08:00 - 09:00 AM', '09:00 - 10:00 AM', '10:00 - 11:00 AM',
  '11:00 - 12:00 PM', '03:00 - 04:00 PM', '04:00 - 05:00 PM', '05:00 - 06:00 PM',
  '06:00 - 07:00 PM', '07:00 - 08:00 PM', '08:00 - 09:00 PM',
];
const DAYS_OPTIONS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAY_LABELS: Record<string, string> = { Lun: 'L', Mar: 'M', 'Mié': 'X', Jue: 'J', Vie: 'V', 'Sáb': 'S' };

function AddFloorClientModal({ onSave, onClose }: {
  onSave: (data: Omit<FloorClient, 'id'>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [trainerId, setTrainerId] = useState('henry');
  const [timeSlot, setTimeSlot] = useState('07:00 - 08:00 AM');
  const [goal, setGoal] = useState('');
  const [assignedDays, setAssignedDays] = useState<string[]>(['Lun', 'Mié', 'Vie']);

  const toggleDay = (day: string) => {
    setAssignedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, trainerId, timeSlot, goal, assignedDays, activeDay: assignedDays[0] || 'Lun', isActiveFloor: false });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-[#e4e4e7] w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-[#e4e4e7] flex justify-between items-center bg-[#004b73]">
          <h3 className="text-base font-sora-bold flex items-center gap-2" style={{ color: '#ffffff' }}>
            <i className="fa-solid fa-user-plus" style={{ color: '#00fff6' }}></i>
            <span style={{ color: '#ffffff' }}>Registrar Cliente Floor</span>
          </h3>
          <button onClick={onClose} style={{ color: '#ffffff' }} className="p-1 transition">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide">Nombre Completo</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Ej: Inés Peñalosa" className="w-full px-3 py-2.5 text-xs" />
              </div>
              <div>
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide">Entrenador</label>
                <select value={trainerId} onChange={e => setTrainerId(e.target.value)} className="w-full px-3 py-2.5 text-xs cursor-pointer">
                  <option value="henry">Henry</option>
                  <option value="adriana">Adriana</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide">Horario</label>
                <select value={timeSlot} onChange={e => setTimeSlot(e.target.value)} className="w-full px-3 py-2.5 text-xs cursor-pointer">
                  {TIME_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide">Objetivo</label>
                <input type="text" value={goal} onChange={e => setGoal(e.target.value)} placeholder="Ej: Fuerza y Movilidad" className="w-full px-3 py-2.5 text-xs" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide">Días de Asistencia</label>
                <div className="flex gap-1.5">
                  {DAYS_OPTIONS.map(d => (
                    <label key={d} className="cursor-pointer flex-1 text-center text-xs border border-[#e4e4e7] p-2" style={{ background: assignedDays.includes(d) ? '#00fff6' : '#fff', color: '#000' }}>
                      <input type="checkbox" className="sr-only" checked={assignedDays.includes(d)} onChange={() => toggleDay(d)} />
                      {DAY_LABELS[d]}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <button type="submit" className="w-full py-3 text-xs font-sora-bold bg-[#004b73] hover:bg-[#003857] transition mt-2" style={{ color: '#00fff6' }}>
              <i className="fa-solid fa-check mr-2"></i>Guardar Cliente
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Edit Floor Client Modal ────────────────────────────────────
function EditFloorClientModal({ client, onSave, onClose }: {
  client: FloorClient;
  onSave: (data: Partial<FloorClient>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(client.name);
  const [trainerId, setTrainerId] = useState(client.trainerId);
  const [timeSlot, setTimeSlot] = useState(client.timeSlot);
  const [goal, setGoal] = useState(client.goal);
  const [assignedDays, setAssignedDays] = useState<string[]>(client.assignedDays || []);

  const toggleDay = (day: string) => {
    setAssignedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, trainerId, timeSlot, goal, assignedDays });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-[#e4e4e7] w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-[#e4e4e7] flex justify-between items-center bg-[#004b73]">
          <h3 className="text-base font-sora-bold flex items-center gap-2" style={{ color: '#ffffff' }}>
            <i className="fa-solid fa-pen-to-square" style={{ color: '#00fff6' }}></i>
            <span style={{ color: '#ffffff' }}>Editar Cliente Floor</span>
          </h3>
          <button onClick={onClose} style={{ color: '#ffffff' }} className="p-1 transition">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide">Nombre Completo</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full px-3 py-2.5 text-xs" />
              </div>
              <div>
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide">Entrenador</label>
                <select value={trainerId} onChange={e => setTrainerId(e.target.value)} className="w-full px-3 py-2.5 text-xs cursor-pointer">
                  <option value="henry">Henry</option>
                  <option value="adriana">Adriana</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide">Horario</label>
                <select value={timeSlot} onChange={e => setTimeSlot(e.target.value)} className="w-full px-3 py-2.5 text-xs cursor-pointer">
                  {TIME_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide">Objetivo</label>
                <input type="text" value={goal} onChange={e => setGoal(e.target.value)} className="w-full px-3 py-2.5 text-xs" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide">Días de Asistencia</label>
                <div className="flex gap-1.5">
                  {DAYS_OPTIONS.map(d => (
                    <label key={d} className="cursor-pointer flex-1 text-center text-xs border border-[#e4e4e7] p-2" style={{ background: assignedDays.includes(d) ? '#00fff6' : '#fff', color: '#000' }}>
                      <input type="checkbox" className="sr-only" checked={assignedDays.includes(d)} onChange={() => toggleDay(d)} />
                      {DAY_LABELS[d]}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-sora-medium text-slate-600 border border-[#e4e4e7] bg-white transition">Cancelar</button>
              <button type="submit" className="px-5 py-2 text-xs font-sora-bold bg-[#004b73] hover:bg-[#003857] transition" style={{ color: '#00fff6' }}>Guardar Cambios</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Add VIP Client Modal ───────────────────────────────────────
const VIP_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const VIP_DAY_LABELS: Record<string, string> = { Lunes: 'L', Martes: 'M', Miércoles: 'X', Jueves: 'J', Viernes: 'V', Sábado: 'S' };

function AddVipClientModal({ onSave, onClose }: {
  onSave: (data: any) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [trainerId, setTrainerId] = useState('henry');
  const [gender, setGender] = useState('Hombre');
  const [goal, setGoal] = useState('');
  const [assignedDays, setAssignedDays] = useState<string[]>(['Lunes', 'Miércoles', 'Viernes']);

  const toggleDay = (day: string) => {
    setAssignedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, username, password, trainerId, gender, goal, assignedDays, routines: {}, logs: [], activeDay: assignedDays[0] || 'Lunes' });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-[#e4e4e7] w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-[#e4e4e7] flex justify-between items-center bg-[#004b73]">
          <h3 className="text-base font-sora-bold flex items-center gap-2" style={{ color: '#ffffff' }}>
            <i className="fa-solid fa-crown" style={{ color: '#00fff6' }}></i>
            <span style={{ color: '#ffffff' }}>Registrar Cliente VIP</span>
          </h3>
          <button onClick={onClose} style={{ color: '#ffffff' }} className="p-1 transition">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide">Nombre Completo</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Ej: Silvia Navarro" className="w-full px-3.5 py-2.5 text-xs" />
              </div>
              <div>
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide">Coach Asignado</label>
                <select value={trainerId} onChange={e => setTrainerId(e.target.value)} className="w-full px-3.5 py-2.5 text-xs cursor-pointer">
                  <option value="henry">Henry</option>
                  <option value="adriana">Adriana</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide">Usuario / Código Acceso</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} required placeholder="Ej: silvia_vip" className="w-full px-3.5 py-2.5 text-xs font-mono" />
              </div>
              <div>
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide">Contraseña / Clave</label>
                <input type="text" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Ej: aion2026" className="w-full px-3.5 py-2.5 text-xs font-mono" />
              </div>
              <div>
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide">Género</label>
                <select value={gender} onChange={e => setGender(e.target.value)} className="w-full px-3.5 py-2.5 text-xs cursor-pointer">
                  <option value="Hombre">Hombre</option>
                  <option value="Mujer">Mujer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide">Objetivo Principal</label>
                <input type="text" value={goal} onChange={e => setGoal(e.target.value)} placeholder="Ej: Hipertrofia + Salud" className="w-full px-3.5 py-2.5 text-xs" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide">Días de Entrenamiento</label>
                <div className="flex gap-1.5">
                  {VIP_DAYS.map(d => (
                    <label key={d} className="cursor-pointer flex-1 text-center text-xs border border-[#e4e4e7] p-2" style={{ background: assignedDays.includes(d) ? '#00fff6' : '#fff', color: '#000' }}>
                      <input type="checkbox" className="sr-only" checked={assignedDays.includes(d)} onChange={() => toggleDay(d)} />
                      {VIP_DAY_LABELS[d]}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <button type="submit" className="w-full py-3 text-xs font-sora-bold bg-[#004b73] hover:bg-[#003857] transition mt-2" style={{ color: '#00fff6' }}>
              <i className="fa-solid fa-user-plus mr-2"></i>Registrar Cliente VIP
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Edit VIP Client Modal ──────────────────────────────────────
function EditVipClientModal({ client, onSave, onClose }: {
  client: VipClient;
  onSave: (data: Partial<VipClient>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(client.name);
  const [username, setUsername] = useState(client.username);
  const [password, setPassword] = useState(client.password_plain || '');
  const [trainerId, setTrainerId] = useState(client.trainerId);
  const [gender, setGender] = useState(client.gender);
  const [goal, setGoal] = useState(client.goal);
  const [assignedDays, setAssignedDays] = useState<string[]>(client.assignedDays || []);

  const toggleDay = (day: string) => {
    setAssignedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, username, password, trainerId, gender, goal, assignedDays });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-[#e4e4e7] w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-[#e4e4e7] flex justify-between items-center bg-[#004b73]">
          <h3 className="text-base font-sora-bold flex items-center gap-2" style={{ color: '#ffffff' }}>
            <i className="fa-solid fa-pen-to-square" style={{ color: '#00fff6' }}></i>
            <span style={{ color: '#ffffff' }}>Editar Cliente VIP</span>
          </h3>
          <button onClick={onClose} style={{ color: '#ffffff' }} className="p-1 transition">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide">Nombre Completo</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full px-3.5 py-2.5 text-xs" />
              </div>
              <div>
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide">Coach Asignado</label>
                <select value={trainerId} onChange={e => setTrainerId(e.target.value)} className="w-full px-3.5 py-2.5 text-xs cursor-pointer">
                  <option value="henry">Henry</option>
                  <option value="adriana">Adriana</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide">Usuario</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} required className="w-full px-3.5 py-2.5 text-xs font-mono" />
              </div>
              <div>
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide">Nueva Contraseña</label>
                <input type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="Dejar vacío para no cambiar" className="w-full px-3.5 py-2.5 text-xs font-mono" />
              </div>
              <div>
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide">Género</label>
                <select value={gender} onChange={e => setGender(e.target.value)} className="w-full px-3.5 py-2.5 text-xs cursor-pointer">
                  <option value="Hombre">Hombre</option>
                  <option value="Mujer">Mujer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide">Objetivo</label>
                <input type="text" value={goal} onChange={e => setGoal(e.target.value)} className="w-full px-3.5 py-2.5 text-xs" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide">Días de Entrenamiento</label>
                <div className="flex gap-1.5">
                  {VIP_DAYS.map(d => (
                    <label key={d} className="cursor-pointer flex-1 text-center text-xs border border-[#e4e4e7] p-2" style={{ background: assignedDays.includes(d) ? '#00fff6' : '#fff', color: '#000' }}>
                      <input type="checkbox" className="sr-only" checked={assignedDays.includes(d)} onChange={() => toggleDay(d)} />
                      {VIP_DAY_LABELS[d]}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-sora-medium text-slate-600 border border-[#e4e4e7] bg-white transition">Cancelar</button>
              <button type="submit" className="px-5 py-2 text-xs font-sora-bold bg-[#004b73] hover:bg-[#003857] transition" style={{ color: '#00fff6' }}>Guardar Cambios</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

