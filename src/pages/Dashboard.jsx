import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import { useDashboardData } from '../hooks/useDashboardData.js'
import { getRiskLabel } from '../services/riskEngine.js'
import { RISK_COLORS } from '../config/dhis2.js'
import RiskDistributionChart from '../charts/RiskDistributionChart.jsx'
import CompletionBarChart from '../charts/CompletionBarChart.jsx'
import styles from './DataPage.module.css'

function levelClass(level) {
  if (level === 'high') return styles.badgeHigh
  if (level === 'moderate') return styles.badgeModerate
  return styles.badgeNormal
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { stats, loading, error } = useDashboardData()

  if (loading) {
    return <div className={styles.page}><div className={styles.empty}>Loading dashboard...</div></div>
  }

  if (error) {
    return <div className={styles.page}><div className={styles.alertBox}>Failed to load dashboard: {error.message}</div></div>
  }

  const s = stats || {
    total: 0,
    highRisk: 0,
    moderate: 0,
    normal: 0,
    totalVisits: 0,
    avgVisits: '0',
    completionRate: 0,
    riskDistribution: [],
    monthlyTrend: [],
    completionStages: [],
    alertPatients: [],
  }

  const highPct = s.total > 0 ? Math.round((s.highRisk / s.total) * 100) : 0
  const modPct = s.total > 0 ? Math.round((s.moderate / s.total) * 100) : 0

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Maternal Health Dashboard</h1>
          <p className={styles.subtitle}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        {s.total === 0 && <span className={`${styles.chip} ${styles.badgeNormal}`}>No patients yet</span>}
      </div>

      <div className={styles.kpiGrid}>
        <div className={styles.kpi}>
          <p className={styles.kpiLabel}>Total pregnancies</p>
          <p className={styles.kpiValue}>{s.total}</p>
          <p className={styles.kpiSub}>{s.totalVisits} total ANC visits</p>
        </div>
        <div className={styles.kpi}>
          <p className={styles.kpiLabel}>High risk</p>
          <p className={styles.kpiValue}>{s.highRisk}</p>
          <p className={styles.kpiSub}>{highPct}% of total</p>
        </div>
        <div className={styles.kpi}>
          <p className={styles.kpiLabel}>Moderate risk</p>
          <p className={styles.kpiValue}>{s.moderate}</p>
          <p className={styles.kpiSub}>{modPct}% of total</p>
        </div>
        <div className={styles.kpi}>
          <p className={styles.kpiLabel}>ANC completion</p>
          <p className={styles.kpiValue}>{s.completionRate}%</p>
          <p className={styles.kpiSub}>Avg {s.avgVisits} visits/patient</p>
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>Risk distribution</h3>
          <p className={styles.panelSub}>Current pregnancy risk breakdown</p>
          {s.total === 0 ? (
            <div className={styles.empty}>No data yet</div>
          ) : (
            <RiskDistributionChart data={s.riskDistribution} total={s.total} height={220} />
          )}
        </div>

        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>Monthly ANC visits</h3>
          <p className={styles.panelSub}>Total and high-risk visits - last 12 months</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={s.monthlyTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Legend iconSize={9} />
              <Line type="monotone" dataKey="visits" name="Total visits" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3, fill: '#2563eb', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="high" name="High-risk visits" stroke="#dc2626" strokeWidth={2} dot={{ r: 3, fill: '#dc2626', strokeWidth: 0 }} strokeDasharray="4 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>ANC completion by stage</h3>
          <p className={styles.panelSub}>Percent meeting WHO visit targets</p>
          <CompletionBarChart data={s.completionStages} height={210} />
        </div>

        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>High-risk patient alerts</h3>
          <p className={styles.panelSub}>Patients requiring immediate or elevated care</p>
          {s.alertPatients.length === 0 ? (
            <div className={styles.empty}>No high-risk patients</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Patient</th>
                    <th className={styles.th}>Risk</th>
                    <th className={styles.th}>Score</th>
                    <th className={styles.th}>Last visit</th>
                  </tr>
                </thead>
                <tbody>
                  {s.alertPatients.map(p => (
                    <tr key={p.teiUid} className={styles.trClickable} onClick={() => navigate(`/patients/${p.teiUid}`)}>
                      <td className={styles.td}>
                        <strong>{p.name}</strong>
                        <div className={styles.muted}>Age {p.age ?? '-'}</div>
                      </td>
                      <td className={styles.td}>
                        <span className={`${styles.chip} ${levelClass(p.assessment.level)}`}>
                          {getRiskLabel(p.assessment.level)}
                        </span>
                      </td>
                      <td className={styles.td}>{p.assessment.score} pts</td>
                      <td className={styles.td}>
                        {p.lastVisit
                          ? new Date(p.lastVisit).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: 10 }}>
            <button className={styles.btn} onClick={() => navigate('/alerts')}>View all alerts</button>
          </div>
        </div>
      </div>
    </div>
  )
}
