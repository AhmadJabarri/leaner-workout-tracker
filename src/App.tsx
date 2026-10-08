import { useEffect, useState } from 'react'
import './App.css'
import { fetchCurrentUser, signOut, type UserAccount } from './api/auth'
import { createExercise, fetchExercises, fetchWorkoutRoutines } from './api/catalog'
import { createWorkout, fetchWorkouts } from './api/workouts'
import AuthPage from './pages/AuthPage'
import CoachPage from './pages/CoachPage'
import HomePage from './pages/HomePage'
import HistoryPage from './pages/HistoryPage'
import ProgressPage from './pages/ProgressPage'
import WorkoutPage from './pages/WorkoutPage'
import type { Exercise, WorkoutRoutine, WorkoutSession, WorkoutSubmission } from './types/workout'

type Page = 'home' | 'workout' | 'history' | 'progress' | 'coach'

const navigationItems: { id: Page; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'history', label: 'History' },
  { id: 'progress', label: 'Progress' },
  { id: 'coach', label: 'Coach' },
]

function App() {
  // App checks the server session before loading any private workout data.
  const [authStatus, setAuthStatus] = useState<'checking' | 'signed-in' | 'signed-out' | 'error'>('checking')
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null)
  const [authRetry, setAuthRetry] = useState(0)
  const [accountError, setAccountError] = useState('')

  // App owns shared catalog and persisted workout history for the visible pages.
  const [activePage, setActivePage] = useState<Page>('home')
  const [exerciseCatalog, setExerciseCatalog] = useState<Exercise[]>([])
  const [workoutRoutines, setWorkoutRoutines] = useState<WorkoutRoutine[]>([])
  const [catalogStatus, setCatalogStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [catalogRetry, setCatalogRetry] = useState(0)
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([])
  const [historyStatus, setHistoryStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [historyRetry, setHistoryRetry] = useState(0)

  useEffect(() => {
    let ignoreResult = false

    async function restoreSession() {
      setAuthStatus('checking')
      try {
        const user = await fetchCurrentUser()
        if (ignoreResult) return
        setCurrentUser(user)
        setAuthStatus(user ? 'signed-in' : 'signed-out')
      } catch {
        if (!ignoreResult) setAuthStatus('error')
      }
    }

    void restoreSession()
    return () => {
      ignoreResult = true
    }
  }, [authRetry])

  useEffect(() => {
    if (authStatus !== 'signed-in') return
    let ignoreResult = false

    async function loadCatalog() {
      setCatalogStatus('loading')

      try {
        const [exercises, routines] = await Promise.all([
          fetchExercises(),
          fetchWorkoutRoutines(),
        ])

        if (ignoreResult) return

        setExerciseCatalog(exercises)
        setWorkoutRoutines(routines)
        setCatalogStatus('ready')
      } catch {
        if (!ignoreResult) setCatalogStatus('error')
      }
    }

    void loadCatalog()

    // Ignore a late response if React unmounts this component during the request.
    return () => {
      ignoreResult = true
    }
  }, [authStatus, catalogRetry])

  useEffect(() => {
    if (authStatus !== 'signed-in') return
    let ignoreResult = false

    async function loadHistory() {
      setHistoryStatus('loading')
      try {
        const savedWorkouts = await fetchWorkouts()
        if (ignoreResult) return
        setWorkouts(savedWorkouts)
        setHistoryStatus('ready')
      } catch {
        if (!ignoreResult) setHistoryStatus('error')
      }
    }

    void loadHistory()
    return () => {
      ignoreResult = true
    }
  }, [authStatus, historyRetry])

  function handleAuthenticated(user: UserAccount) {
    setCurrentUser(user)
    setAccountError('')
    setAuthStatus('signed-in')
  }

  async function handleSignOut() {
    setAccountError('')
    try {
      await signOut()
      setCurrentUser(null)
      setExerciseCatalog([])
      setWorkoutRoutines([])
      setWorkouts([])
      setAuthStatus('signed-out')
      setActivePage('home')
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : 'Could not sign out. Try again.')
    }
  }

  async function handleWorkoutSaved(workout: WorkoutSubmission) {
    const savedWorkout = await createWorkout(workout)
    setWorkouts((currentWorkouts) => [savedWorkout, ...currentWorkouts])
    setHistoryStatus('ready')
    setActivePage('history')
  }

  async function handleExerciseCreated(exercise: Omit<Exercise, 'id'>): Promise<Exercise> {
    const savedExercise = await createExercise(exercise)
    setExerciseCatalog((currentExercises) => [...currentExercises, savedExercise])
    return savedExercise
  }

  if (authStatus === 'checking') {
    return <main className="auth-screen"><p role="status">Checking your session…</p></main>
  }

  if (authStatus === 'error') {
    return (
      <main className="auth-screen">
        <section className="auth-panel" role="alert">
          <h1>Can’t reach Leaner</h1>
          <p className="auth-intro">Check that the backend and database are running, then try again.</p>
          <button className="primary-button auth-submit" type="button" onClick={() => setAuthRetry((retry) => retry + 1)}>
            Try again
          </button>
        </section>
      </main>
    )
  }

  if (authStatus === 'signed-out') {
    return <AuthPage onAuthenticated={handleAuthenticated} />
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#home" onClick={() => setActivePage('home')} aria-label="Leaner home">
          <span className="brand-mark" aria-hidden="true">L</span>
          <span>leaner</span>
        </a>

        <nav className="main-nav" aria-label="Main navigation">
          {navigationItems.map((item) => (
            <button
              className={`nav-item${activePage === item.id ? ' active' : ''}`}
              key={item.id}
              type="button"
              aria-current={activePage === item.id || (activePage === 'workout' && item.id === 'home') ? 'page' : undefined}
              onClick={() => setActivePage(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="account-controls">
          <span className="account-username">{currentUser?.username}</span>
          <button className="sign-out-button" type="button" onClick={() => void handleSignOut()}>
            Sign out
          </button>
        </div>
      </header>

      <main className="main-content">
        {accountError && <p className="auth-error account-error" role="alert">{accountError}</p>}
        <section id="home" className="page-view" hidden={activePage !== 'home'}>
          <HomePage workouts={workouts} exercises={exerciseCatalog} onStartWorkout={() => setActivePage('workout')} />
        </section>
        <section className="page-view" hidden={activePage !== 'workout'}>
          {catalogStatus === 'loading' && <p role="status">Loading exercises and routines…</p>}
          {catalogStatus === 'error' && (
            <div role="alert">
              <p>Could not load the workout catalog. Check that the backend and database are running.</p>
              <button className="secondary-button" type="button" onClick={() => setCatalogRetry((attempt) => attempt + 1)}>
                Try again
              </button>
            </div>
          )}
          {catalogStatus === 'ready' && (
            <WorkoutPage
              exercises={exerciseCatalog}
              routines={workoutRoutines}
              onExerciseCreated={handleExerciseCreated}
              onWorkoutSaved={handleWorkoutSaved}
            />
          )}
        </section>
        <section className="page-view" hidden={activePage !== 'history'}>
          {historyStatus === 'loading' && <p role="status">Loading workout history…</p>}
          {historyStatus === 'error' && (
            <div role="alert">
              <p>Could not load workout history. Check that the backend and database are running.</p>
              <button className="secondary-button" type="button" onClick={() => setHistoryRetry((attempt) => attempt + 1)}>
                Try again
              </button>
            </div>
          )}
          {historyStatus === 'ready' && <HistoryPage workouts={workouts} exercises={exerciseCatalog} />}
        </section>
        <section className="page-view" hidden={activePage !== 'progress'}>
          <ProgressPage exercises={exerciseCatalog} />
        </section>
        <section className="page-view" hidden={activePage !== 'coach'}>
          <CoachPage workoutCount={workouts.length} />
        </section>
      </main>
    </div>
  )
}

export default App
