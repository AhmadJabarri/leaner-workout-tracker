import type { Exercise, WorkoutRoutine } from '../types/workout'

/** Fetch typed catalog data from FastAPI; these TypeScript types are compile-time checks. */
async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path)

  if (!response.ok) {
    throw new Error(`Catalog request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

export function fetchExercises(): Promise<Exercise[]> {
  return getJson<Exercise[]>('/api/catalog/exercises')
}

/** Let FastAPI assign the ID and owner, then return the saved catalog record. */
export async function createExercise(exercise: Omit<Exercise, 'id'>): Promise<Exercise> {
  const response = await fetch('/api/catalog/exercises', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: exercise.name,
      primary_muscle_group: exercise.primaryMuscleGroup,
      equipment: exercise.equipment ?? null,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null) as { detail?: string } | null
    throw new Error(errorBody?.detail ?? `Could not save exercise (${response.status}).`)
  }

  return response.json() as Promise<Exercise>
}

export function fetchWorkoutRoutines(): Promise<WorkoutRoutine[]> {
  return getJson<WorkoutRoutine[]>('/api/catalog/routines')
}
