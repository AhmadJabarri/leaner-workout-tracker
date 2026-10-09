/** Profile data the Coach always takes into account. */
export type Goal = 'build_muscle' | 'lose_fat' | 'maintain' | 'get_stronger'

export type Profile = {
  bodyWeightKg: number | null
  heightCm: number | null
  age: number | null
  goal: Goal | null
  proteinTargetG: number | null
  coachNotes: string | null
  /** The custom target if set, otherwise the backend's default for weight and goal. */
  effectiveProteinTargetG: number | null
}

export type ProfileInput = Omit<Profile, 'effectiveProteinTargetG'>

export const goalLabels: Record<Goal, string> = {
  build_muscle: 'Build muscle',
  get_stronger: 'Get stronger',
  lose_fat: 'Lose fat',
  maintain: 'Maintain',
}

async function readError(response: Response, fallback: string): Promise<Error> {
  const body = await response.json().catch(() => null) as { detail?: unknown } | null
  return new Error(typeof body?.detail === 'string' ? body.detail : fallback)
}

export async function fetchProfile(): Promise<Profile> {
  const response = await fetch('/api/profile')
  if (!response.ok) throw await readError(response, `Could not load your profile (${response.status}).`)
  return response.json() as Promise<Profile>
}

export async function saveProfile(profile: ProfileInput): Promise<Profile> {
  const response = await fetch('/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  })
  if (!response.ok) throw await readError(response, `Could not save your profile (${response.status}).`)
  return response.json() as Promise<Profile>
}
