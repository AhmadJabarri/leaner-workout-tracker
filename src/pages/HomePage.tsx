import type { Profile } from '../api/profile'
import { ChevronRightIcon, CoachIcon, DumbbellIcon, FlameIcon, PlusIcon } from '../components/Icons'
import type { Exercise, WorkoutSession } from '../types/workout'
import { exerciseName, formatVolume, relativeDay, setCount, startOfWeek, weekStreak, workoutVolume } from '../utils/format'

type HomePageProps = {
  username: string
  workouts: WorkoutSession[]
  exercises: Exercise[]
  profile: Profile | null
  onStartWorkout: () => void
  onOpenProfile: () => void
  onOpenCoach: () => void
  onOpenHistory: () => void
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function HomePage({
  username, workouts, exercises, profile, onStartWorkout, onOpenProfile, onOpenCoach, onOpenHistory,
}: HomePageProps) {
  const latestWorkout = workouts[0]
  const weekStart = startOfWeek().getTime()
  const thisWeek = workouts.filter((workout) => new Date(workout.performedAt).getTime() >= weekStart)
  const weekVolume = thisWeek.reduce((total, workout) => total + workoutVolume(workout), 0)
  const streak = weekStreak(workouts)
  const proteinTarget = profile?.effectiveProteinTargetG

  // Mon–Sun dots showing which days of this week had a workout.
  const trainedDays = new Set(thisWeek.map((workout) => (new Date(workout.performedAt).getDay() + 6) % 7))
  const todayIndex = (new Date().getDay() + 6) % 7

  return (
    <div className="stack">
      <header className="page-title">
        <p className="muted">{greeting()}{username ? `, ${username}` : ''}</p>
        <h1>Ready to train?</h1>
      </header>

      <button className="hero-action" type="button" onClick={onStartWorkout}>
        <span className="hero-action-icon"><PlusIcon size={26} /></span>
        <span className="hero-action-text">
          <strong>Start workout</strong>
          <small>Pick a routine or build your own</small>
        </span>
        <ChevronRightIcon />
      </button>

      <section className="card" aria-labelledby="week-title">
        <div className="card-heading">
          <h2 id="week-title">This week</h2>
          {streak > 0 && (
            <span className="pill pill-accent"><FlameIcon size={14} /> {streak}-week streak</span>
          )}
        </div>
        <div className="week-dots" aria-label={`${thisWeek.length} workouts this week`}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
            <span
              key={index}
              className={`week-dot${trainedDays.has(index) ? ' done' : ''}${index === todayIndex ? ' today' : ''}`}
            >
              {trainedDays.has(index) ? '✓' : day}
            </span>
          ))}
        </div>
        <div className="stat-row">
          <div className="stat"><strong>{thisWeek.length}</strong><span>workouts</span></div>
          <div className="stat"><strong>{thisWeek.reduce((total, workout) => total + setCount(workout), 0)}</strong><span>sets</span></div>
          <div className="stat"><strong>{formatVolume(weekVolume)}</strong><span>volume</span></div>
        </div>
      </section>

      <button className="card card-button" type="button" onClick={onOpenProfile}>
        <div className="card-heading">
          <h2>Daily protein</h2>
          <ChevronRightIcon size={18} />
        </div>
        {proteinTarget ? (
          <p className="big-number">{proteinTarget}<small> g / day</small></p>
        ) : (
          <p className="muted">Add your weight in Profile to get a protein target.</p>
        )}
        {proteinTarget && profile?.bodyWeightKg && (
          <p className="muted small">Based on {profile.bodyWeightKg} kg body weight</p>
        )}
      </button>

      <section className="card" aria-labelledby="last-title">
        <div className="card-heading">
          <h2 id="last-title">Last workout</h2>
          {latestWorkout && (
            <button className="link-button" type="button" onClick={onOpenHistory}>See all</button>
          )}
        </div>
        {latestWorkout ? (
          <div className="last-workout">
            <span className="icon-badge"><DumbbellIcon /></span>
            <div>
              <strong>{relativeDay(latestWorkout.performedAt)}</strong>
              <p className="muted small">
                {latestWorkout.exercises.slice(0, 3).map((entry) => exerciseName(exercises, entry.exerciseId)).join(' · ')}
                {latestWorkout.exercises.length > 3 && ` +${latestWorkout.exercises.length - 3}`}
              </p>
            </div>
            <span className="muted small nowrap">{setCount(latestWorkout)} sets</span>
          </div>
        ) : (
          <p className="muted">Your first workout will show up here.</p>
        )}
      </section>

      <button className="card card-button coach-teaser" type="button" onClick={onOpenCoach}>
        <span className="icon-badge icon-badge-accent"><CoachIcon /></span>
        <span>
          <strong>Ask your coach</strong>
          <small className="muted">Advice on training, progress, and protein</small>
        </span>
        <ChevronRightIcon size={18} />
      </button>
    </div>
  )
}

export default HomePage
