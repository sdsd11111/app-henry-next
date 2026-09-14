import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  const conn = await pool.getConnection();
  try {
    const data = await request.json();

    // Helper to persist single day routine to MySQL with atomic transaction
    const persistSingleRoutine = async (clientId: string, day: string, routineData: any, resetSetsCompleted = false) => {
      const vitals = routineData.vitals || {};
      const wellness = routineData.wellness || {};

      await conn.beginTransaction();
      try {
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

        // Delete old sets first, then old routine_exercises
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

        // Re-insert exercises and sets in order
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
                    Number(s.weight) || 0,
                    Number(s.reps) || 0,
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

        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      }
    };

    // Handle save_routine action (live save on set complete, weight change, etc.)
    if (data.action === 'save_routine') {
      const { clientId, routine, day } = data;
      if (!clientId || !routine || !day) {
        conn.release();
        return NextResponse.json({ error: 'Missing clientId, routine or day' }, { status: 400 });
      }
      // Release the shared connection immediately - save_routine uses its own
      conn.release();

      // Use an independent connection to avoid lock contention with concurrent auto-saves
      const saveConn = await pool.getConnection();
      try {
        await saveConn.query('SET innodb_lock_wait_timeout = 5');

        const persistRoutineIndependent = async () => {
          const vitals = routine.vitals || {};
          const wellness = routine.wellness || {};

          await saveConn.beginTransaction();
          try {
            const [existRoutine]: any = await saveConn.query(
              'SELECT id FROM day_routines WHERE client_id = ? AND day_of_week = ?',
              [clientId, day]
            );

            let dbRoutineId: number;
            if (existRoutine && existRoutine.length > 0) {
              dbRoutineId = existRoutine[0].id;
              await saveConn.query(
                `UPDATE day_routines SET session_name=?, notes=?, is_menstrual_cycle=?, systolic=?, diastolic=?, heart_rate=?, mood=?, sleep=?, nutrition=?, weight=? WHERE id=?`,
                [
                  routine.sessionName || '', routine.notes || '', routine.isMenstrualCycle ? 1 : 0,
                  vitals.systolic || 0, vitals.diastolic || 0, vitals.heartRate || 0,
                  wellness.mood || null, wellness.sleep || '', wellness.nutrition || '', wellness.weight || 0.0,
                  dbRoutineId
                ]
              );
            } else {
              const [insResult]: any = await saveConn.query(
                `INSERT INTO day_routines (client_id, day_of_week, session_name, notes, is_menstrual_cycle, systolic, diastolic, heart_rate, mood, sleep, nutrition, weight) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  clientId, day, routine.sessionName || '', routine.notes || '', routine.isMenstrualCycle ? 1 : 0,
                  vitals.systolic || 0, vitals.diastolic || 0, vitals.heartRate || 0,
                  wellness.mood || null, wellness.sleep || '', wellness.nutrition || '', wellness.weight || 0.0
                ]
              );
              dbRoutineId = insResult.insertId;
            }

            // Delete old sets first, then old routine_exercises
            const [oldExIds]: any = await saveConn.query(
              'SELECT id FROM routine_exercises WHERE routine_id = ?', [dbRoutineId]
            );
            const exIds = oldExIds.map((e: any) => e.id);
            if (exIds.length > 0) {
              const placeholders = exIds.map(() => '?').join(',');
              await saveConn.query(`DELETE FROM exercise_sets WHERE routine_exercise_id IN (${placeholders})`, exIds);
            }
            await saveConn.query('DELETE FROM routine_exercises WHERE routine_id = ?', [dbRoutineId]);

            // Re-insert exercises and sets in order
            if (routine.exercises && Array.isArray(routine.exercises)) {
              for (let exIndex = 0; exIndex < routine.exercises.length; exIndex++) {
                const ex = routine.exercises[exIndex];
                const exId = ex.id || `ve_auto_${dbRoutineId}_${exIndex}_${Date.now()}`;
                await saveConn.query(
                  `INSERT INTO routine_exercises (id, routine_id, order_index, pattern, exercise_name, sets_target, sets_note, reps_target, rest_time, rpe, progression_prompted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [exId, dbRoutineId, ex.order || '', ex.pattern || '', ex.name || '', ex.setsTarget || '', ex.setsNote || '', ex.repsTarget || '', ex.rest || '', ex.rpe || 0, ex.progressionPrompted ? 1 : 0]
                );
                if (ex.sets && Array.isArray(ex.sets)) {
                  for (let sIndex = 0; sIndex < ex.sets.length; sIndex++) {
                    const s = ex.sets[sIndex];
                    const setId = `${exId}_s${sIndex}`;
                    await saveConn.query(
                      `INSERT INTO exercise_sets (id, routine_exercise_id, set_number, weight, reps, completed) VALUES (?, ?, ?, ?, ?, ?)`,
                      [setId, exId, s.setNumber || sIndex + 1, Number(s.weight) || 0, Number(s.reps) || 0, s.completed ? 1 : 0]
                    );
                  }
                }
              }
            }

            // Cardio
            try {
              await saveConn.query('DELETE FROM cardio_activities WHERE routine_id = ?', [dbRoutineId]);
              if (routine.cardio && Array.isArray(routine.cardio)) {
                for (let cIndex = 0; cIndex < routine.cardio.length; cIndex++) {
                  const card = routine.cardio[cIndex];
                  const cardId = card.id || `vc_${dbRoutineId}_${cIndex}_${Date.now()}`;
                  await saveConn.query(
                    `INSERT INTO cardio_activities (id, routine_id, type, timing, time, distance, completed) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [cardId, dbRoutineId, card.type || '', card.timing || '', card.time || 0, card.distance || 0, card.completed ? 1 : 0]
                  );
                }
              }
            } catch (errCardio) {
              console.warn('Cardio sync notice:', errCardio);
            }

            await saveConn.commit();
          } catch (err) {
            await saveConn.rollback();
            throw err;
          }
        };

        // Retry loop for deadlock or lock timeout (up to 3 retries)
        let lastError: any = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            await persistRoutineIndependent();
            lastError = null;
            break;
          } catch (retryErr: any) {
            lastError = retryErr;
            const isLockError =
              retryErr.code === 'ER_LOCK_DEADLOCK' ||
              retryErr.code === 'ER_LOCK_WAIT_TIMEOUT' ||
              (retryErr.message && (
                retryErr.message.includes('Deadlock') ||
                retryErr.message.includes('Lock wait timeout')
              ));

            if (isLockError && attempt < 2) {
              const backoff = (attempt + 1) * 150 + Math.floor(Math.random() * 100);
              console.warn(`[save_routine] ${retryErr.code || 'Lock contention'}, reintentando intento ${attempt + 2} tras ${backoff}ms...`);
              await new Promise(r => setTimeout(r, backoff));
            } else {
              break;
            }
          }
        }

        if (lastError) {
          throw lastError;
        }

        return NextResponse.json({ success: true });
      } catch (err: any) {
        console.error('Error in save_routine:', err);
        return NextResponse.json({ error: err.message || 'Error saving routine' }, { status: 500 });
      } finally {
        saveConn.release();
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

    // Release the shared connection — sync_all will use its own short-lived connections
    // per client/routine to avoid holding locks on the clients table for a long time.
    conn.release();

    const payload = data.payload || {};

    // Helper: get a connection with short lock timeout
    const getConn = async () => {
      const c = await pool.getConnection();
      await c.query('SET innodb_lock_wait_timeout = 8');
      return c;
    };

    // 1. Sync Floor Clients — one short transaction per client
    if (payload.clients && Array.isArray(payload.clients)) {
      for (const c of payload.clients) {
        const assigned = JSON.stringify(c.assignedDays || c.assigned_days || []);
        const sc = await getConn();
        try {
          await sc.query(
            `UPDATE clients SET name=?, trainer_id=?, time_slot=?, goal=?, active_day=?, is_active_floor=?, assigned_days=? WHERE id=?`,
            [c.name, c.trainerId || c.trainer || 'henry', c.timeSlot || c.time_slot || '', c.goal || '', c.activeDay || c.active_day || '', c.isActiveFloor ? 1 : 0, assigned, c.id]
          );
        } catch (e) {
          console.error('Error syncing floor client:', e);
        } finally {
          sc.release();
        }
      }
    }

    // 2. Sync VIP Clients — one short transaction per client
    if (payload.vip_clients && Array.isArray(payload.vip_clients)) {
      for (const v of payload.vip_clients) {
        const sc = await getConn();
        try {
          const [existing]: any = await sc.query('SELECT id FROM clients WHERE id = ?', [v.id]);
          if (!existing || existing.length === 0) { sc.release(); continue; }

          const assigned = JSON.stringify(v.assignedDays || v.assigned_days || []);
          const passPlain = v.password || v.password_plain || '';
          const hash = passPlain ? await bcrypt.hash(passPlain, 10) : '';
          const trainerId = v.trainerId || v.trainer || 'henry';

          await sc.query(
            `UPDATE clients SET name=?, username=?, password_hash=?, password_plain=?, trainer_id=?, gender=?, goal=?, active_day=?, assigned_days=?, last_date_rendered=? WHERE id=?`,
            [v.name, v.username || '', hash, passPlain, trainerId, v.gender || '', v.goal || '', v.activeDay || '', assigned, v.lastDateRendered || '', v.id]
          );

          // Sync Workout Logs
          if (v.logs && Array.isArray(v.logs)) {
            await sc.query('DELETE FROM workout_logs WHERE client_id = ?', [v.id]);
            for (const log of v.logs) {
              await sc.query(
                'INSERT INTO workout_logs (client_id, log_date, day_of_week, notes, exercises_count, sets_count, log_data) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [v.id, log.date || '', log.dayOfWeek || '', log.notes || '', log.exercisesCount || 0, log.setsCount || 0, JSON.stringify(log)]
              );
            }
          }
        } catch (e) {
          console.error('Error syncing VIP client:', e);
        } finally {
          sc.release();
        }
      }
    }

    // 3. Sync Routines — one short transaction per routine (client+day)
    if (payload.routines && typeof payload.routines === 'object') {
      for (const [key, routineData] of Object.entries<any>(payload.routines)) {
        if (!key.startsWith('routine_')) continue;
        const rawKey = key.substring(8);
        const lastUnderscore = rawKey.lastIndexOf('_');
        if (lastUnderscore === -1) continue;

        const clientId = rawKey.substring(0, lastUnderscore);
        const day = rawKey.substring(lastUnderscore + 1);

        const executeSyncRoutine = async () => {
          const sc = await getConn();
          try {
            const [checkClient]: any = await sc.query('SELECT id FROM clients WHERE id = ?', [clientId]);
            if (!checkClient || checkClient.length === 0) { sc.release(); return; }

            const vitals = routineData.vitals || {};
            const wellness = routineData.wellness || {};

            await sc.beginTransaction();
            try {
              const [existRoutine]: any = await sc.query(
                'SELECT id FROM day_routines WHERE client_id = ? AND day_of_week = ?', [clientId, day]
              );

              let dbRoutineId: number;
              if (existRoutine && existRoutine.length > 0) {
                dbRoutineId = existRoutine[0].id;
                await sc.query(
                  `UPDATE day_routines SET session_name=?, notes=?, is_menstrual_cycle=?, systolic=?, diastolic=?, heart_rate=?, mood=?, sleep=?, nutrition=?, weight=? WHERE id=?`,
                  [routineData.sessionName || '', routineData.notes || '', routineData.isMenstrualCycle ? 1 : 0, vitals.systolic || 0, vitals.diastolic || 0, vitals.heartRate || 0, wellness.mood || null, wellness.sleep || '', wellness.nutrition || '', wellness.weight || 0.0, dbRoutineId]
                );
              } else {
                const [insResult]: any = await sc.query(
                  `INSERT INTO day_routines (client_id, day_of_week, session_name, notes, is_menstrual_cycle, systolic, diastolic, heart_rate, mood, sleep, nutrition, weight) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [clientId, day, routineData.sessionName || '', routineData.notes || '', routineData.isMenstrualCycle ? 1 : 0, vitals.systolic || 0, vitals.diastolic || 0, vitals.heartRate || 0, wellness.mood || null, wellness.sleep || '', wellness.nutrition || '', wellness.weight || 0.0]
                );
                dbRoutineId = insResult.insertId;
              }

              const [oldExIds]: any = await sc.query('SELECT id FROM routine_exercises WHERE routine_id = ?', [dbRoutineId]);
              const exIds = oldExIds.map((e: any) => e.id);
              if (exIds.length > 0) {
                const ph = exIds.map(() => '?').join(',');
                await sc.query(`DELETE FROM exercise_sets WHERE routine_exercise_id IN (${ph})`, exIds);
              }
              await sc.query('DELETE FROM routine_exercises WHERE routine_id = ?', [dbRoutineId]);

              if (routineData.exercises && Array.isArray(routineData.exercises)) {
                for (let exIndex = 0; exIndex < routineData.exercises.length; exIndex++) {
                  const ex = routineData.exercises[exIndex];
                  const exId = ex.id || `ve_auto_${dbRoutineId}_${exIndex}_${Date.now()}`;
                  await sc.query(
                    `INSERT INTO routine_exercises (id, routine_id, order_index, pattern, exercise_name, sets_target, sets_note, reps_target, rest_time, rpe, progression_prompted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [exId, dbRoutineId, ex.order || '', ex.pattern || '', ex.name || '', ex.setsTarget || '', ex.setsNote || '', ex.repsTarget || '', ex.rest || '', ex.rpe || 0, ex.progressionPrompted ? 1 : 0]
                  );
                  if (ex.sets && Array.isArray(ex.sets)) {
                    for (let sIndex = 0; sIndex < ex.sets.length; sIndex++) {
                      const s = ex.sets[sIndex];
                      await sc.query(
                        `INSERT INTO exercise_sets (id, routine_exercise_id, set_number, weight, reps, completed) VALUES (?, ?, ?, ?, ?, ?)`,
                        [`${exId}_s${sIndex}`, exId, s.setNumber || sIndex + 1, s.weight || 0, s.reps || 0, 0]
                      );
                    }
                  }
                }
              }

              try {
                await sc.query('DELETE FROM cardio_activities WHERE routine_id = ?', [dbRoutineId]);
                if (routineData.cardio && Array.isArray(routineData.cardio)) {
                  for (let cIndex = 0; cIndex < routineData.cardio.length; cIndex++) {
                    const card = routineData.cardio[cIndex];
                    await sc.query(
                      `INSERT INTO cardio_activities (id, routine_id, type, timing, time, distance, completed) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                      [card.id || `vc_${dbRoutineId}_${cIndex}_${Date.now()}`, dbRoutineId, card.type || '', card.timing || '', card.time || 0, card.distance || 0, card.completed ? 1 : 0]
                    );
                  }
                }
              } catch (errCardio) {
                console.warn('Cardio sync notice:', errCardio);
              }

              await sc.commit();
            } catch (err) {
              await sc.rollback();
              throw err;
            }
          } finally {
            sc.release();
          }
        };

        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            await executeSyncRoutine();
            break;
          } catch (err: any) {
            const isLockError =
              err.code === 'ER_LOCK_DEADLOCK' ||
              err.code === 'ER_LOCK_WAIT_TIMEOUT' ||
              (err.message && (
                err.message.includes('Deadlock') ||
                err.message.includes('Lock wait timeout')
              ));

            if (isLockError && attempt < 2) {
              const backoff = (attempt + 1) * 150 + Math.floor(Math.random() * 100);
              console.warn(`[sync_all] ${err.code || 'Lock contention'} en ${key}, reintentando intento ${attempt + 2}...`);
              await new Promise(r => setTimeout(r, backoff));
            } else {
              console.error(`Error syncing routine ${key}:`, err);
              break;
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Sincronización completada con éxito' });
  } catch (error: any) {
    try { conn.release(); } catch (_) {}
    console.error('Error in sync API:', error);
    return NextResponse.json({ error: error.message || 'Error de sincronización' }, { status: 500 });
  }
}

