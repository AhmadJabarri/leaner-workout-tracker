import { useEffect, useState } from 'react'
import './App.css'
import { fetchCurrentUser, signOut, type UserAccount } from './api/auth'
import { createExercise, fetchExercises, fetchWorkoutRoutines } from './api/catalog'
import { fetchProfile, type Profile } from './api/profile'
import { createWorkout, fetchWorkouts } from './api/workouts'
import { CoachIcon, HistoryIcon, HomeIcon, ProfileIcon, ProgressIcon } from './components/Icons'
import AuthPage from './pages/AuthPage'
import CoachPage from './pages/CoachPage'
import HomePage from './pages/HomePage'
import HistoryPage from './pages/HistoryPage'
import ProfilePage from './pages/ProfilePage'
import ProgressPage from './pages/ProgressPage'
import WorkoutPage from './pages/WorkoutPage'
import type { Exercise, WorkoutRoutine, WorkoutSession, WorkoutSubmission } from './types/workout'

type Page = 'home' | 'workout' | 'history' | 'progress' | 'coach' | 'profile'

const navigationItems: { id: Page; label: string; Icon: typeof HomeIcon }[] = [
  { id: 'home', label: 'Home', Icon: HomeIcon },
  { id: 'history', label: 'History', Icon: HistoryIcon },
  { id: 'progress', label: 'Progress', Icon: ProgressIcon },
  { id: 'coach', label: 'Coach', Icon: CoachIcon },
  { id: 'profile', label: 'Profile', Icon: ProfileIcon },
]

const pageIds: Page[] = ['home', 'workout', 'history', 'progress', 'coach', 'profile']

// The URL hash mirrors the page so the phone's back gesture moves between tabs.
function pageFromHash(): Page {
  const hash = window.location.hash.replace('#', '')
  return pageIds.includes(hash as Page) ? (hash as Page) : 'home'
}

function App() {
  // App checks the server session before loading any private workout data.
  const [authStatus, setAuthStatus] = useState<'checking' | 'signed-in' | 'signed-out' | 'error'>('checking')
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null)
  const [authRetry, setAuthRetry] = useState(0)
  const [accountError, setAccountError] = useState('')

  // App owns shared catalog, profile, and persisted workout history for the visible pages.
  const [activePage, setActivePage] = useState<Page>(pageFromHash)
  const [exerciseCatalog, setExerciseCatalog] = useState<Exercise[]>([])
  const [workoutRoutines, setWorkoutRoutines] = useState<WorkoutRoutine[]>([])
  const [catalogStatus, setCatalogStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [catalogRetry, setCatalogRetry] = useState(0)
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([])
  const [historyStatus, setHistoryStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [historyRetry, setHistoryRetry] = useState(0)
  const [profile, setProfile] = useState<Profile | null>(null)
  // Bumped after each saved workout so Progress reloads its server-side numbers.
  const [progressVersion, setProgressVersion] = useState(0)

  useEffect(() => {
    function syncFromHash() {
      setActivePage(pageFromHash())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [])

  function navigate(page: Page) {
    if (page === activePage) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    window.location.hash = page
  }

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
        const [exercises, routines] = await Promise.all([fetchExercises(), fetchWorkoutRoutines()])
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

  useEffect(() => {
    if (authStatus !== 'signed-in') return
    let ignoreResult = false
    // The profile is optional; a failed load just leaves the Home card in its empty state.
    fetchProfile()
      .then((result) => {
        if (!ignoreResult) setProfile(result)
      })
      .catch(() => undefined)
    return () => {
      ignoreResult = true
    }
  }, [authStatus])

  function handleAuthenticated(user: UserAccount) {
    setCurrentUser(user)
    setAccountError('')
    setAuthStatus('signed-in')
  }

  async function handleSignOut() {
    setAccountError('')
    try {
      await signOut()
      try {
        // Don't carry an unfinished workout over to the next account on this device.
        localStorage.removeItem('leaner.workoutDraft.v1')
      } catch {
        // Storage may be unavailable; nothing to clear then.
      }
      setCurrentUser(null)
      setExerciseCatalog([])
      setWorkoutRoutines([])
      setWorkouts([])
      setProfile(null)
      setAuthStatus('signed-out')
      window.location.hash = 'home'
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : 'Could not sign out. Try again.')
    }
  }

  async function handleWorkoutSaved(workout: WorkoutSubmission) {
    const savedWorkout = await createWorkout(workout)
    setWorkouts((currentWorkouts) => [savedWorkout, ...currentWorkouts])
    setHistoryStatus('ready')
    setProgressVersion((version) => version + 1)
    window.location.hash = 'history'
  }

  async function handleExerciseCreated(exercise: Omit<Exercise, 'id'>): Promise<Exercise> {
    const savedExercise = await createExercise(exercise)
    setExerciseCatalog((currentExercises) => [...currentExercises, savedExercise])
    return savedExercise
  }

  if (authStatus === 'checking') {
    return (
      <main className="auth-screen">
        <div className="splash-mark" aria-hidden="true">L</div>
        <p className="visually-hidden" role="status">Checking your session…</p>
      </main>
    )
  }

  if (authStatus === 'error') {
    return (
      <main className="auth-screen">
        <section className="auth-panel" role="alert">
          <h1>Can’t reach Leaner</h1>
          <p className="muted">Check your connection, then try again.</p>
          <button className="button button-primary button-block" type="button" onClick={() => setAuthRetry((retry) => retry + 1)}>
            Try again
          </button>
        </section>
      </main>
    )
  }

  if (authStatus === 'signed-out') {
    return <AuthPage onAuthenticated={handleAuthenticated} />
  }

  // The workout logger is a sub-screen of Home, so Home stays highlighted.
  const highlightedPage = activePage === 'workout' ? 'home' : activePage

  return (
    <div className="app-shell">
      <nav className="tab-bar" aria-label="Main navigation">
        <a className="brand" href="#home" aria-label="Leaner home">
          <span className="brand-mark" aria-hidden="true">L</span>
          <span className="brand-name">leaner</span>
        </a>
        {navigationItems.map(({ id, label, Icon }) => (
          <button
            className={`tab-item${highlightedPage === id ? ' active' : ''}`}
            key={id}
            type="button"
            aria-current={highlightedPage === id ? 'page' : undefined}
            onClick={() => navigate(id)}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <main className="main-content">
        {accountError && <p className="alert alert-error" role="alert">{accountError}</p>}

        <section className="page-view" hidden={activePage !== 'home'}>
          <HomePage
            username={currentUser?.username ?? ''}
            workouts={workouts}
            exercises={exerciseCatalog}
            profile={profile}
            onStartWorkout={() => navigate('workout')}
            onOpenProfile={() => navigate('profile')}
            onOpenCoach={() => navigate('coach')}
            onOpenHistory={() => navigate('history')}
          />
        </section>

        <section className="page-view" hidden={activePage !== 'workout'}>
          {catalogStatus === 'loading' && <p className="muted" role="status">Loading exercises and routines…</p>}
          {catalogStatus === 'error' && (
            <div className="alert alert-error" role="alert">
              <p>Could not load the workout catalog.</p>
              <button className="button button-secondary" type="button" onClick={() => setCatalogRetry((attempt) => attempt + 1)}>
                Try again
              </button>
            </div>
          )}
          {catalogStatus === 'ready' && (
            <WorkoutPage
              exercises={exerciseCatalog}
              routines={workoutRoutines}
              workouts={workouts}
              onExerciseCreated={handleExerciseCreated}
              onWorkoutSaved={handleWorkoutSaved}
              onClose={() => navigate('home')}
            />
          )}
        </section>

        <section className="page-view" hidden={activePage !== 'history'}>
          {historyStatus === 'loading' && <p className="muted" role="status">Loading workout history…</p>}
          {historyStatus === 'error' && (
            <div className="alert alert-error" role="alert">
              <p>Could not load workout history.</p>
              <button className="button button-secondary" type="button" onClick={() => setHistoryRetry((attempt) => attempt + 1)}>
                Try again
              </button>
            </div>
          )}
          {historyStatus === 'ready' && (
            <HistoryPage workouts={workouts} exercises={exerciseCatalog} routines={workoutRoutines} onStartWorkout={() => navigate('workout')} />
          )}
        </section>

        <section className="page-view" hidden={activePage !== 'progress'}>
          <ProgressPage key={progressVersion} exercises={exerciseCatalog} workouts={workouts} />
        </section>

        <section className="page-view" hidden={activePage !== 'coach'}>
          <CoachPage workoutCount={workouts.length} hasProfile={Boolean(profile?.bodyWeightKg)} onOpenProfile={() => navigate('profile')} />
        </section>

        <section className="page-view" hidden={activePage !== 'profile'}>
          <ProfilePage
            username={currentUser?.username ?? ''}
            profile={profile}
            onProfileSaved={setProfile}
            onSignOut={() => void handleSignOut()}
          />
        </section>
      </main>
    </div>
  )
}

export default App
