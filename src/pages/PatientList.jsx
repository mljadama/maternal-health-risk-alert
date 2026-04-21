import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePatients } from '../hooks/usePatients.js'
import { getRiskLabel } from '../services/riskEngine.js'
import { RISK_COLORS } from '../config/dhis2.js'
import styles from './DataPage.module.css'

function levelClass(level) {
  if (level === 'high') return styles.badgeHigh
  if (level === 'moderate') return styles.badgeModerate
  return styles.badgeNormal
}

export default function PatientList() {
  const navigate = useNavigate()
  const { patients, loading, error, refetch } = usePatients()

  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState('all')
  const [sortCol, setSortCol] = useState('name')
  const [sortDir, setSortDir] = useState('asc')

  const filtered = useMemo(() => {
    let list = [...patients]

    if (riskFilter !== 'all') {
      list = list.filter(p => p.assessment.level === riskFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.village.toLowerCase().includes(q) ||
        p.facility.toLowerCase().includes(q)
      )
    }

    list.sort((a, b) => {
      let va
      let vb
      if (sortCol === 'name') { va = a.name; vb = b.name }
      if (sortCol === 'village') { va = a.village; vb = b.village }
      if (sortCol === 'facility') { va = a.facility; vb = b.facility }
      if (sortCol === 'ga') { va = a.gestationalAge ?? 0; vb = b.gestationalAge ?? 0 }
      if (sortCol === 'visits') { va = a.totalVisits; vb = b.totalVisits }
      if (sortCol === 'risk') { va = a.assessment.score; vb = b.assessment.score }
      if (sortCol === 'last') { va = a.lastVisitDate ?? ''; vb = b.lastVisitDate ?? '' }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return list
  }, [patients, search, riskFilter, sortCol, sortDir])

  function handleSort(col) {
    if (sortCol === col) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortCol(col); setSortDir('asc') }
  }

  const counts = {
    all: patients.length,
    high: patients.filter(p => p.assessment.level === 'high').length,
    moderate: patients.filter(p => p.assessment.level === 'moderate').length,
    normal: patients.filter(p => p.assessment.level === 'normal').length,
  }

  if (loading) {
    return <div className={styles.page}><div className={styles.empty}>Loading patients...</div></div>
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.alertBox}>Failed to load patients: {error.message}</div>
        <button className={styles.btn} onClick={refetch}>Retry</button>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Patients</h1>
          <p className={styles.subtitle}>{patients.length} registered - {counts.high} high risk - {counts.moderate} moderate</p>
        </div>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => navigate('/register')}>Register patient</button>
      </div>

      <div className={styles.toolbar}>
        {[
          { key: 'all', label: `All (${counts.all})` },
          { key: 'high', label: `High (${counts.high})` },
          { key: 'moderate', label: `Moderate (${counts.moderate})` },
          { key: 'normal', label: `Normal (${counts.normal})` },
        ].map(f => (
          <button
            key={f.key}
            className={`${styles.btn} ${riskFilter === f.key ? styles.btnPrimary : ''}`}
            onClick={() => setRiskFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className={styles.toolbar}>
        <input
          className={styles.input}
          style={{ minWidth: 260 }}
          placeholder="Search name, village or facility"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.panel}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}><button className={styles.btn} onClick={() => handleSort('name')}>Patient</button></th>
                <th className={styles.th}><button className={styles.btn} onClick={() => handleSort('village')}>Village</button></th>
                <th className={styles.th}><button className={styles.btn} onClick={() => handleSort('facility')}>Facility</button></th>
                <th className={styles.th}><button className={styles.btn} onClick={() => handleSort('ga')}>GA</button></th>
                <th className={styles.th}><button className={styles.btn} onClick={() => handleSort('visits')}>Visits</button></th>
                <th className={styles.th}><button className={styles.btn} onClick={() => handleSort('risk')}>Risk</button></th>
                <th className={styles.th}><button className={styles.btn} onClick={() => handleSort('last')}>Last visit</button></th>
                <th className={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td className={styles.td} colSpan={8}>
                    <div className={styles.empty}>
                      {patients.length === 0
                        ? 'No patients registered yet. Register your first patient.'
                        : `No patients match ${search}`}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(p => {
                  const cfg = RISK_COLORS[p.assessment.level]
                  return (
                    <tr key={p.teiUid} className={styles.trClickable} onClick={() => navigate(`/patients/${p.teiUid}`)} style={{ borderLeft: `3px solid ${cfg.main}` }}>
                      <td className={styles.td}>
                        <strong>{p.name}</strong>
                        <div className={styles.muted}>Age {p.age ?? '-'} - {p.phoneNumber}</div>
                      </td>
                      <td className={styles.td}>{p.village}</td>
                      <td className={styles.td}>{p.facility}</td>
                      <td className={styles.td}>{p.gestationalAge ? `${p.gestationalAge} wks` : '-'}</td>
                      <td className={styles.td}>{p.totalVisits}</td>
                      <td className={styles.td}>
                        <span className={`${styles.chip} ${levelClass(p.assessment.level)}`}>{getRiskLabel(p.assessment.level)}</span>
                      </td>
                      <td className={styles.td}>
                        {p.lastVisitDate
                          ? new Date(p.lastVisitDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
                          : '-'}
                      </td>
                      <td className={styles.td}>
                        <button className={styles.btn} onClick={e => { e.stopPropagation(); navigate(`/visit/${p.teiUid}`) }}>Visit</button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 8 }} className={styles.muted}>
          Showing {filtered.length} of {patients.length} patients
        </div>
      </div>
    </div>
  )
}
