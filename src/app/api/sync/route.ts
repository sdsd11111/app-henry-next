import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  const conn = await pool.getConnection();
  try {
    const data = await request.json();

    // Helper to persist single day routine to MySQL
    const persistSingleRoutine = async (clientId: string, day: string, routineData: any, resetSetsCompleted = false) => {
      const vitals = routineData.vitals || {};
      const wellness = routineData.wellness || {};

      const [existRoutine]: any = await conn.query(
        'SELECT id FROM day_routines WHERE client_id = ? AND day_of_week = ?',
        [clientId, day]
      );

      let dbRoutineId: number;
      if (existRoutine && existRoutine.length > 0) {
        dbRoutineId = existRoutine[0].id;
        await conn.query(
          `UPDATE day_routines SET session_name=?, notes=?, is_menstrual_cycle=?, systolic=?, diastolic=?, heart_rate=?, mood=?, sleep=?, nutrition=?, weight=? WHERE id=?`,
          [
            routineData.sessionName || '',
            routineData.notes || '',
            routineData.isMenstrualCycle ? 1 : 0,
            vitals.systolic || 0,
            vitals.diastolic || 0,
            vitals.heartRate || 0,
            wellness.mood || null,
            wellness.sleep || '',
            wellness.nutrition || '',
            wellness.weight || 0.0,
            dbRoutineId
          ]
        );
      } else {
        const [insResult]: any = await conn.query(
          `INSERT INTO day_routines (client_id, day_of_week, session_name, notes, is_menstrual_cycle, systolic, diastolic, heart_rate, mood, sleep, nutrition, weight) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            clientId,
            day,
            routineData.sessionName || '',
            routineData.notes || '',
            routineData.isMenstrualCycle ? 1 : 0,
            vitals.systolic || 0,
            vitals.diastolic || 0,
            vitals.heartRate || 0,
            wellness.mood || null,
            wellness.sleep || '',
            wellness.nutrition || '',
            wellness.weight || 0.0
          ]
        );
        dbRoutineId = insResult.insertId;
      }

      // Delete old sets
      const [oldExIds]: any = await conn.query(
        'SELECT id FROM routine_exercises WHERE routine_id = ?',
        [dbRoutineId]
      );
      const exIds = oldExIds.map((e: any) => e.id);
      if (exIds.length > 0) {
        const placeholders = exIds.map(() => '?').join(',');
        await conn.query(
          `DELETE FROM exercise_sets WHERE routine_exercise_id IN (${placeholders})`,
          exIds
        );
      }
      await conn.query('DELETE FROM routine_exercises WHERE routine_id = ?', [dbRoutineId]);

      // Re-insert exercises and sets
      if (routineData.exercises && Array.isArray(routineData.exercises)) {
        for (let exIndex = 0; exIndex < routineData.exercises.length; exIndex++) {
          const ex = routineData.exercises[exIndex];
          const exId = ex.id || `ve_auto_${dbRoutineId}_${exIndex}_${Date.now()}`;

          await conn.query(
            `INSERT INTO routine_exercises (id, routine_id, order_index, pattern, exercise_name, sets_target, sets_note, reps_target, rest_time, rpe, progression_prompted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              exId,
              dbRoutineId,
              ex.order || '',
              ex.pattern || '',
              ex.name || '',
              ex.setsTarget || '',
              ex.setsNote || '',
              ex.repsTarget || '',
              ex.rest || '',
              ex.rpe || 0,
              ex.progressionPrompted ? 1 : 0
            ]
          );

          if (ex.sets && Array.isArray(ex.sets)) {
            for (let sIndex = 0; sIndex < ex.sets.length; sIndex++) {
              const s = ex.sets[sIndex];
              const setId = `${exId}_s${sIndex}`;
              const completedVal = resetSetsCompleted ? 0 : (s.completed ? 1 : 0);
              await conn.query(
                `INSERT INTO exercise_sets (id, routine_exercise_id, set_number, weight, reps, completed) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                  setId,
                  exId,
                  s.setNumber || sIndex + 1,
                  s.weight || 0,
                  s.reps || 0,
                  completedVal
                ]
              );
            }
          }
        }
      }

      // Cardio
      try {
        await conn.query('DELETE FROM cardio_activities WHERE routine_id = ?', [dbRoutineId]);
        if (routineData.cardio && Array.isArray(routineData.cardio)) {
          for (let cIndex = 0; cIndex < routineData.cardio.length; cIndex++) {
            const card = routineData.cardio[cIndex];
            const cardId = card.id || `vc_${dbRoutineId}_${cIndex}_${Date.now()}`;
            await conn.query(
              `INSERT INTO cardio_activities (id, routine_id, type, timing, time, distance, completed) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                cardId,
                dbRoutineId,
                card.type || '',
                card.timing || '',
                card.time || 0,
                card.distance || 0,
                card.completed ? 1 : 0
              ]
            );
          }
        }
      } catch (errCardio) {
        console.warn('Cardio sync notice:', errCardio);
      }
    };

    // Handle save_routine action (live save on set complete, weight change, etc.)
    if (data.action === 'save_routine') {
      const { clientId, routine, day } = data;
      if (!clientId || !routine || !day) {
        conn.release();
        return NextResponse.json({ error: 'Missing clientId, routine or day' }, { status: 400 });
      }
      try {
        await persistSingleRoutine(clientId, day, routine, false);
        return NextResponse.json({ success: true });
      } finally {
        conn.release();
      }
    }

    // Handle save_log action (session finished, resets sets completed and persists to MySQL)
    if (data.action === 'save_log') {
      const { clientId, log, routine, day } = data;
      if (!clientId || !log) {
        conn.release();
        return NextResponse.json({ error: 'Missing clientId or log' }, { status: 400 });
      }
      try {
        await conn.query(
          'INSERT INTO workout_logs (client_id, log_date, day_of_week, notes, exercises_count, sets_count, log_data) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            clientId,
            log.date || new Date().toISOString().split('T')[0],
            log.dayOfWeek || day || '',
            log.notes || '',
            log.exercisesCount || 0,
            log.setsCount || 0,
            JSON.stringify(log),
          ]
        );

        if (routine && day) {
          // Reset completed to false for next session, apply overload weights if present
          await persistSingleRoutine(clientId, day, routine, true);
        }

        return NextResponse.json({ success: true });
      } finally {
        conn.release();
      }
    }

    // Handle delete_log action
    if (data.action === 'delete_log') {
      const { clientId, logId } = data;
      if (!clientId || !logId) {
        conn.release();
        return NextResponse.json({ error: 'Missing clientId or logId' }, { status: 400 });
      }
      try {
        await conn.query(
          "DELETE FROM workout_logs WHERE client_id = ? AND (id = ? OR JSON_UNQUOTE(JSON_EXTRACT(log_data, '$.id')) = ?)",
          [clientId, logId, logId]
        );
        return NextResponse.json({ success: true });
      } finally {
        conn.release();
      }
    }

    if (!data.action || data.action !== 'sync_all') {
      conn.release();
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const payload = data.payload || {};
    await conn.beginTransaction();

    // 1. Sync Floor Clients
    if (payload.clients && Array.isArray(payload.clients)) {
      for (const c of payload.clients) {
        const assigned = JSON.stringify(c.assignedDays || c.assigned_days || []);
        await conn.query(
          `UPDATE clients SET name=?, trainer_id=?, time_slot=?, goal=?, active_day=?, is_active_floor=?, assigned_days=? WHERE id=?`,
          [
            c.name,
            c.trainerId || c.trainer || 'henry',
            c.timeSlot || c.time_slot || '',
            c.goal || '',
            c.activeDay || c.active_day || '',
            c.isActiveFloor ? 1 : 0,
            assigned,
            c.id
          ]
        );
      }
    }

    // 2. Sync VIP Clients
    if (payload.vip_clients && Array.isArray(payload.vip_clients)) {
      for (const v of payload.vip_clients) {
        // Only update if client exists in MySQL
        const [existing]: any = await conn.query('SELECT id FROM clients WHERE id = ?', [v.id]);
        if (!existing || existing.length === 0) {
          continue;
        }

        const assigned = JSON.stringify(v.assignedDays || v.assigned_days || []);
        const passPlain = v.password || v.password_plain || '';
        const hash = passPlain ? await bcrypt.hash(passPlain, 10) : '';
        const trainerId = v.trainerId || v.trainer || 'henry';

        await conn.query(
          `UPDATE clients SET name=?, username=?, password_hash=?, password_plain=?, trainer_id=?, gender=?, goal=?, active_day=?, assigned_days=?, last_date_rendered=? WHERE id=?`,
          [
            v.name,
            v.username || '',
            hash,
            passPlain,
            trainerId,
            v.gender || '',
            v.goal || '',
            v.activeDay || '',
            assigned,
            v.lastDateRendered || '',
            v.id
          ]
        );

        // Sync Workout Logs
        if (v.logs && Array.isArray(v.logs)) {
          await conn.query('DELETE FROM workout_logs WHERE client_id = ?', [v.id]);
          for (const log of v.logs) {
            await conn.query(
              'INSERT INTO workout_logs (client_id, log_date, day_of_week, notes, exercises_count, sets_count, log_data) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [
                v.id,
                log.date || '',
                log.dayOfWeek || '',
                log.notes || '',
                log.exercisesCount || 0,
                log.setsCount || 0,
                JSON.stringify(log)
              ]
            );
          }
        }
      }
    }

    // 3. Sync Routines
    if (payload.routines && typeof payload.routines === 'object') {
      for (const [key, routineData] of Object.entries<any>(payload.routines)) {
        if (key.startsWith('routine_')) {
          const rawKey = key.substring(8);
          const lastUnderscore = rawKey.lastIndexOf('_');
          if (lastUnderscore !== -1) {
            const clientId = rawKey.substring(0, lastUnderscore);
            const day = rawKey.substring(lastUnderscore + 1);

            // Verify client exists
            const [checkClient]: any = await conn.query('SELECT id FROM clients WHERE id = ?', [clientId]);
            if (!checkClient || checkClient.length === 0) {
              continue;
            }

            const vitals = routineData.vitals || {};
            const wellness = routineData.wellness || {};

            const [existRoutine]: any = await conn.query(
              'SELECT id FROM day_routines WHERE client_id = ? AND day_of_week = ?',
              [clientId, day]
            );

            let dbRoutineId: number;
            if (existRoutine && existRoutine.length > 0) {
              dbRoutineId = existRoutine[0].id;
              await conn.query(
                `UPDATE day_routines SET session_name=?, notes=?, is_menstrual_cycle=?, systolic=?, diastolic=?, heart_rate=?, mood=?, sleep=?, nutrition=?, weight=? WHERE id=?`,
                [
                  routineData.sessionName || '',
                  routineData.notes || '',
                  routineData.isMenstrualCycle ? 1 : 0,
                  vitals.systolic || 0,
                  vitals.diastolic || 0,
                  vitals.heartRate || 0,
                  wellness.mood || null,
                  wellness.sleep || '',
                  wellness.nutrition || '',
                  wellness.weight || 0.0,
                  dbRoutineId
                ]
              );
            } else {
              const [insResult]: any = await conn.query(
                `INSERT INTO day_routines (client_id, day_of_week, session_name, notes, is_menstrual_cycle, systolic, diastolic, heart_rate, mood, sleep, nutrition, weight) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  clientId,
                  day,
                  routineData.sessionName || '',
                  routineData.notes || '',
                  routineData.isMenstrualCycle ? 1 : 0,
                  vitals.systolic || 0,
                  vitals.diastolic || 0,
                  vitals.heartRate || 0,
                  wellness.mood || null,
                  wellness.sleep || '',
                  wellness.nutrition || '',
                  wellness.weight || 0.0
                ]
              );
              dbRoutineId = insResult.insertId;
            }

            // Delete old exercise_sets
            const [oldExIds]: any = await conn.query(
              'SELECT id FROM routine_exercises WHERE routine_id = ?',
              [dbRoutineId]
            );
            const exIds = oldExIds.map((e: any) => e.id);
            if (exIds.length > 0) {
              const placeholders = exIds.map(() => '?').join(',');
              await conn.query(
                `DELETE FROM exercise_sets WHERE routine_exercise_id IN (${placeholders})`,
                exIds
              );
            }

            // Delete old routine_exercises
            await conn.query('DELETE FROM routine_exercises WHERE routine_id = ?', [dbRoutineId]);

            // Insert new exercises & sets
            if (routineData.exercises && Array.isArray(routineData.exercises)) {
              for (let exIndex = 0; exIndex < routineData.exercises.length; exIndex++) {
                const ex = routineData.exercises[exIndex];
                const exId = ex.id || `ve_auto_${dbRoutineId}_${exIndex}_${Date.now()}`;

                await conn.query(
                  `INSERT INTO routine_exercises (id, routine_id, order_index, pattern, exercise_name, sets_target, sets_note, reps_target, rest_time, rpe, progression_prompted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    exId,
                    dbRoutineId,
                    ex.order || '',
                    ex.pattern || '',
                    ex.name || '',
                    ex.setsTarget || '',
                    ex.setsNote || '',
                    ex.repsTarget || '',
                    ex.rest || '',
                    ex.rpe || 0,
                    ex.progressionPrompted ? 1 : 0
                  ]
                );

                if (ex.sets && Array.isArray(ex.sets)) {
                  for (let sIndex = 0; sIndex < ex.sets.length; sIndex++) {
                    const s = ex.sets[sIndex];
                    const setId = `${exId}_s${sIndex}`;
                    await conn.query(
                      `INSERT INTO exercise_sets (id, routine_exercise_id, set_number, weight, reps, completed) VALUES (?, ?, ?, ?, ?, ?)`,
                      [
                        setId,
                        exId,
                        s.setNumber || sIndex + 1,
                        s.weight || 0,
                        s.reps || 0,
                        0
                      ]
                    );
                  }
                }
              }
            }

            // Delete and insert cardio activities
            try {
              await conn.query('DELETE FROM cardio_activities WHERE routine_id = ?', [dbRoutineId]);
              if (routineData.cardio && Array.isArray(routineData.cardio)) {
                for (let cIndex = 0; cIndex < routineData.cardio.length; cIndex++) {
                  const card = routineData.cardio[cIndex];
                  const cardId = card.id || `vc_${dbRoutineId}_${cIndex}_${Date.now()}`;
                  await conn.query(
                    `INSERT INTO cardio_activities (id, routine_id, type, timing, time, distance, completed) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                      cardId,
                      dbRoutineId,
                      card.type || '',
                      card.timing || '',
                      card.time || 0,
                      card.distance || 0,
                      card.completed ? 1 : 0
                    ]
                  );
                }
              }
            } catch (errCardio) {
              console.warn('Cardio sync notice:', errCardio);
            }
          }
        }
      }
    }

    await conn.commit();
    return NextResponse.json({ success: true, message: 'Sincronización completada con éxito' });
  } catch (error: any) {
    await conn.rollback();
    console.error('Error in sync API:', error);
    return NextResponse.json({ error: error.message || 'Error de sincronización' }, { status: 500 });
  } finally {
    conn.release();
  }
}
