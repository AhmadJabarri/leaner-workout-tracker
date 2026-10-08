import type { WorkoutRoutine } from '../types/workout'

// Starter routines use exercises already present in the exercise catalog.
export const workoutRoutines: WorkoutRoutine[] = [
  {
    id: 'chest-triceps',
    name: 'Chest + Triceps',
    muscleGroups: ['Chest', 'Triceps'],
    exercises: [
      { exerciseId: 'dumbbell-bench-press' },
      { exerciseId: 'incline-dumbbell-bench-press' },
      { exerciseId: 'dumbbell-chest-fly' },
      { exerciseId: 'dumbbell-dips' },
      { exerciseId: 'dumbbell-skull-crushers' },
      { exerciseId: 'dumbbell-triceps-pushdown' },
    ],
  },
  {
    id: 'back-biceps',
    name: 'Back + Biceps',
    muscleGroups: ['Back', 'Biceps'],
    exercises: [
      { exerciseId: 'dumbbell-bent-over-row' },
      { exerciseId: 'chest-supported-dumbbell-row' },
      { exerciseId: 'one-arm-dumbbell-row' },
      { exerciseId: 'dumbbell-pullover' },
      { exerciseId: 'dumbbell-reverse-fly' },
      { exerciseId: 'dumbbell-hammer-curl' },
      { exerciseId: 'dumbbell-biceps-curl' },
      { exerciseId: 'seated-incline-dumbbell-curl' },
    ],
  },
  {
    id: 'shoulders-legs',
    name: 'Shoulders + Legs',
    muscleGroups: ['Shoulders', 'Legs'],
    exercises: [
      { exerciseId: 'dumbbell-shoulder-press' },
      { exerciseId: 'dumbbell-lateral-raise' },
      { exerciseId: 'dumbbell-rear-delt-fly' },
      { exerciseId: 'squat' },
      { exerciseId: 'hip-thrust' },
      { exerciseId: 'bulgarian-split-squat' },
    ],
  },
]
