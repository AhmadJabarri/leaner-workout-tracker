import type { Exercise } from '../types/workout'

// Temporary frontend catalog. A later step will load exercises from the API.
export const exercises: Exercise[] = [
  { id: 'dumbbell-bench-press', name: 'Dumbbell Bench Press', primaryMuscleGroup: 'Chest', equipment: 'Dumbbell' },
  { id: 'incline-dumbbell-bench-press', name: 'Incline Dumbbell Bench Press', primaryMuscleGroup: 'Chest', equipment: 'Dumbbell' },
  { id: 'dumbbell-chest-fly', name: 'Dumbbell Chest Fly', primaryMuscleGroup: 'Chest', equipment: 'Dumbbell' },
  { id: 'dumbbell-dips', name: 'Dumbbell Dips', primaryMuscleGroup: 'Chest', equipment: 'Dumbbell' },
  { id: 'dumbbell-skull-crushers', name: 'Dumbbell Skull Crushers', primaryMuscleGroup: 'Triceps', equipment: 'Dumbbell' },
  { id: 'dumbbell-triceps-pushdown', name: 'Dumbbell Triceps Pushdown', primaryMuscleGroup: 'Triceps', equipment: 'Dumbbell' },
  { id: 'dumbbell-bent-over-row', name: 'Dumbbell Bent-Over Row', primaryMuscleGroup: 'Back', equipment: 'Dumbbell' },
  { id: 'chest-supported-dumbbell-row', name: 'Chest-Supported Dumbbell Row', primaryMuscleGroup: 'Back', equipment: 'Dumbbell' },
  { id: 'one-arm-dumbbell-row', name: 'One-Arm Dumbbell Row', primaryMuscleGroup: 'Back', equipment: 'Dumbbell' },
  { id: 'dumbbell-pullover', name: 'Dumbbell Pullover', primaryMuscleGroup: 'Back', equipment: 'Dumbbell' },
  { id: 'dumbbell-reverse-fly', name: 'Dumbbell Reverse Fly', primaryMuscleGroup: 'Back', equipment: 'Dumbbell' },
  { id: 'dumbbell-hammer-curl', name: 'Dumbbell Hammer Curl', primaryMuscleGroup: 'Biceps', equipment: 'Dumbbell' },
  { id: 'dumbbell-biceps-curl', name: 'Dumbbell Biceps Curl', primaryMuscleGroup: 'Biceps', equipment: 'Dumbbell' },
  { id: 'seated-incline-dumbbell-curl', name: 'Seated Incline Dumbbell Curl', primaryMuscleGroup: 'Biceps', equipment: 'Dumbbell' },
  { id: 'dumbbell-shoulder-press', name: 'Dumbbell Shoulder Press', primaryMuscleGroup: 'Shoulders', equipment: 'Dumbbell' },
  { id: 'dumbbell-lateral-raise', name: 'Dumbbell Lateral Raise', primaryMuscleGroup: 'Shoulders', equipment: 'Dumbbell' },
  { id: 'dumbbell-rear-delt-fly', name: 'Dumbbell Rear Delt Fly', primaryMuscleGroup: 'Shoulders', equipment: 'Dumbbell' },
  { id: 'squat', name: 'Squat', primaryMuscleGroup: 'Legs' },
  { id: 'hip-thrust', name: 'Hip Thrust', primaryMuscleGroup: 'Legs' },
  { id: 'bulgarian-split-squat', name: 'Bulgarian Split Squat', primaryMuscleGroup: 'Legs' },
]
