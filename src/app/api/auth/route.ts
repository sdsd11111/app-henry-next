import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { action } = data;

    if (!action) {
      return NextResponse.json({ error: 'No action specified' }, { status: 400 });
    }

    const pass = process.env.DB_PASS || '';
    console.log('[DEBUG AUTH] DB_PASS length:', pass.length, 'value:', pass);

    // Accept both naming conventions
    if (action === 'login_coach' || action === 'coach_login') {
      const { username, password } = data;
      if (!username || !password) {
        return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
      }

      const [rows]: any = await pool.query(
        'SELECT * FROM coaches WHERE username = ?',
        [username]
      );

      const coach = rows[0];
      if (coach) {
        let valid = false;
        if (coach.password_hash) {
          const normalizedHash = coach.password_hash.replace(/^\$2y\$/, '$2a$');
          try {
            valid = await bcrypt.compare(password, normalizedHash) || password === coach.password_hash;
          } catch {
            valid = false;
          }
        }

        // Fallback for demo/default passwords matching index.html fallback logic
        if (!valid && (password === 'admin123' || password === 'admin' || password === 'henry123')) {
          valid = true;
        }

        if (valid) {
          const coachData = { id: String(coach.id), name: coach.name, username: coach.username };
          return NextResponse.json({ success: true, coach: coachData, user: coachData, type: 'coach' });
        }
      }
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    // Accept both naming conventions
    if (action === 'login_vip' || action === 'vip_login') {
      const { username, password } = data;
      if (!username || !password) {
        return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
      }

      const [rows]: any = await pool.query(
        "SELECT * FROM clients WHERE username = ? AND client_type = 'vip'",
        [username]
      );

      const client = rows[0];
      if (client) {
        let valid = false;
        if (client.password_hash) {
          valid = await bcrypt.compare(password, client.password_hash);
        }
        if (!valid && client.password_plain) {
          valid = client.password_plain === password;
        }

        if (valid) {
          delete client.password_hash;
          let assignedDays: string[] = [];
          if (client.assigned_days) {
            try { assignedDays = typeof client.assigned_days === 'string' ? JSON.parse(client.assigned_days) : client.assigned_days; } catch { assignedDays = []; }
          }

          // Load VIP routines
          const [routineRows]: any = await pool.query('SELECT * FROM day_routines WHERE client_id = ?', [client.id]);
          const routinesMap: Record<string, any> = {};
          for (const routine of routineRows) {
            const [exercises]: any = await pool.query('SELECT * FROM routine_exercises WHERE routine_id = ? ORDER BY order_index', [routine.id]);
            const exercisesWithSets = [];
            for (const ex of exercises) {
              const [sets]: any = await pool.query('SELECT * FROM exercise_sets WHERE routine_exercise_id = ? ORDER BY set_number', [ex.id]);
              exercisesWithSets.push({
                id: ex.id, order: ex.order_index, pattern: ex.pattern || '', name: ex.exercise_name,
                setsTarget: ex.sets_target || '', setsNote: ex.sets_note || '', repsTarget: ex.reps_target || '',
                rest: ex.rest_time || '', rpe: ex.rpe || 0, progressionPrompted: Boolean(ex.progression_prompted),
                sets: sets.map((s: any) => ({ id: s.id, setNumber: s.set_number, weight: s.weight, reps: s.reps, completed: Boolean(s.completed) })),
              });
            }
            let cardio: any[] = [];
            try { const [ca]: any = await pool.query('SELECT * FROM cardio_activities WHERE routine_id = ?', [routine.id]); cardio = ca.map((c: any) => ({ id: c.id, type: c.type, timing: c.timing, time: c.time, distance: c.distance, completed: Boolean(c.completed) })); } catch { /* */ }
            routinesMap[routine.day_of_week] = {
              sessionName: routine.session_name || '', notes: routine.notes || '', isMenstrualCycle: Boolean(routine.is_menstrual_cycle),
              vitals: { systolic: routine.systolic || 0, diastolic: routine.diastolic || 0, heartRate: routine.heart_rate || 0 },
              wellness: { mood: routine.mood, sleep: routine.sleep || '', nutrition: routine.nutrition || '', weight: routine.weight || 0 },
              exercises: exercisesWithSets, cardio,
            };
          }

          // Load logs
          const [logs]: any = await pool.query('SELECT * FROM workout_logs WHERE client_id = ? ORDER BY log_date DESC', [client.id]);

          const clientData = {
            id: client.id, client_type: 'vip', name: client.name, username: client.username,
            password_plain: client.password_plain || '', gender: client.gender || '',
            trainerId: client.trainer_id || '', goal: client.goal || '',
            activeDay: client.active_day || assignedDays[0] || 'Lunes',
            assignedDays, routines: routinesMap,
            logs: logs.map((l: any) => { let p: any = {}; try { p = JSON.parse(l.log_data || '{}'); } catch { /**/ } return { id: l.id, date: l.log_date, dayOfWeek: l.day_of_week, notes: l.notes, exercisesCount: l.exercises_count, setsCount: l.sets_count, ...p }; }),
          };

          return NextResponse.json({ success: true, client: clientData, user: clientData, type: 'vip' });
        }
      }
      return NextResponse.json({ error: 'Usuario o contraseña VIP inválidos' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: error.message || 'Error en autenticación' }, { status: 500 });
  }
}
