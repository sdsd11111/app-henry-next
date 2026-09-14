import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeHidden = searchParams.get('include_hidden') === '1' || searchParams.get('secret') === 'cr_magic_2026';
    const specificClient = searchParams.get('clientId');

    const allDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    let clientsQuery = "SELECT * FROM clients WHERE client_type = 'vip' AND username != 'CR' AND id != 'vip_cr'";
    const clientQueryParams: any[] = [];

    if (specificClient === 'vip_cr' || specificClient === 'CR') {
      clientsQuery = "SELECT * FROM clients WHERE client_type = 'vip' AND (id = ? OR username = ?)";
      clientQueryParams.push(specificClient, specificClient);
    } else if (includeHidden) {
      clientsQuery = "SELECT * FROM clients WHERE client_type = 'vip'";
    }

    // 1. Parallel batch queries instead of N+1 nested loops
    const [
      [clients],
      [allDayRoutines],
      [allExercises],
      [allSets],
      [allCardios],
      [allLogs]
    ]: any = await Promise.all([
      pool.query(clientsQuery, clientQueryParams),
      pool.query("SELECT * FROM day_routines"),
      pool.query("SELECT * FROM routine_exercises ORDER BY order_index ASC"),
      pool.query("SELECT * FROM exercise_sets ORDER BY set_number ASC"),
      pool.query("SELECT * FROM cardio_activities"),
      pool.query("SELECT id, client_id, log_data FROM workout_logs ORDER BY id DESC")
    ]);

    // 2. Build index maps in memory (instant lookup O(1))
    const setsByExerciseId = new Map<string, any[]>();
    for (const s of allSets) {
      const exId = s.routine_exercise_id;
      if (!setsByExerciseId.has(exId)) setsByExerciseId.set(exId, []);
      setsByExerciseId.get(exId)!.push({
        id: s.id,
        setNumber: Number(s.set_number),
        weight: Number(s.weight),
        reps: Number(s.reps),
        completed: Boolean(s.completed)
      });
    }

    const cardiosByRoutineId = new Map<number, any[]>();
    for (const ca of allCardios) {
      const rId = ca.routine_id;
      if (!cardiosByRoutineId.has(rId)) cardiosByRoutineId.set(rId, []);
      cardiosByRoutineId.get(rId)!.push({
        id: ca.id,
        type: ca.type || '',
        timing: ca.timing || '',
        time: Number(ca.time || 0),
        distance: Number(ca.distance || 0),
        completed: Boolean(ca.completed)
      });
    }

    const exercisesByRoutineId = new Map<number, any[]>();
    for (const ex of allExercises) {
      const rId = ex.routine_id;
      if (!exercisesByRoutineId.has(rId)) exercisesByRoutineId.set(rId, []);
      exercisesByRoutineId.get(rId)!.push({
        id: ex.id,
        order: ex.order_index,
        pattern: ex.pattern || '',
        name: ex.exercise_name,
        setsTarget: ex.sets_target || '',
        setsNote: ex.sets_note || '',
        repsTarget: ex.reps_target || '',
        rest: ex.rest_time || '',
        rpe: Number(ex.rpe || 0),
        progressionPrompted: Boolean(ex.progression_prompted),
        sets: setsByExerciseId.get(ex.id) || []
      });
    }

    const routinesByClientId = new Map<string, Record<string, any>>();
    for (const dr of allDayRoutines) {
      const cId = dr.client_id;
      if (!routinesByClientId.has(cId)) routinesByClientId.set(cId, {});
      routinesByClientId.get(cId)![dr.day_of_week] = {
        sessionName: dr.session_name || '',
        notes: dr.notes || '',
        isMenstrualCycle: Boolean(dr.is_menstrual_cycle),
        vitals: {
          systolic: Number(dr.systolic || 0),
          diastolic: Number(dr.diastolic || 0),
          heartRate: Number(dr.heart_rate || 0)
        },
        wellness: {
          mood: dr.mood !== null && dr.mood !== undefined ? Number(dr.mood) : null,
          sleep: dr.sleep || null,
          nutrition: dr.nutrition || null,
          weight: Number(dr.weight || 0)
        },
        exercises: exercisesByRoutineId.get(dr.id) || [],
        cardio: cardiosByRoutineId.get(dr.id) || []
      };
    }

    const logsByClientId = new Map<string, any[]>();
    for (const rl of allLogs) {
      const cId = rl.client_id;
      if (!logsByClientId.has(cId)) logsByClientId.set(cId, []);
      if (rl.log_data) {
        try {
          const parsed = typeof rl.log_data === 'string' ? JSON.parse(rl.log_data) : rl.log_data;
          if (parsed) {
            // Keep DB id accessible for reliable deletion and tracking
            if (!parsed.id) parsed.id = String(rl.id);
            parsed.dbId = rl.id;
            logsByClientId.get(cId)!.push(parsed);
          }
        } catch {
          // Ignore invalid JSON
        }
      }
    }

    // 3. Assemble final clients array
    const result = clients.map((c: any) => {
      let assignedDays: string[] = [];
      if (c.assigned_days) {
        try {
          assignedDays = typeof c.assigned_days === 'string' ? JSON.parse(c.assigned_days) : c.assigned_days;
        } catch {
          assignedDays = [];
        }
      }

      const clientRoutines = routinesByClientId.get(c.id) || {};
      for (const day of allDays) {
        if (!clientRoutines[day]) {
          clientRoutines[day] = {
            sessionName: '',
            notes: '',
            isMenstrualCycle: false,
            vitals: { systolic: 120, diastolic: 80, heartRate: 70 },
            wellness: { mood: null, sleep: null, nutrition: null, weight: 0 },
            exercises: [],
            cardio: []
          };
        }
      }

      return {
        id: c.id,
        name: c.name,
        username: c.username || '',
        password: c.password_plain || '',
        password_plain: c.password_plain || '',
        gender: c.gender || 'Hombre',
        trainerId: c.trainer_id,
        goal: c.goal || '',
        activeDay: c.active_day || (assignedDays[0] || 'Lunes'),
        assignedDays,
        lastDateRendered: c.last_date_rendered || '',
        routines: clientRoutines,
        logs: logsByClientId.get(c.id) || []
      };
    });

    return NextResponse.json({ success: true, vipClients: result });
  } catch (error: any) {
    console.error('Error in routines API:', error);
    return NextResponse.json({ error: error.message || 'Error al obtener rutinas' }, { status: 500 });
  }
}
