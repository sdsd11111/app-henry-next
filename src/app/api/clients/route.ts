import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

function mapRow(c: any) {
  let assignedDays: string[] = [];
  if (c.assigned_days) {
    try {
      assignedDays = typeof c.assigned_days === 'string' ? JSON.parse(c.assigned_days) : c.assigned_days;
    } catch {
      assignedDays = [];
    }
  }
  return {
    id: c.id,
    client_type: c.client_type,
    name: c.name,
    username: c.username || '',
    password_plain: c.password_plain || '',
    gender: c.gender || '',
    trainerId: c.trainer_id || '',
    timeSlot: c.time_slot || '',
    goal: c.goal || '',
    activeDay: c.active_day || '',
    isActiveFloor: Boolean(c.is_active_floor),
    assignedDays,
    lastDateRendered: c.last_date_rendered || '',
    routines: {},
    logs: [],
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'floor';

    const [rows]: any = await pool.query(
      "SELECT * FROM clients WHERE client_type = ?",
      [type]
    );

    const clients = rows.map((c: any) => {
      let assignedDays: string[] = [];
      if (c.assigned_days) {
        try {
          assignedDays = typeof c.assigned_days === 'string' ? JSON.parse(c.assigned_days) : c.assigned_days;
        } catch {
          assignedDays = [];
        }
      }

      delete c.password_hash;
      return {
        ...c,
        trainerId: c.trainer_id,
        timeSlot: c.time_slot,
        activeDay: c.active_day || (assignedDays[0] || 'Lunes'),
        isActiveFloor: Boolean(c.is_active_floor),
        assignedDays,
        password: c.password_plain || '',
        password_plain: c.password_plain || '',
        routines: {},
        logs: []
      };
    });

    return NextResponse.json({ success: true, clients });
  } catch (error: any) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: error.message || 'Error al obtener clientes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Body is sent directly from page.tsx (not wrapped in .client)
    const type = body.type;  // 'floor' or 'vip'
    const id = body.id || uuidv4();
    const assignedDays = body.assignedDays || [];
    const assignedJson = JSON.stringify(assignedDays);
    const trainerId = body.trainerId || 'henry';

    if (type === 'vip') {
      const plainPassword = body.password || '';
      const hash = plainPassword ? await bcrypt.hash(plainPassword, 10) : '';

      await pool.query(
        `INSERT INTO clients (id, client_type, name, username, password_hash, password_plain, trainer_id, gender, goal, active_day, assigned_days, last_date_rendered)
         VALUES (?, 'vip', ?, ?, ?, ?, ?, ?, ?, ?, ?, '')`,
        [
          id,
          body.name,
          body.username || '',
          hash,
          plainPassword,
          trainerId,
          body.gender || 'Hombre',
          body.goal || '',
          assignedDays[0] || 'Lunes',
          assignedJson,
        ]
      );

      const client = {
        id,
        client_type: 'vip',
        name: body.name,
        username: body.username || '',
        password_plain: plainPassword,
        gender: body.gender || 'Hombre',
        trainerId,
        goal: body.goal || '',
        activeDay: assignedDays[0] || 'Lunes',
        assignedDays,
        routines: {},
        logs: [],
      };

      return NextResponse.json({ success: true, client });
    } else {
      const timeSlot = body.timeSlot || '';
      const isActiveFloor = body.isActiveFloor ? 1 : 0;

      await pool.query(
        `INSERT INTO clients (id, client_type, name, trainer_id, time_slot, goal, active_day, is_active_floor, assigned_days)
         VALUES (?, 'floor', ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          body.name,
          trainerId,
          timeSlot,
          body.goal || '',
          assignedDays[0] || 'Lun',
          isActiveFloor,
          assignedJson,
        ]
      );

      const client = {
        id,
        client_type: 'floor',
        name: body.name,
        trainerId,
        timeSlot,
        goal: body.goal || '',
        activeDay: assignedDays[0] || 'Lun',
        isActiveFloor: false,
        assignedDays,
      };

      return NextResponse.json({ success: true, client });
    }
  } catch (error: any) {
    console.error('Error creating client:', error);
    return NextResponse.json({ error: error.message || 'Error al crear cliente' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'No client ID provided' }, { status: 400 });
    }

    const assignedDays = updates.assignedDays || null;
    const assignedJson = assignedDays ? JSON.stringify(assignedDays) : null;

    // Determine which fields to update
    const setClauses: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) { setClauses.push('name = ?'); values.push(updates.name); }
    if (updates.trainerId !== undefined) { setClauses.push('trainer_id = ?'); values.push(updates.trainerId); }
    if (updates.timeSlot !== undefined) { setClauses.push('time_slot = ?'); values.push(updates.timeSlot); }
    if (updates.goal !== undefined) { setClauses.push('goal = ?'); values.push(updates.goal); }
    if (updates.activeDay !== undefined) { setClauses.push('active_day = ?'); values.push(updates.activeDay); }
    if (updates.isActiveFloor !== undefined) { setClauses.push('is_active_floor = ?'); values.push(updates.isActiveFloor ? 1 : 0); }
    if (assignedJson !== null) { setClauses.push('assigned_days = ?'); values.push(assignedJson); }
    if (updates.gender !== undefined) { setClauses.push('gender = ?'); values.push(updates.gender); }
    if (updates.username !== undefined) { setClauses.push('username = ?'); values.push(updates.username); }
    if (updates.password !== undefined && updates.password) {
      const hash = await bcrypt.hash(updates.password, 10);
      setClauses.push('password_hash = ?');
      setClauses.push('password_plain = ?');
      values.push(hash);
      values.push(updates.password);
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ success: true, message: 'No fields to update' });
    }

    values.push(id);
    await pool.query(`UPDATE clients SET ${setClauses.join(', ')} WHERE id = ?`, values);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating client:', error);
    return NextResponse.json({ error: error.message || 'Error al actualizar cliente' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const conn = await pool.getConnection();
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('id');

    if (!clientId) {
      return NextResponse.json({ error: 'No client ID provided' }, { status: 400 });
    }

    await conn.beginTransaction();

    // 1. Get IDs of day_routines for client
    const [routines]: any = await conn.query(
      'SELECT id FROM day_routines WHERE client_id = ?',
      [clientId]
    );
    const routineIds = routines.map((r: any) => r.id);

    if (routineIds.length > 0) {
      const inRoutines = routineIds.map(() => '?').join(',');

      // 2. Get exercise IDs
      const [exercises]: any = await conn.query(
        `SELECT id FROM routine_exercises WHERE routine_id IN (${inRoutines})`,
        routineIds
      );
      const exIds = exercises.map((e: any) => e.id);

      if (exIds.length > 0) {
        const inEx = exIds.map(() => '?').join(',');
        await conn.query(`DELETE FROM exercise_sets WHERE routine_exercise_id IN (${inEx})`, exIds);
        await conn.query(`DELETE FROM routine_exercises WHERE id IN (${inEx})`, exIds);
      }

      try {
        await conn.query(`DELETE FROM cardio_activities WHERE routine_id IN (${inRoutines})`, routineIds);
      } catch { /* cardio table may not exist */ }

      await conn.query(`DELETE FROM day_routines WHERE id IN (${inRoutines})`, routineIds);
    }

    // 3. Delete workout_logs
    await conn.query('DELETE FROM workout_logs WHERE client_id = ?', [clientId]);

    // 4. Delete client
    await conn.query('DELETE FROM clients WHERE id = ?', [clientId]);

    await conn.commit();
    return NextResponse.json({ success: true, message: 'Cliente eliminado permanentemente' });
  } catch (error: any) {
    await conn.rollback();
    console.error('Error deleting client:', error);
    return NextResponse.json({ error: error.message || 'Error al eliminar cliente' }, { status: 500 });
  } finally {
    conn.release();
  }
}
