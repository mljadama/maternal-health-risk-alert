// src/charts/VisitTrendChart.jsx
import React from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

export default function VisitTrendChart({ data = [], height = 240 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
        />
        <Legend
          iconSize={9}
          formatter={v => <span style={{ fontSize: 11, color: '#64748b' }}>{v}</span>}
        />
        <Line
          type="monotone"
          dataKey="visits"
          name="Total visits"
          stroke="#2563eb"
          strokeWidth={2.5}
          dot={{ r: 3, fill: '#2563eb', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="high"
          name="High-risk visits"
          stroke="#dc2626"
          strokeWidth={2}
          strokeDasharray="4 3"
          dot={{ r: 3, fill: '#dc2626', strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}