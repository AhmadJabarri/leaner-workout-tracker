import { useState, type FormEvent } from 'react'
import { askCoach, type CoachAnswer } from '../api/coach'

const suggestedQuestions = [
  'How has my bench press changed?',
  'Am I training consistently?',
  'What should I focus on next?',
]

type CoachPageProps = {
  workoutCount: number
}

function CoachPage({ workoutCount }: CoachPageProps) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<CoachAnswer | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedQuestion = question.trim()
    if (!trimmedQuestion || status === 'loading') return

    setStatus('loading')
    setErrorMessage('')
    setAnswer(null)
    try {
      setAnswer(await askCoach(trimmedQuestion))
      setStatus('idle')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not reach the Coach. Try again.')
      setStatus('error')
    }
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">TRAINING GUIDANCE</p>
          <h1>AI Coach</h1>
          <p className="page-intro">Ask a question and get an explanation based on your saved training.</p>
        </div>
        <span className="coach-status">Beta</span>
      </header>

      <section className="coach-panel" aria-labelledby="coach-panel-title">
        <div className="coach-message">
          <div className="coach-avatar" aria-hidden="true">L</div>
          <div>
            <p className="coach-message-label">LEANER COACH</p>
            <h2 id="coach-panel-title">Your training, explained.</h2>
            <p>
              The backend calculates your workout metrics. The Coach uses those results to explain
              patterns and suggest what to consider next.
            </p>
          </div>
        </div>

        <div className="coach-prompts" aria-label="Suggested questions">
          {suggestedQuestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setQuestion(suggestion)}
              disabled={status === 'loading'}
            >
              {suggestion}
            </button>
          ))}
        </div>

        <form className="coach-composer" onSubmit={(event) => void handleSubmit(event)}>
          <label className="field-label" htmlFor="coach-question">Your question</label>
          <div className="coach-input-row">
            <textarea
              id="coach-question"
              className="form-control"
              rows={2}
              minLength={1}
              maxLength={1000}
              placeholder="For example: How has my bench press progressed?"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              disabled={status === 'loading'}
              required
            />
            <button className="primary-button" type="submit" disabled={!question.trim() || status === 'loading'}>
              {status === 'loading' ? 'Thinking…' : 'Ask'}
            </button>
          </div>
          <p className="coach-note">
            {workoutCount === 0
              ? 'No workouts are saved yet, so the Coach may have little history to work from.'
              : 'Your workout context is limited to recent summaries and all-time heaviest sets.'}
            {' '}Your question and this context are sent to Groq to generate the answer.
          </p>
        </form>

        {status === 'loading' && <p className="coach-feedback" role="status">Reviewing your workout history…</p>}
        {status === 'error' && <p className="coach-feedback coach-error" role="alert">{errorMessage}</p>}
        {answer && (
          <section className="coach-answer" aria-label="Coach answer" aria-live="polite">
            <p className="coach-message-label">COACH RESPONSE</p>
            <p>{answer.answer}</p>
            <small>
              Based on {answer.sessionsAnalyzed} recent {answer.sessionsAnalyzed === 1 ? 'workout' : 'workouts'}
              {' '}from the last {answer.lookbackWeeks} weeks, plus all-time heaviest sets.
            </small>
          </section>
        )}
      </section>
    </>
  )
}

export default CoachPage
