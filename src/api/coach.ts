/** Types and the authenticated request used by the AI Coach screen. */
export type CoachAnswer = {
  answer: string
  lookbackWeeks: number
  sessionsAnalyzed: number
}

/** Ask FastAPI to retrieve the signed-in user's workout context and call Groq. */
export async function askCoach(question: string): Promise<CoachAnswer> {
  const response = await fetch('/api/coach/ask', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: string } | null
    throw new Error(body?.detail ?? `The Coach request failed (${response.status}).`)
  }

  return response.json() as Promise<CoachAnswer>
}
