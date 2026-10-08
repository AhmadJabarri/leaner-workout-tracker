import type { ExerciseProgressPoint } from '../api/progress'

type ExerciseProgressChartProps = {
  exerciseName: string
  points: ExerciseProgressPoint[]
}

const chart = { width: 360, height: 210, left: 48, right: 12, top: 16, bottom: 36 }

/** Draws the backend's per-workout heaviest weight values as a small, dependency-free SVG chart. */
function ExerciseProgressChart({ exerciseName, points }: ExerciseProgressChartProps) {
  const values = points.map((point) => point.maxWeightKg)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  // A little space around the data keeps equal or nearly equal values visible.
  const padding = Math.max((maxValue - minValue) * 0.18, maxValue * 0.06, 1)
  const minScale = Math.max(0, minValue - padding)
  const maxScale = maxValue + padding
  const plotWidth = chart.width - chart.left - chart.right
  const plotHeight = chart.height - chart.top - chart.bottom
  const xFor = (index: number) => chart.left + (points.length === 1 ? plotWidth / 2 : index * plotWidth / (points.length - 1))
  const yFor = (value: number) => chart.top + ((maxScale - value) / (maxScale - minScale)) * plotHeight
  const linePoints = points.map((point, index) => `${xFor(index)},${yFor(point.maxWeightKg)}`).join(' ')
  const labelIndices = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])]
  const formatDate = (date: string) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const tickValues = [maxScale, (maxScale + minScale) / 2, minScale]

  return (
    <figure className="exercise-progress-chart">
      <figcaption>{exerciseName} · heaviest set per workout</figcaption>
      <svg className="chart-svg" viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-label={`${exerciseName} heaviest weight progression chart`}>
        {tickValues.map((value, index) => {
          const y = chart.top + index * plotHeight / 2
          return (
            <g key={index}>
              <line className="chart-grid" x1={chart.left} x2={chart.width - chart.right} y1={y} y2={y} />
              <text className="chart-axis-label" x={chart.left - 8} y={y + 4} textAnchor="end">{value.toFixed(1)}</text>
            </g>
          )
        })}
        {points.length > 1 && <polyline className="chart-line" points={linePoints} />}
        {points.map((point, index) => (
          <circle className="chart-point" key={`${point.performedAt}-${index}`} cx={xFor(index)} cy={yFor(point.maxWeightKg)} r="4">
            <title>{`${formatDate(point.performedAt)}: ${point.maxWeightKg} kg`}</title>
          </circle>
        ))}
        {labelIndices.map((index) => (
          <text className="chart-date-label" key={index} x={xFor(index)} y={chart.height - 10} textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}>
            {formatDate(points[index].performedAt)}
          </text>
        ))}
      </svg>
      <p className="chart-scale-note">The vertical scale is focused around your recorded weights (kg).</p>
    </figure>
  )
}

export default ExerciseProgressChart
