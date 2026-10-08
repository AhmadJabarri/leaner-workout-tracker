type CoachPageProps = {
  workoutCount: number
}

function CoachPage({ workoutCount }: CoachPageProps) {
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">TRAINING GUIDANCE</p>
          <h1>AI Coach</h1>
          <p className="page-intro">Ask questions about your training and get advice grounded in your history.</p>
        </div>
        <span className="coach-status">Preview</span>
      </header>

      <section className="coach-panel" aria-labelledby="coach-panel-title">
        <div className="coach-message">
          <div className="coach-avatar" aria-hidden="true">L</div>
          <div>
            <p className="coach-message-label">LEANER COACH</p>
            <h2 id="coach-panel-title">A coach that knows your training.</h2>
            <p>
              When connected, I’ll use your saved workouts to help you understand your progress
              and think through what to do next.
            </p>
          </div>
        </div>

        <div className="coach-prompts" aria-label="Example questions">
          <span>How has my bench press changed?</span>
          <span>Am I training consistently?</span>
          <span>What should I focus on next?</span>
        </div>

        <div className="coach-composer">
          <label className="field-label" htmlFor="coach-question">Your question</label>
          <div className="coach-input-row">
            <textarea
              id="coach-question"
              className="form-control"
              rows={2}
              placeholder="The coach will be available after workout history is connected."
              disabled
            />
            <button className="primary-button" type="button" disabled>
              Ask
            </button>
          </div>
          <p className="coach-note">
            {workoutCount === 0
              ? 'Log workouts first so your coach has training history to work from.'
              : 'Your logged sessions will provide context for future coaching.'}
          </p>
        </div>
      </section>
    </>
  )
}

export default CoachPage
