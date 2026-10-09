import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { askCoach } from '../api/coach'
import { CoachIcon, SendIcon } from '../components/Icons'

const suggestedQuestions = [
  'What should I focus on next?',
  'How much protein should I eat today?',
  'Am I training consistently?',
  'Which muscles am I neglecting?',
]

type Message = { id: string; role: 'user' | 'coach'; text: string; meta?: string; isError?: boolean }

type CoachPageProps = {
  workoutCount: number
  hasProfile: boolean
  onOpenProfile: () => void
}

/** Render the Coach's plain-text answer, turning "- " lines into a bullet list. */
function CoachText({ text }: { text: string }) {
  const blocks: { type: 'p' | 'ul'; lines: string[] }[] = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const isBullet = /^[-•*]\s+/.test(line)
    const content = line.replace(/^[-•*]\s+/, '')
    const last = blocks.at(-1)
    if (isBullet && last?.type === 'ul') last.lines.push(content)
    else blocks.push({ type: isBullet ? 'ul' : 'p', lines: [content] })
  }
  return (
    <>
      {blocks.map((block, index) =>
        block.type === 'ul' ? (
          <ul key={index}>{block.lines.map((line, lineIndex) => <li key={lineIndex}>{line}</li>)}</ul>
        ) : (
          <p key={index}>{block.lines[0]}</p>
        ),
      )}
    </>
  )
}

function CoachPage({ workoutCount, hasProfile, onOpenProfile }: CoachPageProps) {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isLoading])

  async function ask(text: string) {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return

    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', text: trimmed }])
    setQuestion('')
    setIsLoading(true)
    try {
      const answer = await askCoach(trimmed)
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'coach',
          text: answer.answer,
          meta: `Based on ${answer.sessionsAnalyzed} ${answer.sessionsAnalyzed === 1 ? 'workout' : 'workouts'} from the last ${answer.lookbackWeeks} weeks`,
        },
      ])
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'coach',
          isError: true,
          text: error instanceof Error ? error.message : 'Could not reach the Coach. Try again.',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void ask(question)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends on desktop; Shift+Enter adds a new line.
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void ask(question)
    }
  }

  return (
    <div className="coach-page">
      <header className="page-title">
        <h1>Coach</h1>
        <p className="muted">Advice based on your workouts and profile.</p>
      </header>

      {!hasProfile && (
        <button className="alert alert-info card-button" type="button" onClick={onOpenProfile}>
          Add your weight and goal in Profile so the Coach can tailor training and protein advice →
        </button>
      )}

      <div className="chat" aria-live="polite">
        {messages.length === 0 && (
          <div className="chat-intro">
            <span className="icon-badge icon-badge-lg icon-badge-accent"><CoachIcon size={28} /></span>
            <h2>Hi! I’m your Leaner coach.</h2>
            <p className="muted">
              {workoutCount === 0
                ? 'Log a workout or two and I can give you specific advice. You can still ask me anything now.'
                : 'Ask me about your progress, what to train next, or what to eat.'}
            </p>
            <div className="suggestions">
              {suggestedQuestions.map((suggestion) => (
                <button key={suggestion} className="chip" type="button" onClick={() => void ask(suggestion)} disabled={isLoading}>
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className={`bubble bubble-${message.role}${message.isError ? ' bubble-error' : ''}`}>
            {message.role === 'coach' ? <CoachText text={message.text} /> : <p>{message.text}</p>}
            {message.meta && <small className="muted">{message.meta}</small>}
          </div>
        ))}

        {isLoading && (
          <div className="bubble bubble-coach typing" role="status" aria-label="Coach is thinking">
            <span /><span /><span />
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form className="composer" onSubmit={handleSubmit}>
        <textarea
          className="input"
          rows={1}
          maxLength={1000}
          placeholder="Ask your coach…"
          aria-label="Your question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <button className="send-button" type="submit" disabled={!question.trim() || isLoading} aria-label="Send">
          <SendIcon size={20} />
        </button>
      </form>
      <p className="muted tiny composer-note">Your question, profile, and workout summary are sent to Groq to generate answers.</p>
    </div>
  )
}

export default CoachPage
