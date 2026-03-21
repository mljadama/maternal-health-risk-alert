// src/hooks/useRecordVisit.js
// ─────────────────────────────────────────────────────────────
// Records an ANC visit event using the DHIS2 v42 Tracker API.
//
// DHIS2 v42 breaking change:
//   OLD (v40/v41): POST /api/events
//   NEW (v42):     POST /api/tracker  with events[] array
//
// The new endpoint accepts:
//   { events: [{ program, programStage, orgUnit,
//                trackedEntity, enrollment,
//                occurredAt, status, dataValues: [...] }] }
// ─────────────────────────────────────────────────────────────

import { useDataMutation } from '@dhis2/app-runtime'
import { PROGRAM, PROGRAM_STAGE, DATA_ELEMENTS } from '../config/dhis2.js'

// ── v42 Tracker mutation ──────────────────────────────────────
const TRACKER_EVENT_MUTATION = {
    resource: 'tracker',
    type:     'create',
    data:     ({ payload }) => payload,
}

// ─────────────────────────────────────────────────────────────

/**
 * buildEventPayload
 * ─────────────────
 * Builds v42 tracker event payload.
 *
 * POST /api/tracker
 * {
 *   events: [{
 *     program, programStage, orgUnit,
 *     trackedEntity, enrollment,
 *     occurredAt, status: "COMPLETED",
 *     dataValues: [{ dataElement, value }, ...]
 *   }]
 * }
 *
 * @param {object} formValues
 * @param {string} trackedEntity  - TEI UID
 * @param {string} enrollment     - enrollment UID
 * @param {string} orgUnit        - facility UID
 */
export function buildEventPayload(formValues, trackedEntity, enrollment, orgUnit) {
    const {
        visitDate,
        visitNumber,
        gestationalAge,
        bpSystolic,
        bpDiastolic,
        haemoglobin,
        weight,
        malariaTestResult,
        ironSupplementation,
        folicAcid,
        nurseNotes,
        dangerSigns,
        nextVisitDate,
    } = formValues

    const dangerSignsValue = Array.isArray(dangerSigns)
        ? dangerSigns.join(', ')
        : dangerSigns || ''

    const dataValues = [
        { dataElement: DATA_ELEMENTS.bpSystolic,          value: String(bpSystolic || '') },
        { dataElement: DATA_ELEMENTS.bpDiastolic,         value: String(bpDiastolic || '') },
        { dataElement: DATA_ELEMENTS.haemoglobin,         value: String(haemoglobin || '') },
        { dataElement: DATA_ELEMENTS.weight,              value: String(weight || '') },
        { dataElement: DATA_ELEMENTS.gestationalAge,      value: String(gestationalAge || '') },
        { dataElement: DATA_ELEMENTS.visitNumber,         value: String(visitNumber || 1) },
        { dataElement: DATA_ELEMENTS.malariaTestResult,   value: malariaTestResult || 'Not done' },
        { dataElement: DATA_ELEMENTS.ironSupplementation, value: ironSupplementation ? 'true' : 'false' },
        { dataElement: DATA_ELEMENTS.folicAcid,           value: folicAcid ? 'true' : 'false' },
        { dataElement: DATA_ELEMENTS.nurseNotes,          value: nurseNotes || '' },
        { dataElement: DATA_ELEMENTS.dangerSigns,         value: dangerSignsValue },
        { dataElement: DATA_ELEMENTS.nextVisitDate,       value: nextVisitDate || '' },
    ].filter(dv => dv.value !== '')

    return {
        events: [
            {
                program:      PROGRAM.id,
                programStage: PROGRAM_STAGE.id,
                orgUnit:      orgUnit,
                trackedEntity: trackedEntity,
                enrollment:   enrollment,
                occurredAt:   visitDate || new Date().toISOString().split('T')[0],
                scheduledAt:  visitDate || new Date().toISOString().split('T')[0],
                status:       'COMPLETED',
                dataValues,
            }
        ],
    }
}

// ─────────────────────────────────────────────────────────────

/**
 * useRecordVisit
 * ──────────────
 * Returns { recordVisit, loading, error, lastEventUid }
 *
 * recordVisit(formValues, teiUid, enrollmentUid, orgUnit)
 * → POST /api/tracker  →  resolves with { eventUid }
 */
export function useRecordVisit() {
    const [submitEvent, { loading, error, data }] = useDataMutation(TRACKER_EVENT_MUTATION)

    const lastEventUid =
        data?.bundleReport?.typeReportMap?.EVENT?.objectReports?.[0]?.uid ?? null

    async function recordVisit(formValues, teiUid, enrollmentUid, orgUnit) {
        const payload = buildEventPayload(formValues, teiUid, enrollmentUid, orgUnit)
        const result  = await submitEvent({ payload })

        // Extract event UID from v42 response
        const eventUid =
            result?.bundleReport?.typeReportMap?.EVENT?.objectReports?.[0]?.uid

        if (!eventUid) {
            const created = result?.stats?.created
            if (created > 0) return { eventUid: 'created' }
            throw new Error('Visit save failed — no event UID returned from DHIS2')
        }

        return { eventUid }
    }

    return { recordVisit, loading, error, lastEventUid }
}