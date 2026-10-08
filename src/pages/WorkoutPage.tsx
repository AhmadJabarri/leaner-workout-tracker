// Handles workout entry; custom exercises are saved by FastAPI before use.
import { useEffect, useState, type FormEvent } from 'react'
import type {
  Exercise,
  WorkoutRoutine,
  WorkoutSubmission,
  WorkoutSet,
} from '../types/workout'

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

type WorkoutPageProps = {
  exercises: Exercise[]
  routines: WorkoutRoutine[]
  onExerciseCreated: (exercise: Omit<Exercise, 'id'>) => Promise<Exercise>
  onWorkoutSaved: (workout: WorkoutSubmission) => Promise<void>
}

function createEmptySet(): SetDraft {
  return { id: crypto.randomUUID(), completed: false, reps: '', weight: '' }
}

function createExerciseDraft(exerciseId: string, canChangeExercise = false): ExerciseDraft {
  return {
    id: crypto.randomUUID(),
    exerciseId,
    canChangeExercise,
    sets: [createEmptySet()],
  }
}

function toWorkoutSet(draft: SetDraft): WorkoutSet {
  return {
    reps: Number(draft.reps),
    weight: Number(draft.weight),
    weightUnit: 'kg',
  }
}

function WorkoutPage({ exercises, routines, onExerciseCreated, onWorkoutSaved }: WorkoutPageProps) {
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null)
  const [exerciseDrafts, setExerciseDrafts] = useState<ExerciseDraft[]>([])
  const [exerciseToAddId, setExerciseToAddId] = useState(exercises[0]?.id ?? '')
  const [isAddingExercise, setIsAddingExercise] = useState(false)
  const [newExerciseName, setNewExerciseName] = useState('')
  const [newExerciseMuscleGroup, setNewExerciseMuscleGroup] = useState('')
  const [newExerciseEquipment, setNewExerciseEquipment] = useState('')
  const [isCreatingExercise, setIsCreatingExercise] = useState(false)
  const [createExerciseError, setCreateExerciseError] = useState<string | null>(null)
  const [workoutNote, setWorkoutNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // The catalog now arrives asynchronously from FastAPI, so choose its first
  // exercise after loading instead of relying only on the initial empty array.
  useEffect(() => {
    if (!exerciseToAddId && exercises.length > 0) {
      setExerciseToAddId(exercises[0].id)
    }
  }, [exerciseToAddId, exercises])

  const selectedRoutine = routines.find((routine) => routine.id === selectedRoutineId)
  const completedSetCount = exerciseDrafts.reduce(
    (total, exercise) => total + exercise.sets.filter((set) => set.completed).length,
    0,
  )

  function startRoutine(routine: WorkoutRoutine) {
    setSelectedRoutineId(routine.id)
    setExerciseDrafts(
      routine.exercises.map((plannedExercise) =>
        createExerciseDraft(plannedExercise.exerciseId),
      ),
    )
  }

  function startCustomWorkout() {
    setSelectedRoutineId('custom')
    setExerciseDrafts([createExerciseDraft(exercises[0]?.id ?? '', true)])
  }

  function updateSetDraft(exerciseDraftId: string, setId: string, updates: Partial<SetDraft>) {
    setExerciseDrafts((currentExercises) =>
      currentExercises.map((exercise) =>
        exercise.id === exerciseDraftId
          ? {
              ...exercise,
              sets: exercise.sets.map((set) =>
                set.id === setId ? { ...set, ...updates } : set,
              ),
            }
          : exercise,
      ),
    )
  }

  function addExerciseToWorkout() {
    if (!exercises.some((exercise) => exercise.id === exerciseToAddId)) return
    setExerciseDrafts((current) => [...current, createExerciseDraft(exerciseToAddId, true)])
  }

  async function addCustomExercise() {
    const name = newExerciseName.trim()
    const primaryMuscleGroup = newExerciseMuscleGroup.trim()
    const equipment = newExerciseEquipment.trim()

    if (!name || !primaryMuscleGroup) return

    const exercise: Omit<Exercise, 'id'> = {
      name,
      primaryMuscleGroup,
      ...(equipment && { equipment }),
    }

    setIsCreatingExercise(true)
    setCreateExerciseError(null)
    try {
      const savedExercise = await onExerciseCreated(exercise)
      setExerciseDrafts((current) => [...current, createExerciseDraft(savedExercise.id)])
      setExerciseToAddId(savedExercise.id)
      setNewExerciseName('')
      setNewExerciseMuscleGroup('')
      setNewExerciseEquipment('')
      setIsAddingExercise(false)
    } catch (error) {
      setCreateExerciseError(
        error instanceof Error ? error.message : 'Could not save this exercise.',
      )
    } finally {
      setIsCreatingExercise(false)
    }
  }

  function removeExercise(draftId: string) {
    setExerciseDrafts((current) => current.filter((exercise) => exercise.id !== draftId))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (completedSetCount === 0 || isSaving) return

    const workout: WorkoutSubmission = {
      ...(selectedRoutineId && selectedRoutineId !== 'custom' && { routineId: selectedRoutineId }),
      ...(workoutNote.trim() && { notes: workoutNote.trim() }),
      exercises: exerciseDrafts.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        sets: exercise.sets.filter((set) => set.completed).map(toWorkoutSet),
      })).filter((exercise) => exercise.sets.length > 0),
    }

    setIsSaving(true)
    setSaveError(null)
    try {
      await onWorkoutSaved(workout)
      setSelectedRoutineId(null)
      setExerciseDrafts([])
      setWorkoutNote('')
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save this workout.')
    } finally {
      setIsSaving(false)
    }
  }

  function handleCancel() {
    setSelectedRoutineId(null)
    setExerciseDrafts([])
    setIsAddingExercise(false)
    setWorkoutNote('')
  }

  if (selectedRoutineId === null) {
    return (
      <>
        <header className="page-header">
          <div>
            <p className="eyebrow">READY WHEN YOU ARE</p>
            <h1>What are we training today?</h1>
            <p className="page-intro">Choose a workout and your planned exercises will be ready to log.</p>
          </div>
        </header>

        <div className="routine-grid">
          {routines.map((routine) => (
            <button
              className="routine-card"
              key={routine.id}
              type="button"
              onClick={() => startRoutine(routine)}
            >
              <span className="routine-focus">{routine.muscleGroups.join(' + ')}</span>
              <strong>{routine.name}</strong>
              <span className="routine-exercise-count">
                {routine.exercises.length} planned exercises
              </span>
              <span className="routine-action">Start workout <span aria-hidden="true">→</span></span>
            </button>
          ))}
          <button className="routine-card custom-routine-card" type="button" onClick={startCustomWorkout}>
            <span className="routine-focus">MAKE IT YOURS</span>
            <strong>Custom workout</strong>
            <span className="routine-exercise-count">Choose your own exercises</span>
            <span className="routine-action">Build workout <span aria-hidden="true">→</span></span>
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{selectedRoutine ? 'PLANNED WORKOUT' : 'CUSTOM WORKOUT'}</p>
          <h1>{selectedRoutine?.name ?? 'Custom workout'}</h1>
          <p className="page-intro">Your exercises are ready. Enter the sets you actually performed.</p>
        </div>
        <button className="text-button" type="button" onClick={handleCancel}>
          Change workout
        </button>
      </header>

      <form className="workout-form" onSubmit={handleSubmit}>
        <div className="exercise-draft-list">
          {exerciseDrafts.map((exerciseDraft, exerciseIndex) => {
            const exercise = exercises.find((item) => item.id === exerciseDraft.exerciseId)

            return (
              <article className="exercise-draft-card" key={exerciseDraft.id}>
                <div className="exercise-draft-heading">
                  <div>
                    <span className="exercise-number">Exercise {exerciseIndex + 1}</span>
                    {!exerciseDraft.canChangeExercise && exercise && (
                      <h2 className="planned-exercise-name">{exercise.name}</h2>
                    )}
                  </div>
                  <button
                    className="text-button remove-exercise-button"
                    type="button"
                    onClick={() => removeExercise(exerciseDraft.id)}
                    disabled={exerciseDrafts.length === 1}
                    aria-label={'Remove exercise ' + (exerciseIndex + 1)}
                  >
                    Remove
                  </button>
                </div>

                {exerciseDraft.canChangeExercise ? (
                  <>
                    <label className="field-label" htmlFor={'exercise-select-' + exerciseIndex}>Exercise</label>
                    <select
                      id={'exercise-select-' + exerciseIndex}
                      className="form-control exercise-select"
                      value={exerciseDraft.exerciseId}
                      onChange={(event) =>
                        setExerciseDrafts((current) =>
                          current.map((draft) =>
                            draft.id === exerciseDraft.id
                              ? { ...draft, exerciseId: event.target.value }
                              : draft,
                          ),
                        )
                      }
                      required
                    >
                      {exercises.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} · {item.primaryMuscleGroup}
                        </option>
                      ))}
                    </select>
                  </>
                ) : (
                  <p className="exercise-focus">{exercise?.primaryMuscleGroup}</p>
                )}

                <div className="sets-heading">
                  <span className="field-label">Your sets</span>
                  <span className="sets-hint">Log what you completed</span>
                </div>

                <div className="set-list">
                  {exerciseDraft.sets.map((draft, setIndex) => (
                    <fieldset className="set-row" key={draft.id}>
                      <legend>Set {setIndex + 1}</legend>
                      <label>
                        <span>Reps</span>
                        <input
                          className="form-control"
                          type="number"
                          min="1"
                          step="1"
                          inputMode="numeric"
                          required={draft.completed}
                          value={draft.reps}
                          onChange={(event) => updateSetDraft(exerciseDraft.id, draft.id, { reps: event.target.value })}
                        />
                      </label>
                      <label>
                        <span>Weight (kg)</span>
                        <input
                          className="form-control"
                          type="number"
                          min="0"
                          step="0.5"
                          inputMode="decimal"
                          required={draft.completed}
                          value={draft.weight}
                          onChange={(event) => updateSetDraft(exerciseDraft.id, draft.id, { weight: event.target.value })}
                        />
                      </label>
                      <button
                        className="remove-set-button"
                        type="button"
                        aria-label={'Remove set ' + (setIndex + 1)}
                        onClick={() =>
                          setExerciseDrafts((current) =>
                            current.map((item) =>
                              item.id === exerciseDraft.id
                                ? { ...item, sets: item.sets.filter((set) => set.id !== draft.id) }
                                : item,
                            ),
                          )
                        }
                        disabled={exerciseDraft.sets.length === 1}
                      >
                        ×
                      </button>
                      <label className="set-complete-control">
                        <input
                          type="checkbox"
                          checked={draft.completed}
                          onChange={(event) => updateSetDraft(exerciseDraft.id, draft.id, { completed: event.target.checked })}
                          aria-label={`Mark set ${setIndex + 1} complete`}
                        />
                        <span>Done</span>
                      </label>
                    </fieldset>
                  ))}
                </div>

                <button
                  className="add-set-button"
                  type="button"
                  onClick={() =>
                    setExerciseDrafts((current) =>
                      current.map((item) =>
                        item.id === exerciseDraft.id
                          ? { ...item, sets: [...item.sets, createEmptySet()] }
                          : item,
                      ),
                    )
                  }
                >
                  + Add set
                </button>
              </article>
            )
          })}
        </div>

        <div className="exercise-add-row">
          <label>
            <span className="field-label">Add an exercise</span>
            <select
              className="form-control"
              value={exerciseToAddId}
              onChange={(event) => setExerciseToAddId(event.target.value)}
            >
              {exercises.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name} · {exercise.primaryMuscleGroup}
                </option>
              ))}
            </select>
          </label>
          <button
            className="secondary-button"
            type="button"
            onClick={addExerciseToWorkout}
            disabled={!exerciseToAddId}
          >
            + Add exercise
          </button>
        </div>

        {isAddingExercise ? (
          <div className="exercise-create-panel" aria-labelledby="add-exercise-title">
            <div className="exercise-create-heading">
              <div>
                <p className="eyebrow">YOUR EXERCISE LIST</p>
                <h2 id="add-exercise-title">Add a custom exercise</h2>
              </div>
              <button className="text-button" type="button" onClick={() => setIsAddingExercise(false)}>
                Cancel
              </button>
            </div>
            <div className="exercise-create-fields">
              <label>
                <span className="field-label">Exercise name</span>
                <input
                  className="form-control"
                  type="text"
                  value={newExerciseName}
                  onChange={(event) => setNewExerciseName(event.target.value)}
                  placeholder="e.g. Bulgarian split squat"
                  required
                />
              </label>
              <label>
                <span className="field-label">Primary muscle group</span>
                <input
                  className="form-control"
                  type="text"
                  value={newExerciseMuscleGroup}
                  onChange={(event) => setNewExerciseMuscleGroup(event.target.value)}
                  placeholder="e.g. Legs"
                  required
                />
              </label>
              <label>
                <span className="field-label">Equipment <small>optional</small></span>
                <input
                  className="form-control"
                  type="text"
                  value={newExerciseEquipment}
                  onChange={(event) => setNewExerciseEquipment(event.target.value)}
                  placeholder="e.g. Dumbbell"
                />
              </label>
            </div>
            {createExerciseError && <p role="alert">Exercise was not saved: {createExerciseError}</p>}
            <button
              className="add-set-button"
              type="button"
              onClick={addCustomExercise}
              disabled={!newExerciseName.trim() || !newExerciseMuscleGroup.trim() || isCreatingExercise}
            >
              {isCreatingExercise ? 'Saving exercise…' : '+ Create and add to workout'}
            </button>
          </div>
        ) : (
          <button className="add-set-button add-exercise-trigger" type="button" onClick={() => setIsAddingExercise(true)}>
            + Create a custom exercise
          </button>
        )}

        <label className="workout-note-field">
          <span className="field-label">Workout note <small>optional</small></span>
          <textarea
            className="form-control"
            rows={2}
            value={workoutNote}
            onChange={(event) => setWorkoutNote(event.target.value)}
            placeholder="Anything to remember?"
          />
        </label>

        {saveError && <p role="alert">Workout was not saved: {saveError}</p>}

        <div className="form-actions">
          <button className="text-button cancel-workout-button" type="button" onClick={handleCancel}>
            Cancel workout
          </button>
          <button className="primary-button" type="submit" disabled={completedSetCount === 0 || isSaving}>
            {isSaving ? 'Saving…' : 'Finish workout'}
          </button>
        </div>
      </form>
    </>
  )
}

export default WorkoutPage
