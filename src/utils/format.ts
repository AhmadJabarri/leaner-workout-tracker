// Shared date and workout helpers used by several pages.
import type { Exercise, WorkoutSession } from '../types/workout'

export function exerciseName(exercises: Exercise[], id: string): string {
  return exercises.find((exercise) => exercise.id === id)?.name ?? 'Exercise'
}

export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

/** "Today", "Yesterday", "3 days ago", or a date for anything older than a week. */
export function relativeDay(iso: string): string {
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const days = Math.round((startOfDay(new Date()) - startOfDay(new Date(iso))) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return formatDay(iso)
}

export function setCount(workout: WorkoutSession): number {
  return workout.exercises.reduce((total, exercise) => total + exercise.sets.length, 0)
}

/** Total kg moved (weight × reps) in one workout. */
export function workoutVolume(workout: WorkoutSession): number {
  return workout.exercises.reduce(
    (total, exercise) => total + exercise.sets.reduce((sum, set) => sum + set.weight * set.reps, 0),
    0,
  )
}

/** Monday 00:00 of the current week, in local time. */
export function startOfWeek(date = new Date()): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  return start
}

/** Consecutive weeks (including this one, if trained) with at least one workout. */
export function weekStreak(workouts: WorkoutSession[]): number {
  const weekKeys = new Set(workouts.map((workout) => startOfWeek(new Date(workout.performedAt)).getTime()))
  const cursor = startOfWeek()
  // A streak isn't broken just because this week hasn't had a workout yet.
  if (!weekKeys.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 7)
  let streak = 0
  while (weekKeys.has(cursor.getTime())) {
    streak += 1
    cursor.setDate(cursor.getDate() - 7)
  }
  return streak
}

export function formatKg(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(1)} kg`
}

export function formatVolume(kg: number): string {
  return kg >= 1000 ? `${(kg / 1000).toFixed(1)} t` : `${Math.round(kg)} kg`
}
