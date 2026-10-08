/** Data the Progress page receives from FastAPI's deterministic summary endpoint. */
export type ProgressSummary = {
  totalSessions: number
  sessionsLast7Days: number
  totalSets: number
  uniqueExercises: number
}

/** One workout's measurements for a selected exercise. */
export type ExerciseProgressPoint = {
  performedAt: string
  maxWeightKg: number
  volumeKgReps: number
  setCount: number
}

/** Historical measurements for one exercise. */
export type ExerciseProgress = {
  exerciseId: string
  exerciseName: string
  personalBestKg: number | null
  workouts: ExerciseProgressPoint[]
}

/** Request summary counts; React displays them but does not calculate them. */
export async function fetchProgressSummary(): Promise<ProgressSummary> {
  const response = await fetch('/api/progress/summary')

  if (!response.ok) {
    throw new Error(`Could not load progress summary (${response.status}).`)
  }

  return response.json() as Promise<ProgressSummary>
}

/** Request backend-calculated progression for one exercise from workout history. */
export async function fetchExerciseProgress(exerciseId: string): Promise<ExerciseProgress> {
  const response = await fetch(`/api/progress/exercises/${encodeURIComponent(exerciseId)}`)

  if (!response.ok) {
    throw new Error(`Could not load exercise progress (${response.status}).`)
  }

  return response.json() as Promise<ExerciseProgress>
}
