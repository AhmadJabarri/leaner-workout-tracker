// Displays server-calculated progress; this page does not derive the metrics itself.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchExerciseProgress,
  fetchProgressSummary,
  type ExerciseProgress,
  type ProgressSummary,
} from '../api/progress'
import ExerciseProgressChart from '../components/ExerciseProgressChart'
import { ProgressIcon } from '../components/Icons'
import type { Exercise, WorkoutSession } from '../types/workout'
import { formatDay, formatKg, formatVolume } from '../utils/format'

type ProgressPageProps = {
  exercises: Exercise[]
  workouts: WorkoutSession[]
}

function ProgressPage({ exercises, workouts }: ProgressPageProps) {
  const [summary, setSummary] = useState<ProgressSummary | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [retry, setRetry] = useState(0)
  const [selectedExerciseId, setSelectedExerciseId] = useState('')
  const [exerciseProgress, setExerciseProgress] = useState<ExerciseProgress | null>(null)
  const [exerciseStatus, setExerciseStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const exerciseRequestNumber = useRef(0)

  // Exercises you've actually logged, most-trained first, become quick-pick chips.
  const trainedExercises = useMemo(() => {
    const counts = new Map<string, number>()
    for (const workout of workouts) {
      for (const entry of workout.exercises) counts.set(entry.exerciseId, (counts.get(entry.exerciseId) ?? 0) + 1)
    }
    return exercises
      .filter((exercise) => counts.has(exercise.id))
      .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0))
  }, [exercises, workouts])

  useEffect(() => {
    let ignoreResult = false
    async function loadSummary() {
      setStatus('loading')
      try {
        const result = await fetchProgressSummary()
        if (ignoreResult) return
        setSummary(result)
        setStatus('ready')
      } catch {
        if (!ignoreResult) setStatus('error')
      }
    }
    void loadSummary()
    return () => {
      ignoreResult = true
    }
  }, [retry])

  async function loadExerciseProgress(exerciseId: string) {
    const requestNumber = ++exerciseRequestNumber.current
    setSelectedExerciseId(exerciseId)
    setExerciseProgress(null)
    if (!exerciseId) {
      setExerciseStatus('idle')
      return
    }
    setExerciseStatus('loading')
    try {
      const result = await fetchExerciseProgress(exerciseId)
      if (requestNumber !== exerciseRequestNumber.current) return
      setExerciseProgress(result)
      setExerciseStatus('ready')
    } catch {
      if (requestNumber === exerciseRequestNumber.current) setExerciseStatus('error')
    }
  }

  // Open the most-trained exercise automatically the first time there's data.
  const autoSelected = useRef(false)
  useEffect(() => {
    if (autoSelected.current || !trainedExercises[0]) return
    autoSelected.current = true
    void loadExerciseProgress(trainedExercises[0].id)
  }, [trainedExercises])

  const recentPoints = exerciseProgress?.workouts.slice(-5).reverse() ?? []

  return (
    <div className="stack">
      <header className="page-title"><h1>Progress</h1></header>

      {status === 'loading' && <p className="muted" role="status">Loading progress…</p>}
      {status === 'error' && (
        <div className="alert alert-error" role="alert">
          <p>Could not load progress.</p>
          <button className="button button-secondary" type="button" onClick={() => setRetry((attempt) => attempt + 1)}>Try again</button>
        </div>
      )}

      {status === 'ready' && summary && summary.totalSessions === 0 && (
        <section className="empty-state">
          <span className="icon-badge icon-badge-lg"><ProgressIcon size={28} /></span>
          <h2>Progress starts with a workout</h2>
          <p className="muted">Log a few sessions to see your strength trends here.</p>
        </section>
      )}

      {status === 'ready' && summary && summary.totalSessions > 0 && (
        <>
          <section className="stat-grid" aria-label="Training summary">
            <div className="card stat"><strong>{summary.totalSessions}</strong><span>workouts</span></div>
            <div className="card stat"><strong>{summary.sessionsLast7Days}</strong><span>last 7 days</span></div>
            <div className="card stat"><strong>{summary.totalSets}</strong><span>total sets</span></div>
            <div className="card stat"><strong>{summary.uniqueExercises}</strong><span>exercises</span></div>
          </section>

          <section className="card stack-sm" aria-labelledby="exercise-progress-title">
            <h2 id="exercise-progress-title">Exercise progress</h2>

            {trainedExercises.length > 0 && (
              <div className="chip-row" role="list">
                {trainedExercises.slice(0, 8).map((exercise) => (
                  <button
                    role="listitem"
                    key={exercise.id}
                    type="button"
                    className={`chip${selectedExerciseId === exercise.id ? ' active' : ''}`}
                    onClick={() => void loadExerciseProgress(exercise.id)}
                  >
                    {exercise.name}
                  </button>
                ))}
              </div>
            )}

            <select
              className="input"
              aria-label="Choose any exercise"
              value={selectedExerciseId}
              onChange={(event) => void loadExerciseProgress(event.target.value)}
            >
              <option value="">All exercises…</option>
              {exercises.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>{exercise.name}</option>
              ))}
            </select>

            {exerciseStatus === 'loading' && <p className="muted" role="status">Loading…</p>}
            {exerciseStatus === 'error' && (
              <div className="alert alert-error" role="alert">
                <p>Could not load this exercise.</p>
                <button className="button button-secondary" type="button" onClick={() => void loadExerciseProgress(selectedExerciseId)}>Try again</button>
              </div>
            )}
            {exerciseStatus === 'ready' && exerciseProgress && (
              exerciseProgress.workouts.length === 0 ? (
                <p className="muted">No workouts include {exerciseProgress.exerciseName} yet.</p>
              ) : (
                <>
                  <div className="pr-banner">
                    <span className="muted small">Personal best</span>
                    <strong>{formatKg(exerciseProgress.personalBestKg ?? 0)}</strong>
                  </div>
                  <ExerciseProgressChart exerciseName={exerciseProgress.exerciseName} points={exerciseProgress.workouts} />
                  <h3 className="section-label">Recent sessions</h3>
                  <ul className="plain-list">
                    {recentPoints.map((point, index) => (
                      <li key={`${point.performedAt}-${index}`} className="list-row">
                        <span>{formatDay(point.performedAt)}</span>
                        <span className="muted small">{point.setCount} sets · {formatVolume(point.volumeKgReps)}</span>
                        <strong>{formatKg(point.maxWeightKg)}</strong>
                      </li>
                    ))}
                  </ul>
                </>
              )
            )}
          </section>
        </>
      )}
    </div>
  )
}

export default ProgressPage
