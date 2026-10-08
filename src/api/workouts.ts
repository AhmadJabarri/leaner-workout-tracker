import type { WorkoutSession, WorkoutSubmission } from '../types/workout'

/** Translate frontend camelCase workout data to the backend's JSON contract. */
export async function createWorkout(workout: WorkoutSubmission): Promise<WorkoutSession> {
  const response = await fetch('/api/workouts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      routine_id: workout.routineId ?? null,
      notes: workout.notes ?? null,
      exercises: workout.exercises.map((exercise) => ({
        exercise_id: exercise.exerciseId,
        sets: exercise.sets.map((set) => ({
          reps: set.reps,
          weight_kg: set.weight,
        })),
      })),
    }),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null) as { detail?: string } | null
    throw new Error(errorBody?.detail ?? `Could not save workout (${response.status}).`)
  }

  return response.json() as Promise<WorkoutSession>
}

/** Load saved history after the app starts or the page is refreshed. */
export async function fetchWorkouts(): Promise<WorkoutSession[]> {
  const response = await fetch('/api/workouts')

  if (!response.ok) {
    throw new Error(`Could not load workout history (${response.status}).`)
  }

  return response.json() as Promise<WorkoutSession[]>
}
