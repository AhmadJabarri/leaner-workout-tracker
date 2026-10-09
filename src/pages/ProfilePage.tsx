import { useState, type FormEvent } from 'react'
import { goalLabels, saveProfile, type Goal, type Profile } from '../api/profile'
import { LogoutIcon } from '../components/Icons'

type ProfilePageProps = {
  username: string
  profile: Profile | null
  onProfileSaved: (profile: Profile) => void
  onSignOut: () => void
}

type FormState = {
  bodyWeightKg: string
  heightCm: string
  age: string
  goal: Goal | ''
  proteinTargetG: string
  coachNotes: string
}

// Mirrors the backend defaults so the placeholder shows the target before saving.
const proteinPerKg: Record<Goal, number> = { build_muscle: 1.8, get_stronger: 1.8, lose_fat: 2.0, maintain: 1.6 }

function toForm(profile: Profile | null): FormState {
  return {
    bodyWeightKg: profile?.bodyWeightKg?.toString() ?? '',
    heightCm: profile?.heightCm?.toString() ?? '',
    age: profile?.age?.toString() ?? '',
    goal: profile?.goal ?? '',
    proteinTargetG: profile?.proteinTargetG?.toString() ?? '',
    coachNotes: profile?.coachNotes ?? '',
  }
}

const numberOrNull = (value: string) => (value.trim() === '' ? null : Number(value))

function ProfilePage({ username, profile, onProfileSaved, onSignOut }: ProfilePageProps) {
  const [form, setForm] = useState<FormState>(() => toForm(profile))
  const [loadedProfile, setLoadedProfile] = useState(profile)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState('')

  // When the profile arrives from the server after first render, show it in the form.
  if (profile !== loadedProfile) {
    setLoadedProfile(profile)
    setForm(toForm(profile))
  }

  const weight = Number(form.bodyWeightKg)
  const height = Number(form.heightCm)
  const bmi = weight > 0 && height > 0 ? (weight / (height / 100) ** 2).toFixed(1) : null
  const defaultProtein = weight > 0 ? Math.round(weight * proteinPerKg[form.goal || 'maintain']) : null

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setStatus('idle')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('saving')
    setError('')
    try {
      const saved = await saveProfile({
        bodyWeightKg: numberOrNull(form.bodyWeightKg),
        heightCm: numberOrNull(form.heightCm),
        age: numberOrNull(form.age),
        goal: form.goal || null,
        proteinTargetG: numberOrNull(form.proteinTargetG),
        coachNotes: form.coachNotes.trim() || null,
      })
      setLoadedProfile(saved)
      onProfileSaved(saved)
      setStatus('saved')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save your profile.')
      setStatus('error')
    }
  }

  return (
    <div className="stack">
      <header className="profile-header">
        <span className="avatar" aria-hidden="true">{username.slice(0, 1).toUpperCase() || 'L'}</span>
        <div>
          <h1>{username}</h1>
          <p className="muted small">The Coach uses this profile in every answer.</p>
        </div>
      </header>

      <form className="stack" onSubmit={(event) => void handleSubmit(event)}>
        <section className="card stack-sm" aria-labelledby="body-title">
          <h2 id="body-title">Body</h2>
          <div className="field-grid three">
            <label className="field">
              <span className="field-label">Weight (kg)</span>
              <input className="input" type="number" inputMode="decimal" min="1" max="400" step="0.1" value={form.bodyWeightKg} onChange={(event) => update('bodyWeightKg', event.target.value)} placeholder="63" />
            </label>
            <label className="field">
              <span className="field-label">Height (cm)</span>
              <input className="input" type="number" inputMode="decimal" min="1" max="260" step="0.5" value={form.heightCm} onChange={(event) => update('heightCm', event.target.value)} placeholder="180" />
            </label>
            <label className="field">
              <span className="field-label">Age</span>
              <input className="input" type="number" inputMode="numeric" min="1" max="120" step="1" value={form.age} onChange={(event) => update('age', event.target.value)} placeholder="—" />
            </label>
          </div>
          {bmi && <p className="muted small">BMI {bmi}</p>}
        </section>

        <section className="card stack-sm" aria-labelledby="goal-title">
          <h2 id="goal-title">Goal</h2>
          <div className="segmented" role="radiogroup" aria-labelledby="goal-title">
            {(Object.keys(goalLabels) as Goal[]).map((goal) => (
              <button
                key={goal}
                type="button"
                role="radio"
                aria-checked={form.goal === goal}
                className={form.goal === goal ? 'active' : ''}
                onClick={() => update('goal', form.goal === goal ? '' : goal)}
              >
                {goalLabels[goal]}
              </button>
            ))}
          </div>
        </section>

        <section className="card stack-sm" aria-labelledby="nutrition-title">
          <h2 id="nutrition-title">Nutrition</h2>
          <label className="field">
            <span className="field-label">Daily protein target (g)</span>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              min="1"
              max="500"
              step="1"
              value={form.proteinTargetG}
              onChange={(event) => update('proteinTargetG', event.target.value)}
              placeholder={defaultProtein ? `${defaultProtein} (recommended)` : 'Add your weight first'}
            />
          </label>
          <p className="muted small">
            {defaultProtein
              ? `Leave empty to use the recommended ${defaultProtein} g, based on your weight and goal.`
              : 'Leave empty to use a recommended target once your weight is set.'}
          </p>
        </section>

        <section className="card stack-sm" aria-labelledby="notes-title">
          <h2 id="notes-title">Notes for your coach</h2>
          <textarea
            className="input"
            rows={3}
            maxLength={1000}
            value={form.coachNotes}
            onChange={(event) => update('coachNotes', event.target.value)}
            placeholder="e.g. I train 3 days a week at home with dumbbells. I want high-protein meal ideas."
          />
        </section>

        {status === 'error' && <p className="alert alert-error" role="alert">{error}</p>}

        <button className="button button-primary button-block" type="submit" disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved ✓' : 'Save profile'}
        </button>
      </form>

      <button className="button button-ghost button-danger button-block" type="button" onClick={onSignOut}>
        <LogoutIcon size={18} /> Sign out
      </button>
    </div>
  )
}

export default ProfilePage
