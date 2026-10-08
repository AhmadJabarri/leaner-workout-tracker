// Displays server-calculated progress counts; this page does not derive metrics.
import { useEffect, useRef, useState } from 'react'
import {
  fetchExerciseProgress,
  fetchProgressSummary,
  type ExerciseProgress,
  type ProgressSummary,
} from '../api/progress'
import type { Exercise } from '../types/workout'
import ExerciseProgressChart from '../components/ExerciseProgressChart'

type ProgressPageProps = {
  exercises: Exercise[]
}

function ProgressPage({ exercises }: ProgressPageProps) {
  const [summary, setSummary] = useState<ProgressSummary | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [retry, setRetry] = useState(0)
  const [selectedExerciseId, setSelectedExerciseId] = useState('')
  const [exerciseProgress, setExerciseProgress] = useState<ExerciseProgress | null>(null)
  const [exerciseStatus, setExerciseStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const exerciseRequestNumber = useRef(0)

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

  return (
    <div className="progress-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">YOUR TRAINING OVER TIME</p>
          <h1>Progress</h1>
          <p className="page-intro">Useful signals from the work you put in.</p>
        </div>
      </header>

      {status === 'loading' && <p role="status">Loading progress summary…</p>}
      {status === 'error' && (
        <div role="alert">
          <p>Could not load progress. Check that the backend and database are running.</p>
          <button className="secondary-button" type="button" onClick={() => setRetry((attempt) => attempt + 1)}>
            Try again
          </button>
        </div>
      )}
      {status === 'ready' && summary && (
        <>
          {summary.totalSessions === 0 ? (
            <section className="progress-empty">
              <span className="progress-empty-mark" aria-hidden="true">↗</span>
              <h2>Your progress starts with a workout</h2>
              <p>Log a few sessions to see your exercise history and training trends here.</p>
            </section>
          ) : (
            <section className="progress-stats" aria-label="Training summary">
              <article><span>Last 7 days</span><strong>{summary.sessionsLast7Days}</strong><small>sessions</small></article>
              <article><span>Logged work</span><strong>{summary.totalSets}</strong><small>sets</small></article>
              <article><span>Exercises</span><strong>{summary.uniqueExercises}</strong><small>tracked</small></article>
            </section>
          )}

          <section className="progress-note" aria-labelledby="exercise-progress-title">
            <h2 id="exercise-progress-title">Exercise progression</h2>
            <label className="field-label" htmlFor="progress-exercise-select">Choose an exercise</label>
            <select
              id="progress-exercise-select"
              className="form-control"
              value={selectedExerciseId}
              onChange={(event) => void loadExerciseProgress(event.target.value)}
            >
              <option value="">Select an exercise</option>
              {exercises.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>{exercise.name}</option>
              ))}
            </select>

            {exerciseStatus === 'idle' && <p>Select an exercise to view its saved workout history.</p>}
            {exerciseStatus === 'loading' && <p role="status">Loading exercise history…</p>}
            {exerciseStatus === 'error' && (
              <div role="alert">
                <p>Could not load this exercise’s progress.</p>
                <button className="secondary-button" type="button" onClick={() => void loadExerciseProgress(selectedExerciseId)}>
                  Try again
                </button>
              </div>
            )}
            {exerciseStatus === 'ready' && exerciseProgress && (
              exerciseProgress.workouts.length === 0 ? (
                <p>No saved workouts include {exerciseProgress.exerciseName} yet.</p>
              ) : (
                <>
                  <p>Personal best weight: <strong>{exerciseProgress.personalBestKg} kg</strong></p>
                  <ExerciseProgressChart exerciseName={exerciseProgress.exerciseName} points={exerciseProgress.workouts} />
                  <div className="history-list" aria-label={exerciseProgress.exerciseName + ' progression history'}>
                    {exerciseProgress.workouts.map((workout, index) => (
                      <article className="workout-card" key={exerciseProgress.exerciseId + '-' + index}>
                        <header className="workout-card-heading">
                          <h3>{new Date(workout.performedAt).toLocaleDateString(undefined, {
                            year: 'numeric', month: 'short', day: 'numeric',
                          })}</h3>
                          <span className="workout-set-count">{workout.setCount} sets</span>
                        </header>
                        <p>Heaviest set: <strong>{workout.maxWeightKg} kg</strong></p>
                        <p>Volume: <strong>{workout.volumeKgReps} kg × reps</strong></p>
                      </article>
                    ))}
                  </div>
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
