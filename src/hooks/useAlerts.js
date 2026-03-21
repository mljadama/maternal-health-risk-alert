// src/hooks/useAlerts.js
// ─────────────────────────────────────────────────────────────────────────────
// Fetches all enrolled patients + their latest ANC visit events from DHIS2,
// runs the risk engine on each one, and returns only those flagged as
// high or moderate risk, sorted by score descending.
//
// API calls:
//   GET /api/trackedEntityInstances  → patients with attributes
//   GET /api/events                  → ANC visit records
//   GET /api/organisationUnits       → facility name lookup
// ─────────────────────────────────────────────────────────────────────────────

import { useDataQuery } from '@dhis2/app-runtime'
import { useMemo }      from 'react'
import { assessRisk, RISK_LEVELS } from '../services/riskEngine.js'
import {
  PROGRAM,
  PROGRAM_STAGE,
  ATTRIBUTES,
  DATA_ELEMENTS,
} from '../config/dhis2.js'

// ── DHIS2 queries ─────────────────────────────────────────────────────────────

const TEI_QUERY = {
  patients: {
    resource: 'trackedEntityInstances',
    params: {
      program: PROGRAM.id,
      fields:  [
        'trackedEntityInstance',
        'orgUnit',
        'attributes[attribute,value]',
        'enrollments[enrollment,enrollmentDate,orgUnit,orgUnitName]',
      ].join(','),
      ouMode:  'ACCESSIBLE',
      paging:  false,
    },
  },
}

const EVENTS_QUERY = {
  events: {
    resource: 'events',
    params: {
      program:      PROGRAM.id,
      programStage: PROGRAM_STAGE.id,
      fields:       'event,trackedEntityInstance,eventDate,orgUnit,orgUnitName,dataValues[dataElement,value]',
      ouMode:       'ACCESSIBLE',
      paging:       false,
    },
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const attr  = (list = [], uid) => list.find(a => a.attribute === uid)?.value ?? '—'
const dv    = (list = [], uid) => list.find(d => d.dataElement === uid)?.value ?? null

// ─────────────────────────────────────────────────────────────────────────────

export function useAlerts() {
  const { data: teiData,   loading: tl, error: te } = useDataQuery(TEI_QUERY)
  const { data: evtData,   loading: el, error: ee } = useDataQuery(EVENTS_QUERY)

  const loading = tl || el
  const error   = te || ee

  const alerts = useMemo(() => {
    if (!teiData || !evtData) return []

    const teis   = teiData.patients?.trackedEntityInstances ?? []
    const events = evtData.events?.events ?? []

    // Index events by TEI, sorted newest first
    const byTEI = {}
    events.forEach(ev => {
      if (!byTEI[ev.trackedEntityInstance]) byTEI[ev.trackedEntityInstance] = []
      byTEI[ev.trackedEntityInstance].push(ev)
    })
    Object.values(byTEI).forEach(arr =>
      arr.sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate))
    )

    return teis
      .map(tei => {
        const teiId      = tei.trackedEntityInstance
        const visits     = byTEI[teiId] ?? []
        const latest     = visits[0] ?? null
        const firstVisit = visits[visits.length - 1] ?? null
        const enrollment = tei.enrollments?.[0] ?? {}

        // ── Patient attributes ─────────────────────────────
        const name     = attr(tei.attributes, ATTRIBUTES.fullName)
        const age      = Number(attr(tei.attributes, ATTRIBUTES.age)) || null
        const village  = attr(tei.attributes, ATTRIBUTES.village)
        const phone    = attr(tei.attributes, ATTRIBUTES.phoneNumber)
        const parity   = Number(attr(tei.attributes, ATTRIBUTES.parity)) || 0
        const prevComp = attr(tei.attributes, ATTRIBUTES.previousComplications)

        // ── Facility name ──────────────────────────────────
        // Prefer the enrollment org unit name, fall back to latest event's
        const facility = enrollment.orgUnitName
          ?? latest?.orgUnitName
          ?? 'Unknown facility'

        // ── Latest visit data values ───────────────────────
        const latestBpSystolic    = latest ? Number(dv(latest.dataValues, DATA_ELEMENTS.bpSystolic))    : null
        const latestBpDiastolic   = latest ? Number(dv(latest.dataValues, DATA_ELEMENTS.bpDiastolic))   : null
        const latestHaemoglobin   = latest ? Number(dv(latest.dataValues, DATA_ELEMENTS.haemoglobin))   : null
        const latestMalariaResult = latest ? dv(latest.dataValues, DATA_ELEMENTS.malariaTestResult)     : null
        const gestationalAge      = latest ? Number(dv(latest.dataValues, DATA_ELEMENTS.gestationalAge)): null
        const dangerSignsRaw      = latest ? dv(latest.dataValues, DATA_ELEMENTS.dangerSigns)           : ''
        const dangerSigns         = dangerSignsRaw
          ? dangerSignsRaw.split(',').map(s => s.trim()).filter(Boolean)
          : []
        const nurseNotes          = latest ? dv(latest.dataValues, DATA_ELEMENTS.nurseNotes) : null
        const firstVisitGA        = firstVisit
          ? Number(dv(firstVisit.dataValues, DATA_ELEMENTS.gestationalAge))
          : null

        // ── Run risk engine ────────────────────────────────
        const assessment = assessRisk(
          { age, parity, previousComplications: prevComp },
          {
            totalVisits:         visits.length,
            currentWeek:         gestationalAge ?? 0,
            firstVisitWeek:      firstVisitGA,
            latestBpSystolic,
            latestBpDiastolic,
            latestHaemoglobin,
            latestMalariaResult,
            dangerSigns,
          }
        )

        return {
          teiUid:       teiId,
          name,
          age,
          village,
          phone,
          facility,
          parity,
          prevComp,
          totalVisits:  visits.length,
          gestationalAge,
          latestVisitDate: latest?.eventDate ?? null,
          nurseNotes,
          latestBpSystolic,
          latestBpDiastolic,
          latestHaemoglobin,
          latestMalariaResult,
          dangerSigns,
          assessment,
          enrollmentDate: enrollment.enrollmentDate ?? null,
        }
      })
      // Keep only high + moderate risk, sorted by score desc
      .filter(p => p.assessment.level !== RISK_LEVELS.NORMAL)
      .sort((a, b) => b.assessment.score - a.assessment.score)
  }, [teiData, evtData])

  return { alerts, loading, error }
}