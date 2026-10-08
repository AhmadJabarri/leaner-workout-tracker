/** An exercise available in the exercise catalog. */
export type Exercise = {
  id: string
  name: string
  primaryMuscleGroup: string
  equipment?: string
}

/** One exercise included in a reusable workout routine. */
export type WorkoutRoutineExercise = {
  exerciseId: Exercise['id']
}

/** A reusable plan. It describes which exercises to do, not the sets performed. */
export type WorkoutRoutine = {
  id: string
  name: string
  muscleGroups: string[]
  exercises: WorkoutRoutineExercise[]
}

/** One performed set of an exercise. */
export type WeightUnit = 'kg' | 'lb'

export type WorkoutSet = {
  reps: number
  weight: number
  weightUnit: WeightUnit
  rpe?: number
  rir?: number
}

/** An exercise and its performed sets inside one workout session. */
export type WorkoutExercise = {
  exerciseId: Exercise['id']
  sets: WorkoutSet[]
}

/** A completed workout session. `performedAt` is an ISO 8601 date-time string. */
export type WorkoutSession = {
  id: string
  performedAt: string
  routineId?: string
  exercises: WorkoutExercise[]
  notes?: string
}

/** Data React submits; the server creates the session ID and timestamp. */
export type WorkoutSubmission = {
  routineId?: string
  exercises: WorkoutExercise[]
  notes?: string
}
