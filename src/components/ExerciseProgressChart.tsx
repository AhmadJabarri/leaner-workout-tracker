import type { ExerciseProgressPoint } from '../api/progress'

type ExerciseProgressChartProps = {
  exerciseName: string
  points: ExerciseProgressPoint[]
}

const chart = { width: 360, height: 190, left: 36, right: 12, top: 14, bottom: 28 }

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
  const bottomY = chart.top + plotHeight
  const xFor = (index: number) => chart.left + (points.length === 1 ? plotWidth / 2 : index * plotWidth / (points.length - 1))
  const yFor = (value: number) => chart.top + ((maxScale - value) / (maxScale - minScale)) * plotHeight
  const coordinates = points.map((point, index) => `${xFor(index)},${yFor(point.maxWeightKg)}`)
  const areaPath = `M${xFor(0)},${bottomY} L${coordinates.join(' L')} L${xFor(points.length - 1)},${bottomY} Z`
  const labelIndices = [...new Set([0, points.length - 1])]
  const formatDate = (date: string) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const tickValues = [maxScale, (maxScale + minScale) / 2, minScale]

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-label={`${exerciseName}: heaviest set per workout, in kg`}>
        <defs>
          <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {tickValues.map((value, index) => {
          const y = chart.top + index * plotHeight / 2
          return (
            <g key={index}>
              <line className="chart-grid" x1={chart.left} x2={chart.width - chart.right} y1={y} y2={y} />
              <text className="chart-label" x={chart.left - 6} y={y + 4} textAnchor="end">{Math.round(value)}</text>
            </g>
          )
        })}
        {points.length > 1 && <path d={areaPath} fill="url(#chart-fill)" />}
        {points.length > 1 && <polyline className="chart-line" points={coordinates.join(' ')} />}
        {points.map((point, index) => (
          <circle className="chart-point" key={`${point.performedAt}-${index}`} cx={xFor(index)} cy={yFor(point.maxWeightKg)} r="3.5">
            <title>{`${formatDate(point.performedAt)}: ${point.maxWeightKg} kg`}</title>
          </circle>
        ))}
        {labelIndices.map((index) => (
          <text
            className="chart-label"
            key={index}
            x={xFor(index)}
            y={chart.height - 8}
            textAnchor={points.length === 1 ? 'middle' : index === 0 ? 'start' : 'end'}
          >
            {formatDate(points[index].performedAt)}
          </text>
        ))}
      </svg>
      <figcaption className="muted tiny">Heaviest set per workout (kg)</figcaption>
    </figure>
  )
}

export default ExerciseProgressChart
