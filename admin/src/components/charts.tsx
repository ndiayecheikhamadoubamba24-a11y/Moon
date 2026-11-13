import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const INK = '#6f6590'
const SERIES = '#5b3fa8' // une seule série par graphique : pas de légende, le titre la nomme

const tooltipStyle = { borderRadius: 12, border: '1px solid #e6dff5', fontFamily: 'Nunito', fontSize: 13, fontWeight: 700 }

/** Courbe sur 30 jours (une série). */
export function DailyLine({ data, label }: { data: { date: string; count: number }[]; label: string }) {
  const rows = data.map((d) => ({ ...d, day: new Date(`${d.date}T00:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) }))
  return (
    <div className="h-56" role="img" aria-label={`${label} sur 30 jours`}>
      <ResponsiveContainer>
        <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid stroke="#efeaf8" vertical={false} />
          <XAxis dataKey="day" tick={{ fill: INK, fontSize: 11 }} tickLine={false} axisLine={false} interval={6} />
          <YAxis allowDecimals={false} tick={{ fill: INK, fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, label]} labelFormatter={(l) => `Le ${l}`} cursor={{ stroke: '#d9ccf5' }} />
          <Line type="monotone" dataKey="count" stroke={SERIES} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Barres horizontales (une série), valeur directement lisible dans le tableau voisin. */
export function HBars({ data, label, unit = '' }: { data: { name: string; value: number }[]; label: string; unit?: string }) {
  return (
    <div style={{ height: Math.max(120, data.length * 40) }} role="img" aria-label={label}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap={8}>
          <XAxis type="number" hide domain={[0, 'dataMax']} />
          <YAxis type="category" dataKey="name" width={130} tick={{ fill: '#2b1858', fontSize: 12, fontWeight: 700 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}${unit}`, label]} cursor={{ fill: '#f6f2fd' }} />
          <Bar dataKey="value" fill={SERIES} radius={[0, 4, 4, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Barre de progression simple (pourcentage). */
export function Meter({ value, tone = 'purple' }: { value: number; tone?: 'purple' | 'mint' | 'pink' }) {
  const colors = { purple: 'bg-purple', mint: 'bg-mint', pink: 'bg-pink' }
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-lavender" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${colors[tone]}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}
