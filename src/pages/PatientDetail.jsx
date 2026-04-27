import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { usePatients } from '../hooks/usePatients.js'
import { useVisits } from '../hooks/useVisits.js'
import { assessRisk, getRiskLabel } from '../services/riskEngine.js'
import { RISK_COLORS } from '../config/dhis2.js'
import styles from './DataPage.module.css'

function levelClass(level) {
  if (level === 'high') return styles.badgeHigh
  if (level === 'moderate') return styles.badgeModerate
  return styles.badgeNormal
}

export default function PatientDetail() {
  const { teiUid } = useParams()
  const navigate = useNavigate()

  const { patients, loading: pLoading, error: pError } = usePatients()
  const { visits, chartData, loading: vLoading, error: vError } = useVisits(teiUid)

  const loading = pLoading || vLoading
  const error = pError || vError
  const patient = patients.find(p => p.teiUid === teiUid)

  if (loading) {
    return <div className={styles.page}><div className={styles.empty}>Loading patient...</div></div>
  }

  if (error) {
    return (
      <div className={styles.page}>
        <button className={styles.btn} onClick={() => navigate('/patients')}>Back</button>
        <div className={styles.alertBox}>Failed to load patient details: {error.message}</div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className={styles.page}>
        <button className={styles.btn} onClick={() => navigate('/patients')}>Back</button>
        <div className={styles.empty}>Patient not found.</div>
      </div>
    )
  }

  const latestVisit = visits[visits.length - 1] ?? null

  const assessment = assessRisk(
    { age: patient.age, parity: patient.parity, previousComplications: patient.prevComp },
    {
      totalVisits: visits.length,
      currentWeek: latestVisit?.gestationalAge ?? 0,
      firstVisitWeek: visits[0]?.gestationalAge,
      latestBpSystolic: latestVisit?.bpSystolic,
      latestBpDiastolic: latestVisit?.bpDiastolic,
      latestHaemoglobin: latestVisit?.haemoglobin,
      latestMalariaResult: latestVisit?.malariaResult,
      dangerSigns: latestVisit?.dangerSigns ?? [],
    }
  )

  const cfg = RISK_COLORS[assessment.level]

  return (
    <div className={styles.page}>
      <button className={styles.btn} onClick={() => navigate('/patients')}>Back to patients</button>

      <div className={styles.panel} style={{ marginTop: 10, borderColor: cfg.border, background: cfg.light }}>
        <div className={styles.header} style={{ marginBottom: 0 }}>
          <div>
            <h1 className={styles.title}>{patient.name}</h1>
            <p className={styles.subtitle}>Age {patient.age ?? '-'} - {visits.length} visit{visits.length !== 1 ? 's' : ''}</p>
          </div>
          <div>
            <span className={`${styles.chip} ${levelClass(assessment.level)}`}>{getRiskLabel(assessment.level)}</span>
            <span className={`${styles.chip} ${levelClass(assessment.level)}`} style={{ marginLeft: 6 }}>Score: {assessment.score}</span>
            <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ marginLeft: 8 }} onClick={() => navigate(`/visit/${patient.teiUid}`)}>Record visit</button>
          </div>
        </div>
      </div>

      {assessment.level !== 'normal' && assessment.flags.length > 0 && (
        <div className={styles.alertBox} style={{ marginTop: 10 }}>
          {getRiskLabel(assessment.level)} - {assessment.flags.length} risk factor{assessment.flags.length > 1 ? 's' : ''} identified
          <div style={{ marginTop: 6 }}>{assessment.flags.join(', ')}</div>
        </div>
      )}

      <div className={styles.split}>
        <div>
          <div className={styles.panel} style={{ marginBottom: 10 }}>
            <h3 className={styles.panelTitle}>Patient information</h3>
            <div className={styles.smallList}>
              <div className={styles.smallRow}><span>Village</span><strong>{patient.village || '-'}</strong></div>
              <div className={styles.smallRow}><span>Phone</span><strong>{patient.phoneNumber || '-'}</strong></div>
              <div className={styles.smallRow}><span>Facility</span><strong>{patient.facility || '-'}</strong></div>
              <div className={styles.smallRow}><span>Enrolled</span><strong>{patient.enrollmentDate ? new Date(patient.enrollmentDate).toLocaleDateString('en-GB') : '-'}</strong></div>
            </div>
          </div>

          <div className={styles.panel} style={{ marginBottom: 10 }}>
            <h3 className={styles.panelTitle}>Obstetric history</h3>
            <div className={styles.smallList}>
              <div className={styles.smallRow}><span>Parity</span><strong>{patient.parity ?? '-'}</strong></div>
              <div className={styles.smallRow}><span>Previous complications</span><strong>{patient.prevComp || 'None'}</strong></div>
              <div className={styles.smallRow}><span>Total ANC visits</span><strong>{visits.length}</strong></div>
              <div className={styles.smallRow}><span>Current GA</span><strong>{latestVisit?.gestationalAge ? `${latestVisit.gestationalAge} weeks` : '-'}</strong></div>
            </div>
          </div>

          {assessment.rules.length > 0 && (
            <div className={styles.panel}>
              <h3 className={styles.panelTitle}>Recommendations</h3>
              {assessment.rules.map((r, i) => (
                <div key={i} className={styles.smallRow}><span>{i + 1}.</span><strong>{r.recommendation}</strong></div>
              ))}
            </div>
          )}
        </div>

        <div>
          {chartData.length > 0 && (
            <div className={styles.panel} style={{ marginBottom: 10 }}>
              <h3 className={styles.panelTitle}>Blood pressure trend</h3>
              <ResponsiveContainer width="100%" height={170}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[60, 180]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11 }} />
                  <ReferenceLine y={140} stroke="#dc2626" strokeDasharray="4 3" strokeWidth={1.5} />
                  <ReferenceLine y={90} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1} />
                  <Line type="monotone" dataKey="sys" name="Systolic" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 4, fill: '#dc2626', strokeWidth: 0 }} />
                  <Line type="monotone" dataKey="dia" name="Diastolic" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {chartData.length > 0 && (
            <div className={styles.panel} style={{ marginBottom: 10 }}>
              <h3 className={styles.panelTitle}>Haemoglobin trend</h3>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[5, 16]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11 }} />
                  <ReferenceLine y={11} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1.5} />
                  <Line type="monotone" dataKey="hb" name="Haemoglobin" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className={styles.panel}>
            <h3 className={styles.panelTitle}>Visit history</h3>
            {visits.length === 0 ? (
              <div className={styles.empty}>
                No ANC visits recorded yet.
                <div style={{ marginTop: 8 }}>
                  <button className={styles.btn} onClick={() => navigate(`/visit/${patient.teiUid}`)}>Record first visit</button>
                </div>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th}>Visit</th>
                      <th className={styles.th}>Date</th>
                      <th className={styles.th}>GA</th>
                      <th className={styles.th}>BP</th>
                      <th className={styles.th}>Hb</th>
                      <th className={styles.th}>Weight</th>
                      <th className={styles.th}>Malaria</th>
                      <th className={styles.th}>Danger signs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...visits].reverse().map(v => (
                      <tr key={v.eventUid}>
                        <td className={styles.td}><strong>#{v.visitNumber}</strong></td>
                        <td className={styles.td}>{v.eventDate ? new Date(v.eventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '-'}</td>
                        <td className={styles.td}>{v.gestationalAge ?? '-'}</td>
                        <td className={styles.td}>{v.bpSystolic && v.bpDiastolic ? `${v.bpSystolic}/${v.bpDiastolic}` : '-'}</td>
                        <td className={styles.td}>{v.haemoglobin ?? '-'}</td>
                        <td className={styles.td}>{v.weight ? `${v.weight} kg` : '-'}</td>
                        <td className={styles.td}>{v.malariaResult?.includes('Positive') ? 'Positive' : 'Negative'}</td>
                        <td className={styles.td}>{v.dangerSigns.length === 0 ? 'None' : `${v.dangerSigns.length} sign(s)`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
