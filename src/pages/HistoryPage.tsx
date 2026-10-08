import type { Exercise, WorkoutSession } from '../types/workout'

type HistoryPageProps = {
  workouts: WorkoutSession[]
  exercises: Exercise[]
}

function HistoryPage({ workouts, exercises }: HistoryPageProps) {
  const totalSessions = workouts.length
  const totalExercises = workouts.reduce((total, workout) => total + workout.exercises.length, 0)

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">YOUR TRAINING RECORD</p>
          <h1>History</h1>
          <p className="page-intro">Your completed sessions, in one place.</p>
        </div>
        {totalSessions > 0 && (
          <div className="history-summary">
            <span>{totalSessions} {totalSessions === 1 ? 'session' : 'sessions'}</span>
            <span>{totalExercises} {totalExercises === 1 ? 'exercise' : 'exercise entries'}</span>
          </div>
        )}
      </header>

      {workouts.length === 0 ? (
        <section className="empty-state" aria-labelledby="history-empty-title">
          <div className="empty-icon" aria-hidden="true">
            <span className="empty-bar bar-short" />
            <span className="empty-bar bar-long" />
            <span className="empty-bar bar-short" />
          </div>
          <h2 id="history-empty-title">No sessions yet</h2>
          <p>After you save a workout, it will appear here with each exercise and its sets.</p>
        </section>
      ) : (
        <section className="history-list" aria-label="Workout history">
          {workouts.map((workout) => {
            const setCount = workout.exercises.reduce((total, exercise) => total + exercise.sets.length, 0)

            return (
              <article className="workout-card" key={workout.id}>
                <header className="workout-card-heading">
                  <div>
                    <h2>{new Date(workout.performedAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}</h2>
                    <p>{new Date(workout.performedAt).toLocaleTimeString(undefined, {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}</p>
                  </div>
                  <span className="workout-set-count">
                    {workout.exercises.length} {workout.exercises.length === 1 ? 'exercise' : 'exercises'} · {setCount} sets
                  </span>
                </header>

                {workout.notes && <p className="history-workout-note">“{workout.notes}”</p>}

                <div className="workout-card-exercises">
                  {workout.exercises.map((entry, exerciseIndex) => {
                    const exercise = exercises.find((item) => item.id === entry.exerciseId)

                    return (
                      <section
                        className="workout-card-exercise"
                        key={workout.id + '-' + exerciseIndex}
                        aria-label={exercise?.name ?? 'Exercise'}
                      >
                        <div className="history-exercise-heading">
                          <h3>{exercise?.name ?? 'Exercise'}</h3>
                          <span>{exercise?.primaryMuscleGroup}</span>
                        </div>
                        <div className="history-set-list">
                          {entry.sets.map((set, setIndex) => (
                            <div className="history-set-row" key={workout.id + '-' + exerciseIndex + '-' + setIndex}>
                              <span className="history-set-number">Set {setIndex + 1}</span>
                              <span>{set.reps} reps</span>
                              <span>{set.weight} {set.weightUnit}</span>
                              {(set.rpe !== undefined || set.rir !== undefined) && (
                                <span className="history-effort">
                                  {set.rpe !== undefined && 'RPE ' + set.rpe}
                                  {set.rpe !== undefined && set.rir !== undefined && ' · '}
                                  {set.rir !== undefined && 'RIR ' + set.rir}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </section>
                    )
                  })}
                </div>
              </article>
            )
          })}
        </section>
      )}
    </>
  )
}

export default HistoryPage
