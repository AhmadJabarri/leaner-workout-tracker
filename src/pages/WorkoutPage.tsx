// Handles workout entry; custom exercises are saved by FastAPI before use.
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon, TrashIcon } from '../components/Icons'
import type {
  Exercise,
  WorkoutRoutine,
  WorkoutSession,
  WorkoutSet,
  WorkoutSubmission,
} from '../types/workout'
import { exerciseName } from '../utils/format'

type SetDraft = {
  id: string
  completed: boolean
  reps: string
  weight: string
}

type ExerciseDraft = {
  id: string
  exerciseId: string
  canChangeExercise: boolean
  sets: SetDraft[]
}

type WorkoutDraft = {
  routineId: string
  startedAt: string
  exercises: ExerciseDraft[]
  note: string
}

type WorkoutPageProps = {
  exercises: Exercise[]
  routines: WorkoutRoutine[]
  workouts: WorkoutSession[]
  onExerciseCreated: (exercise: Omit<Exercise, 'id'>) => Promise<Exercise>
  onWorkoutSaved: (workout: WorkoutSubmission) => Promise<void>
  onClose: () => void
}

// An in-progress workout survives the PWA being closed or the phone reloading it.
const DRAFT_KEY = 'leaner.workoutDraft.v1'

function loadDraft(): WorkoutDraft | null {
  try {
    const saved = localStorage.getItem(DRAFT_KEY)
    return saved ? (JSON.parse(saved) as WorkoutDraft) : null
  } catch {
    return null
  }
}

function storeDraft(draft: WorkoutDraft | null) {
  try {
    if (draft) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    else localStorage.removeItem(DRAFT_KEY)
  } catch {
    // Storage can be unavailable (private mode); the workout still works in memory.
  }
}

function createSet(previous?: SetDraft): SetDraft {
  return { id: crypto.randomUUID(), completed: false, reps: previous?.reps ?? '', weight: previous?.weight ?? '' }
}

function createExerciseDraft(exerciseId: string, canChangeExercise = false): ExerciseDraft {
  return { id: crypto.randomUUID(), exerciseId, canChangeExercise, sets: [createSet()] }
}

function toWorkoutSet(draft: SetDraft): WorkoutSet {
  return { reps: Number(draft.reps), weight: Number(draft.weight || 0), weightUnit: 'kg' }
}

function useElapsed(startedAt: string | undefined): string {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!startedAt) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [startedAt])
  if (!startedAt) return '0:00'
  const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = String(seconds % 60).padStart(2, '0')
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`
}

function WorkoutPage({ exercises, routines, workouts, onExerciseCreated, onWorkoutSaved, onClose }: WorkoutPageProps) {
  const [draft, setDraft] = useState<WorkoutDraft | null>(loadDraft)
  const [exerciseToAddId, setExerciseToAddId] = useState('')
  const [isAddingExercise, setIsAddingExercise] = useState(false)
  const [newExerciseName, setNewExerciseName] = useState('')
  const [newExerciseMuscleGroup, setNewExerciseMuscleGroup] = useState('')
  const [newExerciseEquipment, setNewExerciseEquipment] = useState('')
  const [isCreatingExercise, setIsCreatingExercise] = useState(false)
  const [createExerciseError, setCreateExerciseError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const elapsed = useElapsed(draft?.startedAt)

  useEffect(() => storeDraft(draft), [draft])

  // The most recent sets logged for each exercise, shown as "Previous" hints.
  const previousSets = useMemo(() => {
    const result = new Map<string, WorkoutSet[]>()
    for (const workout of workouts) {
      for (const entry of workout.exercises) {
        if (!result.has(entry.exerciseId)) result.set(entry.exerciseId, entry.sets)
      }
    }
    return result
  }, [workouts])

  const addExerciseId = exerciseToAddId || exercises[0]?.id || ''
  const selectedRoutine = routines.find((routine) => routine.id === draft?.routineId)
  const completedSetCount = draft?.exercises.reduce(
    (total, exercise) => total + exercise.sets.filter((set) => set.completed).length,
    0,
  ) ?? 0

  function updateExercises(update: (current: ExerciseDraft[]) => ExerciseDraft[]) {
    setDraft((current) => (current ? { ...current, exercises: update(current.exercises) } : current))
  }

  function updateSet(exerciseDraftId: string, setId: string, updates: Partial<SetDraft>) {
    updateExercises((current) =>
      current.map((exercise) =>
        exercise.id === exerciseDraftId
          ? { ...exercise, sets: exercise.sets.map((set) => (set.id === setId ? { ...set, ...updates } : set)) }
          : exercise,
      ),
    )
  }

  function start(routineId: string, exerciseDrafts: ExerciseDraft[]) {
    setDraft({ routineId, startedAt: new Date().toISOString(), exercises: exerciseDrafts, note: '' })
    setSaveError(null)
    window.scrollTo(0, 0)
  }

  function toggleComplete(exerciseDraft: ExerciseDraft, set: SetDraft, setIndex: number) {
    if (set.completed) {
      updateSet(exerciseDraft.id, set.id, { completed: false })
      return
    }
    // Empty fields take last time's values, so repeating a set is one tap.
    const previous = previousSets.get(exerciseDraft.exerciseId)?.[setIndex]
    const reps = set.reps || (previous ? String(previous.reps) : '')
    const weight = set.weight || (previous ? String(previous.weight) : '')
    if (!reps || Number(reps) <= 0) return
    updateSet(exerciseDraft.id, set.id, { completed: true, reps, weight: weight || '0' })
  }

  async function addCustomExercise() {
    const name = newExerciseName.trim()
    const primaryMuscleGroup = newExerciseMuscleGroup.trim()
    const equipment = newExerciseEquipment.trim()
    if (!name || !primaryMuscleGroup) return

    setIsCreatingExercise(true)
    setCreateExerciseError(null)
    try {
      const savedExercise = await onExerciseCreated({ name, primaryMuscleGroup, ...(equipment && { equipment }) })
      updateExercises((current) => [...current, createExerciseDraft(savedExercise.id)])
      setExerciseToAddId(savedExercise.id)
      setNewExerciseName('')
      setNewExerciseMuscleGroup('')
      setNewExerciseEquipment('')
      setIsAddingExercise(false)
    } catch (error) {
      setCreateExerciseError(error instanceof Error ? error.message : 'Could not save this exercise.')
    } finally {
      setIsCreatingExercise(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft || completedSetCount === 0 || isSaving) return

    const workout: WorkoutSubmission = {
      ...(draft.routineId !== 'custom' && { routineId: draft.routineId }),
      ...(draft.note.trim() && { notes: draft.note.trim() }),
      exercises: draft.exercises
        .map((exercise) => ({
          exerciseId: exercise.exerciseId,
          sets: exercise.sets.filter((set) => set.completed).map(toWorkoutSet),
        }))
        .filter((exercise) => exercise.sets.length > 0),
    }

    setIsSaving(true)
    setSaveError(null)
    try {
      await onWorkoutSaved(workout)
      setDraft(null)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save this workout.')
    } finally {
      setIsSaving(false)
    }
  }

  function handleDiscard() {
    if (completedSetCount > 0 && !window.confirm('Discard this workout? Completed sets will be lost.')) return
    setDraft(null)
    setIsAddingExercise(false)
  }

  if (!draft) {
    return (
      <div className="stack">
        <header className="page-title with-back">
          <button className="icon-button" type="button" onClick={onClose} aria-label="Back to home">
            <ChevronLeftIcon />
          </button>
          <div>
            <h1>Start a workout</h1>
            <p className="muted">Choose a routine. You can add or remove exercises as you go.</p>
          </div>
        </header>

        <div className="routine-list">
          {routines.map((routine) => (
            <button
              className="card card-button routine-card"
              key={routine.id}
              type="button"
              onClick={() => start(routine.id, routine.exercises.map((planned) => createExerciseDraft(planned.exerciseId)))}
            >
              <span>
                <strong>{routine.name}</strong>
                <small className="muted">
                  {routine.exercises.length} exercises · {routine.exercises.slice(0, 3).map((planned) => exerciseName(exercises, planned.exerciseId)).join(', ')}…
                </small>
              </span>
              <ChevronRightIcon size={18} />
            </button>
          ))}
          <button
            className="card card-button routine-card routine-card-empty"
            type="button"
            onClick={() => start('custom', [createExerciseDraft(exercises[0]?.id ?? '', true)])}
          >
            <span>
              <strong>Empty workout</strong>
              <small className="muted">Pick your own exercises</small>
            </span>
            <PlusIcon size={18} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <form className="workout-form" onSubmit={(event) => void handleSubmit(event)}>
      <header className="workout-header">
        <div>
          <h1>{selectedRoutine?.name ?? 'Workout'}</h1>
          <p className="muted small"><span className="live-dot" aria-hidden="true" /> {elapsed}</p>
        </div>
        <button className="button button-ghost button-danger" type="button" onClick={handleDiscard}>
          Discard
        </button>
      </header>

      <div className="stack">
        {draft.exercises.map((exerciseDraft, exerciseIndex) => {
          const exercise = exercises.find((item) => item.id === exerciseDraft.exerciseId)
          const previous = previousSets.get(exerciseDraft.exerciseId)

          return (
            <article className="card exercise-card" key={exerciseDraft.id}>
              <div className="exercise-card-heading">
                {exerciseDraft.canChangeExercise ? (
                  <select
                    className="input exercise-select"
                    aria-label={`Exercise ${exerciseIndex + 1}`}
                    value={exerciseDraft.exerciseId}
                    onChange={(event) =>
                      updateExercises((current) =>
                        current.map((item) => (item.id === exerciseDraft.id ? { ...item, exerciseId: event.target.value } : item)),
                      )
                    }
                  >
                    {exercises.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                ) : (
                  <div>
                    <h2>{exercise?.name ?? 'Exercise'}</h2>
                    <p className="muted small">{exercise?.primaryMuscleGroup}</p>
                  </div>
                )}
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => updateExercises((current) => current.filter((item) => item.id !== exerciseDraft.id))}
                  disabled={draft.exercises.length === 1}
                  aria-label={`Remove ${exercise?.name ?? 'exercise'}`}
                >
                  <TrashIcon size={18} />
                </button>
              </div>

              <div className="set-table" role="group" aria-label={`${exercise?.name ?? 'Exercise'} sets`}>
                <div className="set-table-head" aria-hidden="true">
                  <span>Set</span><span>Previous</span><span>kg</span><span>Reps</span><span />
                </div>
                {exerciseDraft.sets.map((set, setIndex) => {
                  const last = previous?.[setIndex]
                  return (
                    <div className={`set-table-row${set.completed ? ' completed' : ''}`} key={set.id}>
                      <span className="set-number">{setIndex + 1}</span>
                      <span className="set-previous">{last ? `${last.weight} × ${last.reps}` : '—'}</span>
                      <input
                        className="input set-input"
                        type="number"
                        min="0"
                        step="0.5"
                        inputMode="decimal"
                        aria-label={`Set ${setIndex + 1} weight in kg`}
                        placeholder={last ? String(last.weight) : '0'}
                        value={set.weight}
                        onChange={(event) => updateSet(exerciseDraft.id, set.id, { weight: event.target.value })}
                      />
                      <input
                        className="input set-input"
                        type="number"
                        min="1"
                        step="1"
                        inputMode="numeric"
                        aria-label={`Set ${setIndex + 1} reps`}
                        placeholder={last ? String(last.reps) : '0'}
                        value={set.reps}
                        onChange={(event) => updateSet(exerciseDraft.id, set.id, { reps: event.target.value })}
                      />
                      <button
                        className="check-button"
                        type="button"
                        aria-pressed={set.completed}
                        aria-label={`Mark set ${setIndex + 1} ${set.completed ? 'not done' : 'done'}`}
                        onClick={() => toggleComplete(exerciseDraft, set, setIndex)}
                      >
                        <CheckIcon size={18} />
                      </button>
                    </div>
                  )
                })}
              </div>

              <div className="exercise-card-actions">
                <button
                  className="button button-soft"
                  type="button"
                  onClick={() =>
                    updateExercises((current) =>
                      current.map((item) =>
                        item.id === exerciseDraft.id
                          ? {
                              ...item,
                              // With history, leave fields empty so last time's values show as hints;
                              // otherwise repeat this workout's last set.
                              sets: [...item.sets, createSet(previous?.[item.sets.length] ? undefined : item.sets.at(-1))],
                            }
                          : item,
                      ),
                    )
                  }
                >
                  <PlusIcon size={16} /> Add set
                </button>
                {exerciseDraft.sets.length > 1 && (
                  <button
                    className="button button-ghost"
                    type="button"
                    onClick={() =>
                      updateExercises((current) =>
                        current.map((item) => (item.id === exerciseDraft.id ? { ...item, sets: item.sets.slice(0, -1) } : item)),
                      )
                    }
                  >
                    Remove last
                  </button>
                )}
              </div>
            </article>
          )
        })}

        <section className="card">
          <label className="field">
            <span className="field-label">Add exercise</span>
            <div className="inline-field">
              <select className="input" value={addExerciseId} onChange={(event) => setExerciseToAddId(event.target.value)}>
                {exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>{exercise.name} · {exercise.primaryMuscleGroup}</option>
                ))}
              </select>
              <button
                className="button button-secondary"
                type="button"
                disabled={!addExerciseId}
                onClick={() => updateExercises((current) => [...current, createExerciseDraft(addExerciseId, true)])}
              >
                Add
              </button>
            </div>
          </label>

          {isAddingExercise ? (
            <div className="stack-sm create-exercise">
              <h3>New exercise</h3>
              <label className="field">
                <span className="field-label">Name</span>
                <input className="input" type="text" value={newExerciseName} onChange={(event) => setNewExerciseName(event.target.value)} placeholder="e.g. Cable row" />
              </label>
              <div className="field-grid">
                <label className="field">
                  <span className="field-label">Muscle group</span>
                  <input className="input" type="text" value={newExerciseMuscleGroup} onChange={(event) => setNewExerciseMuscleGroup(event.target.value)} placeholder="e.g. Back" />
                </label>
                <label className="field">
                  <span className="field-label">Equipment <small className="muted">optional</small></span>
                  <input className="input" type="text" value={newExerciseEquipment} onChange={(event) => setNewExerciseEquipment(event.target.value)} placeholder="e.g. Cable" />
                </label>
              </div>
              {createExerciseError && <p className="alert alert-error" role="alert">{createExerciseError}</p>}
              <div className="inline-actions">
                <button className="button button-ghost" type="button" onClick={() => setIsAddingExercise(false)}>Cancel</button>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => void addCustomExercise()}
                  disabled={!newExerciseName.trim() || !newExerciseMuscleGroup.trim() || isCreatingExercise}
                >
                  {isCreatingExercise ? 'Saving…' : 'Create & add'}
                </button>
              </div>
            </div>
          ) : (
            <button className="link-button create-exercise-link" type="button" onClick={() => setIsAddingExercise(true)}>
              Can’t find it? Create a custom exercise
            </button>
          )}
        </section>

        <label className="card field">
          <span className="field-label">Notes <small className="muted">optional</small></span>
          <textarea
            className="input"
            rows={2}
            value={draft.note}
            onChange={(event) => setDraft({ ...draft, note: event.target.value })}
            placeholder="How did it feel?"
          />
        </label>

        {saveError && <p className="alert alert-error" role="alert">Workout was not saved: {saveError}</p>}
      </div>

      <div className="finish-bar">
        <span className="muted small">
          {completedSetCount === 0 ? 'Tap ✓ to complete a set' : `${completedSetCount} ${completedSetCount === 1 ? 'set' : 'sets'} done`}
        </span>
        <button className="button button-primary" type="submit" disabled={completedSetCount === 0 || isSaving}>
          {isSaving ? 'Saving…' : 'Finish'}
        </button>
      </div>
    </form>
  )
}

export default WorkoutPage
