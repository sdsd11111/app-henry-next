import { WorkoutLog } from './types';

export interface IndexedLog {
  log: WorkoutLog;
  /** Índice original dentro de client.logs — necesario para eliminar registros */
  origIndex: number;
}

/**
 * Normaliza el nombre de un ejercicio para comparaciones tolerantes:
 * sin acentos, sin espacios duplicados, sin espacios al inicio/final y en minúsculas.
 */
export function normalizeExerciseName(name: unknown): string {
  return String(name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Convierte fechas "YYYY-MM-DD" o "DD/MM/YYYY" (formato usado en la BD) a Date. */
export function parseLogDate(date?: string | null): Date | null {
  const raw = String(date ?? '').trim();
  if (!raw) return null;

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  const dmy = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (dmy) {
    let year = Number(dmy[3]);
    if (year < 100) year += 2000;
    return new Date(year, Number(dmy[2]) - 1, Number(dmy[1]));
  }

  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Clave numérica de orden cronológico para un registro.
 * Prioriza el id real de la BD (workout_logs.id); si el registro se guardó
 * localmente en la sesión usa su fecha (epoch ms, siempre mayor que un id de BD).
 */
function logRank(log: WorkoutLog): number {
  const dbId = Number((log as any).dbId);
  if (Number.isFinite(dbId) && dbId > 0) return dbId;

  const rawId = log.id;
  const numericId = Number(rawId);
  if (
    typeof rawId === 'string' &&
    rawId.trim() !== '' &&
    Number.isFinite(numericId) &&
    numericId > 0 &&
    numericId < 1e11
  ) {
    return numericId;
  }

  const parsed = parseLogDate(log.date);
  return parsed ? parsed.getTime() : 0;
}

/** Registros ordenados del más reciente al más antiguo, conservando su índice original. */
export function sortLogsDescending(logs?: WorkoutLog[] | null): IndexedLog[] {
  return (logs || [])
    .map((log, origIndex) => ({ log, origIndex }))
    .sort((a, b) => {
      const diff = logRank(b.log) - logRank(a.log);
      if (diff !== 0) return diff;
      // Sin información de fecha/id: el último guardado va primero
      return b.origIndex - a.origIndex;
    });
}
