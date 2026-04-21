// src/charts/RiskDistributionChart.jsx
import React from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const DEFAULT_DATA = [
  { name: 'High risk', value: 0, color: '#dc2626' },
  { name: 'Moderate',  value: 0, color: '#d97706' },
  { name: 'Normal',    value: 0, color: '#16a34a' },
]

function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.05) return null
  const R = Math.PI / 180
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + r * Math.cos(-midAngle * R)
  const y = cy + r * Math.sin(-midAngle * R)
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export default function RiskDistributionChart({ data = DEFAULT_DATA, total = 0, height = 220 }) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={height / 2 - 20}
            innerRadius={height / 4}
            dataKey="value"
            labelLine={false}
            label={PieLabel}
            strokeWidth={2}
            stroke="#fff"
          >
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip
            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
            formatter={(value, name) => [value, name]}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div>
        {data.map(entry => {
          const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0
          return (
            <div
              key={entry.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 0',
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: entry.color, display: 'inline-block' }} />
              <span style={{ flex: 1, color: '#64748b', fontSize: 12 }}>{entry.name}</span>
              <span style={{ fontWeight: 700, color: entry.color, fontSize: 12 }}>{entry.value}</span>
              <span style={{ color: '#94a3b8', fontSize: 11, minWidth: 30, textAlign: 'right' }}>{pct}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}