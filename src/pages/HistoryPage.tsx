import { DumbbellIcon } from '../components/Icons'
import type { Exercise, WorkoutRoutine, WorkoutSession } from '../types/workout'
import { exerciseName, formatDay, formatTime, formatVolume, setCount, workoutVolume } from '../utils/format'

type HistoryPageProps = {
  workouts: WorkoutSession[]
  exercises: Exercise[]
  routines: WorkoutRoutine[]
  onStartWorkout: () => void
}

function monthLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

function HistoryPage({ workouts, exercises, routines, onStartWorkout }: HistoryPageProps) {
  if (workouts.length === 0) {
    return (
      <div className="stack">
        <header className="page-title"><h1>History</h1></header>
        <section className="empty-state">
          <span className="icon-badge icon-badge-lg"><DumbbellIcon size={28} /></span>
          <h2>No workouts yet</h2>
          <p className="muted">Finish a workout and it will appear here with every set.</p>
          <button className="button button-primary" type="button" onClick={onStartWorkout}>Start a workout</button>
        </section>
      </div>
    )
  }

  // Workouts arrive newest first; group them under month headings.
  const groups: { month: string; items: WorkoutSession[] }[] = []
  for (const workout of workouts) {
    const month = monthLabel(workout.performedAt)
    const group = groups.at(-1)
    if (group?.month === month) group.items.push(workout)
    else groups.push({ month, items: [workout] })
  }

  return (
    <div className="stack">
      <header className="page-title">
        <h1>History</h1>
        <p className="muted">{workouts.length} {workouts.length === 1 ? 'workout' : 'workouts'} logged</p>
      </header>

      {groups.map((group) => (
        <section className="stack-sm" key={group.month} aria-label={group.month}>
          <h2 className="section-label">{group.month}</h2>
          {group.items.map((workout) => {
            const routineName = routines.find((routine) => routine.id === workout.routineId)?.name ?? 'Workout'
            return (
              <details className="card history-card" key={workout.id}>
                <summary>
                  <div className="history-card-top">
                    <div>
                      <strong>{routineName}</strong>
                      <p className="muted small">{formatDay(workout.performedAt)} · {formatTime(workout.performedAt)}</p>
                    </div>
                    <span className="history-chevron" aria-hidden="true" />
                  </div>
                  <div className="history-meta">
                    <span>{workout.exercises.length} {workout.exercises.length === 1 ? 'exercise' : 'exercises'}</span>
                    <span>{setCount(workout)} sets</span>
                    <span>{formatVolume(workoutVolume(workout))}</span>
                  </div>
                </summary>

                <div className="history-detail">
                  {workout.notes && <p className="history-note">“{workout.notes}”</p>}
                  {workout.exercises.map((entry, index) => (
                    <div className="history-exercise" key={`${workout.id}-${index}`}>
                      <strong>{exerciseName(exercises, entry.exerciseId)}</strong>
                      <ol className="history-sets">
                        {entry.sets.map((set, setIndex) => (
                          <li key={setIndex}>
                            <span className="muted">{setIndex + 1}</span>
                            {set.weight} kg × {set.reps}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              </details>
            )
          })}
        </section>
      ))}
    </div>
  )
}

export default HistoryPage
