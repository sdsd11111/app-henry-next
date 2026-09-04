import { CatalogGroup } from './types';

export const TIME_SLOTS = [
  { id: "slot1", label: "07:00 - 08:00 AM", period: "Mañana" },
  { id: "slot2", label: "08:00 - 09:00 AM", period: "Mañana" },
  { id: "slot3", label: "09:00 - 10:00 AM", period: "Mañana" },
  { id: "slot4", label: "10:00 - 11:00 AM", period: "Mañana" },
  { id: "slot5", label: "11:00 - 12:00 PM", period: "Mañana" },
  { id: "slot6", label: "03:00 - 04:00 PM", period: "Tarde" },
  { id: "slot7", label: "04:00 - 05:00 PM", period: "Tarde" },
  { id: "slot8", label: "05:00 - 06:00 PM", period: "Tarde" },
  { id: "slot9", label: "06:00 - 07:00 PM", period: "Tarde" },
  { id: "slot10", label: "07:00 - 08:00 PM", period: "Noche" },
  { id: "slot11", label: "08:00 - 09:00 PM", period: "Noche" }
];

export const PATRONES_PRINCIPALES = [
  "Dominante de rodilla",
  "Bisagra de cadera",
  "Empuje horizontal",
  "Empuje vertical",
  "Tracción horizontal",
  "Tracción vertical"
];

export const PATRONES_ACCESORIOS = [
  "Accesorios de hombros",
  "Accesorios de cuádriceps",
  "Accesorios de femorales",
  "Accesorios de glúteos",
  "Accesorios de bíceps",
  "Accesorios de tríceps",
  "Accesorio de abdominal",
  "Accesorio de gemelos"
];

export const DEFAULT_CATALOG_GROUPS: CatalogGroup[] = [
  {
    group: "1. Dominante de Rodilla (Patrón de Sentadilla)",
    exercises: [
      "Sentadilla con asistencia (sosteniéndose de una estructura o banda)",
      "Sentadilla a un banco/silla (Box Squat con peso corporal)",
      "Sentadilla libre con peso corporal (Air Squat)",
      "Sentadilla isométrica en pared (Wall Sit)",
      "Sentadilla copa (Goblet Squat)",
      "Sentadilla con dos mancuernas sobre hombros (Double Dumbbell Front Squat)",
      "Sentadilla en máquina Smith",
      "Sentadilla trasera con barra (Barbell Back Squat - barra alta/baja)",
      "Sentadilla con Barra (Back Squat)",
      "Sentadilla frontal con barra (Barbell Front Squat)",
      "Sentadilla en máquina Hack (Hack Squat)",
      "Sentadilla en Bell Squat (cinturón)",
      "Prensa de piernas 45° (Leg Press)",
      "Prensa 45° Guiada",
      "Extensiones de Cuádriceps"
    ]
  },
  {
    group: "2. Bisagra de Cadera (Patrón de Peso Muerto y Extensión)",
    exercises: [
      "Puente de glúteo en piso (Glute Bridge)",
      "Bisagra de cadera con manos en pared (Wall Hinge)",
      "Buenos días con peso corporal o banda de resistencia",
      "Hip Thrust o puente de glúteo apalancado en banco (con peso corporal o mancuerna)",
      "Hip Thrust con Barra",
      "Hip Thrust en máquina específica",
      "Peso muerto rumano con mancuernas (DB Romanian Deadlift)",
      "Peso muerto rumano unilateral (Single-Leg DB Deadlift)",
      "Peso Muerto Rumano",
      "Peso muerto rumano con barra (Barbell RDL)",
      "Kettlebell Swing",
      "Extensión de cadera en banco a 45° / 90° (con disco)",
      "Peso muerto con barra hexagonal (Trap Bar Deadlift)",
      "Peso muerto convencional / Sumo con barra",
      "Pull-through en polea baja",
      "Curl femoral en máquina (sentado o tumbado)",
      "Curl Femoral Tumbado"
    ]
  },
  {
    group: "3. Empuje Horizontal (Pecho y Tríceps)",
    exercises: [
      "Flexiones de pecho (Push-ups) inclinadas (manos elevadas en pared o banco)",
      "Flexiones de pecho estándar en suelo",
      "Flexiones declinadas (pies elevados)",
      "Press plano / inclinado con mancuernas",
      "Aperturas (Flyes) con mancuernas en banco",
      "Press de banca plano con barra (Barbell Bench Press)",
      "Press de banca inclinado con barra",
      "Press de Banca Inclinado",
      "Press de pecho en máquina Smith",
      "Press de pecho en máquina convergente (tipo Hammer Strength)",
      "Cruces de poleas (Crossover) de pie o sentado"
    ]
  },
  {
    group: "4. Tracción Horizontal (Remos y Espalda Media)",
    exercises: [
      "Remo invertido (Inverted Row) ajustando la inclinación del cuerpo",
      "Remo en anillas o TRX",
      "Remo con mancuerna apoyado en banco (unilateral)",
      "Remo con Mancuerna",
      "Remo bilateral con mancuernas inclinado (Bent-Over DB Row)",
      "Remo apoyado en banco inclinado (Pecho apoyado / Seal Row con mancuernas)",
      "Remo con barra tronco inclinado (Bent-Over Barbell Row)",
      "Remo T (T-Bar Row)",
      "Remo sentado en polea baja con agarre neutro o ancho",
      "Remo horizontal en máquina guiada (con apoyo de pecho)"
    ]
  },
  {
    group: "5. Empuje Vertical (Hombros por encima de la cabeza)",
    exercises: [
      "Press en posición de Pike (Pike Push-up)",
      "Flexiones en pino/vertical asistidas en pared (Handstand Push-ups)",
      "Press militar de pie o sentado con mancuernas",
      "Press Militar con Mancuernas",
      "Press Arnold con mancuernas",
      "Press militar de pie con barra (Overhead Press)",
      "Press militar sentado con barra en banco",
      "Press de hombros en máquina articulada / Smith",
      "Elevaciones laterales en polea baja (variante para deltoides lateral)",
      "Elevaciones Laterales"
    ]
  },
  {
    group: "6. Tracción Vertical (Dorsal Ancho y Dominadas)",
    exercises: [
      "Dominadas asistidas con banda elástica",
      "Dominadas pronadas (Pull-ups)",
      "Dominadas supinadas (Chin-ups)",
      "Jalón al pecho en polea alta con agarre neutro / ancho / estrecho (Lat Pulldown)",
      "Jalón al Pecho Agarre Neutro",
      "Jalón unilateral en polea alta",
      "Dominadas en máquina con asistencia de peso (Assisted Pull-up Machine)"
    ]
  },
  {
    group: "7. Zancadas y Trabajo Unilateral / Dinámico",
    exercises: [
      "Subidas a banco (Step-ups) sin peso",
      "Zancada estática / Sentadilla split (Split Squat)",
      "Zancadas caminando (Walking Lunges)",
      "Zancada inversa (Reverse Lunge)",
      "Sentadilla búlgara (Bulgarian Split Squat) con peso corporal o mancuernas",
      "Zancadas con mancuernas (frontales, inversas o caminando)",
      "Step-ups con mancuernas o kettlebells",
      "Sentadilla búlgara en máquina Smith",
      "Zancadas en máquina Smith o con barra sobre hombros",
      "Prensa unilateral"
    ]
  },
  {
    group: "8. Zona Media y Anti-Movimiento (Core)",
    exercises: [
      "Plancha frontal (Plank)",
      "Plancha lateral (Side Plank)",
      "Deadbug / Bird-Dog",
      "Elevaciones de piernas en suelo",
      "Pallof Press con banda o en polea (Anti-rotación)",
      "Paseo del granjero / Farmer’s Carry unilateral o bilateral con mancuernas",
      "Rueda de abdominales (Ab Wheel Rollout)",
      "Elevación de rodillas / piernas colgado en barra o silla romana",
      "Crunch abdominal en polea alta con cuerda"
    ]
  },
  {
    group: "9. Aislamiento y Accesorios (Brazos)",
    exercises: [
      "Curl de Biceps con Barra",
      "Triceps Polea Alta con Cuerda"
    ]
  }
];

export const DEFAULT_CATALOG: string[] = DEFAULT_CATALOG_GROUPS.flatMap(g => g.exercises);
export const CATALOG_FLAT: string[] = DEFAULT_CATALOG;
