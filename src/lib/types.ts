export interface Coach {
  id: string;
  name: string;
  username: string;
}

export interface ExerciseSet {
  id?: string;
  setNumber: number;
  weight: number;
  reps: number;
  completed?: boolean;
}

export interface CardioActivity {
  id?: string;
  type: string;
  timing: string;
  time: number;
  distance: number;
  completed?: boolean;
}

export interface RoutineExercise {
  id: string;
  order?: string;
  pattern?: string;
  name: string;
  setsTarget?: string;
  setsNote?: string;
  repsTarget?: string;
  rest?: string;
  rpe?: number;
  progressionPrompted?: boolean;
  nextSuggestedWeight?: number;
  sets: ExerciseSet[];
}

export interface RoutineVitals {
  systolic: number;
  diastolic: number;
  heartRate: number;
}

export interface RoutineWellness {
  mood: number | string | null;
  sleep: string | null;
  nutrition: string | null;
  weight: number;
}

export interface DayRoutine {
  sessionName?: string;
  notes?: string;
  isMenstrualCycle?: boolean;
  vitals?: RoutineVitals;
  wellness?: RoutineWellness;
  exercises: RoutineExercise[];
  cardio: CardioActivity[];
}

export interface WorkoutLog {
  id?: number | string;
  date?: string;
  dayOfWeek?: string;
  notes?: string;
  exercisesCount?: number;
  setsCount?: number;
  vitals?: RoutineVitals;
  readiness?: {
    mood?: string;
    sleep?: string;
    nutrition?: string;
  };
  exercises?: {
    name: string;
    sets: { weight: number; reps: number; completed: boolean }[];
  }[];
}

export interface FloorClient {
  id: string;
  client_type?: 'floor';
  name: string;
  trainerId: string;
  timeSlot: string;
  goal: string;
  activeDay: string;
  isActiveFloor: boolean;
  assignedDays: string[];
}

export interface VipClient {
  id: string;
  client_type?: 'vip';
  name: string;
  username: string;
  password?: string;
  password_plain?: string;
  gender: string;
  trainerId: string;
  goal: string;
  activeDay: string;
  assignedDays: string[];
  lastDateRendered?: string;
  routines: Record<string, DayRoutine>;
  logs: WorkoutLog[];
}

export interface CatalogGroup {
  group: string;
  exercises: string[];
}
