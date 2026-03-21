// src/hooks/useDashboardData.js
// ─────────────────────────────────────────────────────────────────────────────
// Fetches all data needed for the maternal health dashboard from DHIS2.
//
// API calls made:
//   GET /api/trackedEntityInstances  → all enrolled women
//   GET /api/events                  → all ANC visit events
//
// Then runs the risk engine client-side to produce aggregated stats.
// ─────────────────────────────────────────────────────────────────────────────

import { useDataQuery } from '@dhis2/app-runtime'
import { useMemo }      from 'react'
import { assessRisk, RISK_LEVELS } from '../services/riskEngine.js'
import { PROGRAM, PROGRAM_STAGE, DATA_ELEMENTS } from '../config/dhis2.js'

// ── DHIS2 queries ─────────────────────────────────────────────────────────────

const TEI_QUERY = {
  patients: {
    resource: 'trackedEntityInstances',
    params: {
      program:      PROGRAM.id,
      fields:       'trackedEntityInstance,attributes,enrollments',
      ouMode:       'ACCESSIBLE',
      paging:       false,
    },
  },
}

const EVENTS_QUERY = {
  events: {
    resource: 'events',
    params: {
      program:      PROGRAM.id,
      programStage: PROGRAM_STAGE.id,
      fields:       'event,trackedEntityInstance,eventDate,dataValues',
      ouMode:       'ACCESSIBLE',
      paging:       false,
    },
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract a data value from a DHIS2 event by data element UID */
function getDV(dataValues = [], deUid) {
  return dataValues.find(dv => dv.dataElement === deUid)?.value ?? null
}

/** Extract a TEI attribute value by attribute UID */
function getAttr(attributes = [], attrUid) {
  return attributes.find(a => a.attribute === attrUid)?.value ?? null
}

/**
 * Build a 12-month rolling monthly visits array for the trend chart.
 * Returns [{ month: 'Jan', visits: 12, highRisk: 3 }, ...]
 */
function buildMonthlyTrend(events) {
  const buckets = {}
  const now     = new Date()

  for (let i = 11; i >= 0; i--) {
    const d     = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
    buckets[key] = { month: label, visits: 0, highRisk: 0 }
  }

  events.forEach(ev => {
    const key = ev.eventDate?.slice(0, 7)
    if (buckets[key]) {
      buckets[key].visits += 1
      const sys = Number(getDV(ev.dataValues, DATA_ELEMENTS.bpSystolic))
      const dia = Number(getDV(ev.dataValues, DATA_ELEMENTS.bpDiastolic))
      const hb  = Number(getDV(ev.dataValues, DATA_ELEMENTS.haemoglobin))
      if ((sys >= 140 || dia >= 90) || hb < 7) {
        buckets[key].highRisk += 1
      }
    }
  })

  return Object.values(buckets)
}

/**
 * Build week-by-week ANC visit completion data.
 * Groups patients by gestational age bracket and shows % who have
 * had the WHO-recommended number of visits for that stage.
 */
function buildCompletionByStage(patients, eventsPerTEI) {
  const stages = [
    { label: '< 13 wks',  minVisits: 1 },
    { label: '13–26 wks', minVisits: 2 },
    { label: '27–36 wks', minVisits: 4 },
    { label: '37+ wks',   minVisits: 6 },
  ]

  return stages.map(stage => {
    const relevantPatients = patients.filter(p => {
      const ga = Number(p.currentWeek)
      if (stage.label === '< 13 wks')   return ga < 13
      if (stage.label === '13–26 wks')  return ga >= 13 && ga <= 26
      if (stage.label === '27–36 wks')  return ga >= 27 && ga <= 36
      if (stage.label === '37+ wks')    return ga > 36
      return false
    })

    if (relevantPatients.length === 0) return { stage: stage.label, rate: 0, count: 0 }

    const completed = relevantPatients.filter(p => {
      const visits = eventsPerTEI[p.teiUid]?.length ?? 0
      return visits >= stage.minVisits
    }).length

    return {
      stage:   stage.label,
      rate:    Math.round((completed / relevantPatients.length) * 100),
      count:   relevantPatients.length,
      target:  stage.minVisits,
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Main hook
// ─────────────────────────────────────────────────────────────────────────────

export function useDashboardData() {
  const { data: teiData,    loading: teiLoading,    error: teiError    } = useDataQuery(TEI_QUERY)
  const { data: eventData,  loading: eventLoading,  error: eventError  } = useDataQuery(EVENTS_QUERY)

  const loading = teiLoading || eventLoading
  const error   = teiError   || eventError

  const stats = useMemo(() => {
    if (!teiData || !eventData) return null

    const rawPatients = teiData.patients?.trackedEntityInstances ?? []
    const rawEvents   = eventData.events?.events ?? []

    // Index events by TEI UID
    const eventsPerTEI = {}
    rawEvents.forEach(ev => {
      const id = ev.trackedEntityInstance
      if (!eventsPerTEI[id]) eventsPerTEI[id] = []
      eventsPerTEI[id].push(ev)
    })

    // Build patient objects with latest visit data
    const patients = rawPatients.map(tei => {
      const visits    = eventsPerTEI[tei.trackedEntityInstance] ?? []
      const latest    = visits.sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate))[0]
      const firstVisit= visits.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate))[0]

      const age        = Number(getAttr(tei.attributes, DATA_ELEMENTS.age))
      const parity     = Number(getAttr(tei.attributes, DATA_ELEMENTS.parity))
      const prevComp   = getAttr(tei.attributes, DATA_ELEMENTS.previousComplications)

      const latestGA   = latest ? Number(getDV(latest.dataValues, DATA_ELEMENTS.gestationalAge)) : null
      const firstVisitGA = firstVisit
        ? Number(getDV(firstVisit.dataValues, DATA_ELEMENTS.gestationalAge)) : null

      const patient = { age, parity, previousComplications: prevComp }
      const visitData = {
        totalVisits:         visits.length,
        currentWeek:         latestGA  ?? 0,
        firstVisitWeek:      firstVisitGA ?? null,
        latestBpSystolic:    latest ? Number(getDV(latest.dataValues, DATA_ELEMENTS.bpSystolic))  : null,
        latestBpDiastolic:   latest ? Number(getDV(latest.dataValues, DATA_ELEMENTS.bpDiastolic)) : null,
        latestHaemoglobin:   latest ? Number(getDV(latest.dataValues, DATA_ELEMENTS.haemoglobin)) : null,
        latestMalariaResult: latest ? getDV(latest.dataValues, DATA_ELEMENTS.malariaTestResult)   : null,
        dangerSigns:         latest ? (getDV(latest.dataValues, DATA_ELEMENTS.dangerSigns) || '').split(',').filter(Boolean) : [],
      }

      const assessment = assessRisk(patient, visitData)

      return {
        teiUid:      tei.trackedEntityInstance,
        name:        getAttr(tei.attributes, DATA_ELEMENTS.fullName) ?? 'Unknown',
        age,
        currentWeek: latestGA ?? 0,
        totalVisits: visits.length,
        assessment,
        lastVisit:   latest?.eventDate ?? null,
        enrollment:  tei.enrollments?.[0],
      }
    })

    // ── Summary counts ───────────────────────────────────────
    const total       = patients.length
    const highRisk    = patients.filter(p => p.assessment.level === RISK_LEVELS.HIGH).length
    const moderate    = patients.filter(p => p.assessment.level === RISK_LEVELS.MODERATE).length
    const normal      = patients.filter(p => p.assessment.level === RISK_LEVELS.NORMAL).length

    const totalVisits       = rawEvents.length
    const avgVisitsPerPatient = total > 0 ? (totalVisits / total).toFixed(1) : 0
    const completionRate    = total > 0
      ? Math.round((patients.filter(p => p.totalVisits >= 4).length / total) * 100)
      : 0

    // ── Chart data ───────────────────────────────────────────
    const riskDistribution = [
      { name: 'High risk',   value: highRisk, color: '#ef4444' },
      { name: 'Moderate',    value: moderate, color: '#f59e0b' },
      { name: 'Normal',      value: normal,   color: '#22c55e' },
    ]

    const monthlyTrend    = buildMonthlyTrend(rawEvents)
    const completionStages= buildCompletionByStage(patients, eventsPerTEI)

    // Top 5 high-risk patients for alert table
    const alertPatients = patients
      .filter(p => p.assessment.level !== RISK_LEVELS.NORMAL)
      .sort((a, b) => b.assessment.score - a.assessment.score)
      .slice(0, 5)

    return {
      total,
      highRisk,
      moderate,
      normal,
      totalVisits,
      avgVisitsPerPatient,
      completionRate,
      riskDistribution,
      monthlyTrend,
      completionStages,
      alertPatients,
    }
  }, [teiData, eventData])

  return { stats, loading, error }
}