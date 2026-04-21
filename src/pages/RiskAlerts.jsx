import React, { useMemo, useState } from 'react'
import { useAlerts } from '../hooks/useAlerts.js'
import { getRiskLabel } from '../services/riskEngine.js'
import { RISK_COLORS } from '../config/dhis2.js'
import styles from './DataPage.module.css'

function levelClass(level) {
  if (level === 'high') return styles.badgeHigh
  if (level === 'moderate') return styles.badgeModerate
  return styles.badgeNormal
}

function DetailPanel({ patient, assessment }) {
  return (
    <div className={styles.panel} style={{ marginTop: 8, background: '#f8fafc' }}>
      <div className={styles.row3}>
        <div>
          <h4 className={styles.panelTitle}>Contact</h4>
          <div className={styles.smallList}>
            <div className={styles.smallRow}><span>Phone</span><strong>{patient.phone || '-'}</strong></div>
            <div className={styles.smallRow}><span>Village</span><strong>{patient.village || '-'}</strong></div>
            <div className={styles.smallRow}><span>Facility</span><strong>{patient.facility || '-'}</strong></div>
          </div>
        </div>
        <div>
          <h4 className={styles.panelTitle}>Clinical</h4>
          <div className={styles.smallList}>
            <div className={styles.smallRow}><span>GA</span><strong>{patient.gestationalAge ? `${patient.gestationalAge} wks` : '-'}</strong></div>
            <div className={styles.smallRow}><span>BP</span><strong>{patient.latestBpSystolic ? `${patient.latestBpSystolic}/${patient.latestBpDiastolic}` : '-'}</strong></div>
            <div className={styles.smallRow}><span>Hb</span><strong>{patient.latestHaemoglobin ? `${patient.latestHaemoglobin} g/dL` : '-'}</strong></div>
            <div className={styles.smallRow}><span>Malaria</span><strong>{patient.latestMalariaResult || '-'}</strong></div>
            <div className={styles.smallRow}><span>Visits</span><strong>{patient.totalVisits}</strong></div>
          </div>
        </div>
        <div>
          <h4 className={styles.panelTitle}>Risk flags</h4>
          {assessment.flags.length === 0 ? (
            <p className={styles.muted}>No specific flags</p>
          ) : (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {assessment.flags.map((f, i) => (
                <span key={`${f}-${i}`} className={`${styles.chip} ${levelClass(assessment.level)}`}>{f}</span>
              ))}
            </div>
          )}

          {assessment.rules && assessment.rules.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <h4 className={styles.panelTitle}>Recommended actions</h4>
              {assessment.rules.map((r, i) => (
                <div key={i} className={styles.smallRow}><span>{i + 1}.</span><strong>{r.recommendation}</strong></div>
              ))}
            </div>
          )}
        </div>
      </div>

      {patient.nurseNotes && (
        <div style={{ marginTop: 10 }}>
          <h4 className={styles.panelTitle}>Nurse notes</h4>
          <p className={styles.muted}>"{patient.nurseNotes}"</p>
        </div>
      )}
    </div>
  )
}

export default function RiskAlerts() {
  const { alerts, loading, error } = useAlerts()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [orderBy, setOrderBy] = useState('score')
  const [orderDir, setOrderDir] = useState('desc')
  const [openMap, setOpenMap] = useState({})

  const highCount = alerts.filter(a => a.assessment.level === 'high').length
  const modCount = alerts.filter(a => a.assessment.level === 'moderate').length

  const filtered = useMemo(() => {
    let list = [...alerts]
    if (filter !== 'all') list = list.filter(a => a.assessment.level === filter)

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.village.toLowerCase().includes(q) ||
        a.facility.toLowerCase().includes(q)
      )
    }

    list.sort((a, b) => {
      let va
      let vb
      if (orderBy === 'score') { va = a.assessment.score; vb = b.assessment.score }
      if (orderBy === 'name') { va = a.name; vb = b.name }
      if (orderBy === 'visit') { va = a.lastVisitDate || ''; vb = b.lastVisitDate || '' }
      if (orderBy === 'village') { va = a.village; vb = b.village }
      if (orderBy === 'facility') { va = a.facility; vb = b.facility }
      if (va < vb) return orderDir === 'asc' ? -1 : 1
      if (va > vb) return orderDir === 'asc' ? 1 : -1
      return 0
    })

    return list
  }, [alerts, search, filter, orderBy, orderDir])

  function sort(col) {
    if (orderBy === col) setOrderDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setOrderBy(col); setOrderDir('desc') }
  }

  function toggleRow(id) {
    setOpenMap(prev => ({ ...prev, [id]: !prev[id] }))
  }

  if (loading) {
    return <div className={styles.page}><div className={styles.empty}>Loading risk alerts...</div></div>
  }

  if (error) {
    return <div className={styles.page}><div className={styles.alertBox}>Failed to load alerts: {error.message}</div></div>
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Risk Alerts</h1>
          <p className={styles.subtitle}>Pregnant women requiring elevated monitoring or immediate action</p>
        </div>
      </div>

      <div className={styles.kpiGrid} style={{ marginBottom: 10 }}>
        <div className={styles.kpi}>
          <p className={styles.kpiLabel}>Total alerts</p>
          <p className={styles.kpiValue}>{alerts.length}</p>
          <p className={styles.kpiSub}>patients flagged for review</p>
        </div>
        <div className={styles.kpi} style={{ borderColor: '#fecaca', background: '#fef2f2' }}>
          <p className={styles.kpiLabel}>High risk</p>
          <p className={styles.kpiValue} style={{ color: '#dc2626' }}>{highCount}</p>
          <p className={styles.kpiSub}>immediate attention needed</p>
        </div>
        <div className={styles.kpi} style={{ borderColor: '#fde68a', background: '#fffbeb' }}>
          <p className={styles.kpiLabel}>Moderate risk</p>
          <p className={styles.kpiValue} style={{ color: '#d97706' }}>{modCount}</p>
          <p className={styles.kpiSub}>increased monitoring needed</p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <input
          className={styles.input}
          style={{ minWidth: 260 }}
          placeholder="Search name, village or facility"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <button className={`${styles.btn} ${filter === 'all' ? styles.btnPrimary : ''}`} onClick={() => setFilter('all')}>All ({alerts.length})</button>
        <button className={`${styles.btn} ${filter === 'high' ? styles.btnPrimary : ''}`} onClick={() => setFilter('high')}>High ({highCount})</button>
        <button className={`${styles.btn} ${filter === 'moderate' ? styles.btnPrimary : ''}`} onClick={() => setFilter('moderate')}>Moderate ({modCount})</button>
      </div>

      <div className={styles.panel}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th} />
                <th className={styles.th}><button className={styles.btn} onClick={() => sort('name')}>Patient</button></th>
                <th className={styles.th}><button className={styles.btn} onClick={() => sort('village')}>Village</button></th>
                <th className={styles.th}><button className={styles.btn} onClick={() => sort('facility')}>Facility</button></th>
                <th className={styles.th}><button className={styles.btn} onClick={() => sort('score')}>Risk</button></th>
                <th className={styles.th}><button className={styles.btn} onClick={() => sort('visit')}>Latest visit</button></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td className={styles.td} colSpan={6}><div className={styles.empty}>{alerts.length === 0 ? 'No high-risk patients detected' : `No results for ${search}`}</div></td></tr>
              ) : filtered.map(p => {
                const open = !!openMap[p.teiUid]
                const cfg = RISK_COLORS[p.assessment.level]
                return (
                  <React.Fragment key={p.teiUid}>
                    <tr className={styles.trClickable} style={{ borderLeft: `4px solid ${cfg.main}`, background: open ? cfg.light : '#fff' }} onClick={() => toggleRow(p.teiUid)}>
                      <td className={styles.td}>{open ? '▲' : '▼'}</td>
                      <td className={styles.td}><strong>{p.name}</strong><div className={styles.muted}>Age {p.age ?? '-'} - GA {p.gestationalAge ?? '-'} wks</div></td>
                      <td className={styles.td}>{p.village}</td>
                      <td className={styles.td}>{p.facility}</td>
                      <td className={styles.td}>
                        <span className={`${styles.chip} ${levelClass(p.assessment.level)}`}>{getRiskLabel(p.assessment.level)}</span>
                        <div className={styles.muted}>{p.assessment.score} pts</div>
                      </td>
                      <td className={styles.td}>
                        {p.lastVisitDate
                          ? new Date(p.lastVisitDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
                          : '-'}
                        <div className={styles.muted}>{p.totalVisits} visit{p.totalVisits !== 1 ? 's' : ''}</div>
                      </td>
                    </tr>
                    {open && (
                      <tr>
                        <td className={styles.td} colSpan={6}><DetailPanel patient={p} assessment={p.assessment} /></td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className={styles.muted} style={{ marginTop: 8 }}>
          Showing {filtered.length} of {alerts.length} alerts - click any row to expand details
        </div>
      </div>
    </div>
  )
}
