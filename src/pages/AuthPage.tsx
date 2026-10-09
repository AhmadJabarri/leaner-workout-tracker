import { useState, type FormEvent } from 'react'
import { signIn, signUp, type UserAccount } from '../api/auth'

type AuthPageProps = {
  onAuthenticated: (user: UserAccount) => void
}

type AuthMode = 'signin' | 'signup'

/** Sign-in and sign-up share one small form because both use username + password. */
function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>('signin')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const user = mode === 'signup'
        ? await signUp(username, password)
        : await signIn(username, password)
      setPassword('')
      onAuthenticated(user)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not sign in. Try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode)
    setError('')
    setPassword('')
  }

  return (
    <main className="auth-screen">
      <div className="auth-brand">
        <span className="brand-mark brand-mark-lg" aria-hidden="true">L</span>
        <span className="brand-name">leaner</span>
      </div>

      <section className="auth-panel" aria-labelledby="auth-title">
        <h1 id="auth-title">{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="muted">
          {mode === 'signin'
            ? 'Sign in to pick up where your training left off.'
            : 'A few details, then you’re ready to train.'}
        </p>

        <div className="segmented" role="tablist" aria-label="Account access">
          <button
            className={mode === 'signin' ? 'active' : ''}
            role="tab"
            aria-selected={mode === 'signin'}
            aria-controls="auth-form-panel"
            type="button"
            onClick={() => changeMode('signin')}
          >
            Sign in
          </button>
          <button
            className={mode === 'signup' ? 'active' : ''}
            role="tab"
            aria-selected={mode === 'signup'}
            aria-controls="auth-form-panel"
            type="button"
            onClick={() => changeMode('signup')}
          >
            Sign up
          </button>
        </div>

        <form id="auth-form-panel" className="stack-sm" onSubmit={(event) => void handleSubmit(event)}>
          <label className="field" htmlFor="auth-username">
            <span className="field-label">Username</span>
            <input
              id="auth-username"
              className="input"
              type="text"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              minLength={3}
              maxLength={32}
              pattern="[A-Za-z0-9_]{3,32}"
              placeholder="yourusername"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
            {mode === 'signup' && <small className="muted">3–32 letters, numbers, or underscores.</small>}
          </label>

          <label className="field" htmlFor="auth-password">
            <span className="field-label">Password</span>
            <span className="password-wrap">
              <input
                id="auth-password"
                className="input"
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                minLength={mode === 'signup' ? 12 : undefined}
                maxLength={128}
                placeholder={mode === 'signup' ? 'At least 12 characters' : 'Your password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                className="password-toggle"
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </span>
          </label>

          {error && <p className="alert alert-error" role="alert">{error}</p>}

          <button className="button button-primary button-block" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default AuthPage
