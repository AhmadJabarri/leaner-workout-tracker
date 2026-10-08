import type { Exercise, WorkoutSession } from '../types/workout'

type HomePageProps = {
  workouts: WorkoutSession[]
  exercises: Exercise[]
  onStartWorkout: () => void
}

function HomePage({ workouts, exercises, onStartWorkout }: HomePageProps) {
  const latestWorkout = workouts[0]
  const latestDate = latestWorkout
    ? new Date(latestWorkout.performedAt).toLocaleDateString(undefined, {
        weekday: 'short', month: 'short', day: 'numeric',
      })
    : null

  return (
    <div className="home-page">
      <header className="home-greeting">
        <p className="eyebrow">YOUR TRAINING, AT YOUR PACE</p>
        <h1>Ready to train?</h1>
        <p>Pick a workout. Your plan will be ready when you are.</p>
      </header>

      <button className="start-workout-button" type="button" onClick={onStartWorkout}>
        <span className="start-workout-icon" aria-hidden="true">＋</span>
        <span><strong>Start today’s workout</strong><small>Choose a plan and log your sets</small></span>
        <span className="start-workout-arrow" aria-hidden="true">→</span>
      </button>

      <section className="home-section" aria-labelledby="home-recent-title">
        <div className="home-section-heading">
          <h2 id="home-recent-title">Last workout</h2>
          <span>{workouts.length ? `${workouts.length} logged` : 'No workouts yet'}</span>
        </div>
        {latestWorkout ? (
          <article className="recent-workout">
            <div className="recent-workout-date"><span className="status-dot" />{latestDate}</div>
            <strong>{latestWorkout.exercises.length} exercises</strong>
            <p>{latestWorkout.exercises.map((entry) => exercises.find((exercise) => exercise.id === entry.exerciseId)?.name ?? 'Exercise').slice(0, 3).join(' · ')}</p>
          </article>
        ) : (
          <p className="home-empty-hint">Your completed sessions will show here.</p>
        )}
      </section>
    </div>
  )
}

export default HomePage
