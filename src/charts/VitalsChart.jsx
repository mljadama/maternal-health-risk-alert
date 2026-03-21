// src/charts/VitalsChart.jsx
import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'

export default function VitalsChart({ data = [], height = 200, metric = 'bp' }) {
  if (metric === 'hb') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 16]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
          <Legend iconSize={9} formatter={v => <span style={{ fontSize: 11, color: '#64748b' }}>{v}</span>} />
          <ReferenceLine y={11} stroke="#f59e0b" strokeDasharray="4 3" label={{ value: '11 g/dL', fill: '#f59e0b', fontSize: 10 }} />
          <ReferenceLine y={7}  stroke="#dc2626" strokeDasharray="4 3" label={{ value: '7 g/dL',  fill: '#dc2626', fontSize: 10 }} />
          <Bar dataKey="hb" name="Haemoglobin (g/dL)" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  // Default: BP
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis domain={[40, 200]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
        <Legend iconSize={9} formatter={v => <span style={{ fontSize: 11, color: '#64748b' }}>{v}</span>} />
        <ReferenceLine y={140} stroke="#dc2626" strokeDasharray="4 3" label={{ value: '140', fill: '#dc2626', fontSize: 10 }} />
        <ReferenceLine y={90}  stroke="#f59e0b" strokeDasharray="4 3" label={{ value: '90',  fill: '#f59e0b', fontSize: 10 }} />
        <Bar dataKey="sys" name="Systolic"  fill="#dc2626" radius={[4, 4, 0, 0]} maxBarSize={30} />
        <Bar dataKey="dia" name="Diastolic" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={30} />
      </BarChart>
    </ResponsiveContainer>
  )
}