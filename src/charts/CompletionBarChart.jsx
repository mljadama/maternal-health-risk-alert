// src/charts/CompletionBarChart.jsx
import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ResponsiveContainer,
} from 'recharts'

const barColor = rate => rate >= 80 ? '#16a34a' : rate >= 50 ? '#d97706' : '#dc2626'

export default function CompletionBarChart({ data = [], height = 200 }) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal vertical={false} />
          <XAxis
            dataKey="stage"
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `${v}%`}
          />
          <Tooltip
            formatter={(v) => [`${v}%`, 'Completion rate']}
            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
          />
          <Bar dataKey="rate" radius={[6, 6, 0, 0]} maxBarSize={56}>
            {data.map((entry, i) => (
              <Cell key={i} fill={barColor(entry.rate)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Color legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
        {[{ color: '#16a34a', label: '≥ 80% on track' },
          { color: '#d97706', label: '50–79% needs attention' },
          { color: '#dc2626', label: '< 50% critical' }].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'inline-block' }} />
            <span style={{ color: '#64748b', fontSize: 10 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}