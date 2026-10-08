/** Account data returned by the authentication endpoints. */
export type UserAccount = {
  id: string
  username: string
}

async function authError(response: Response): Promise<Error> {
  const body = await response.json().catch(() => null) as { detail?: string } | null
  return new Error(body?.detail ?? `Authentication request failed (${response.status}).`)
}

/** Restore the browser session; a 401 simply means the visitor is signed out. */
export async function fetchCurrentUser(): Promise<UserAccount | null> {
  const response = await fetch('/api/auth/me', { credentials: 'same-origin' })
  if (response.status === 401) return null
  if (!response.ok) throw await authError(response)
  return response.json() as Promise<UserAccount>
}

async function submitCredentials(
  endpoint: 'signin' | 'signup',
  username: string,
  password: string,
): Promise<UserAccount> {
  const response = await fetch(`/api/auth/${endpoint}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!response.ok) throw await authError(response)
  return response.json() as Promise<UserAccount>
}

/** Create an account and receive the session cookie from FastAPI. */
export function signUp(username: string, password: string): Promise<UserAccount> {
  return submitCredentials('signup', username, password)
}

/** Verify an existing account and receive a new session cookie. */
export function signIn(username: string, password: string): Promise<UserAccount> {
  return submitCredentials('signin', username, password)
}

/** Revoke the current server session and clear its browser cookie. */
export async function signOut(): Promise<void> {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'same-origin',
  })
  if (!response.ok) throw await authError(response)
}
