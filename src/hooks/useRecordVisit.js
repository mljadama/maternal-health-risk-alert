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
import { useDhis2Config } from './useDhis2Config.js'

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
export function buildEventPayload(formValues, trackedEntity, enrollment, orgUnit, config) {
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
        { dataElement: config.dataElements.bpSystolic,          value: String(bpSystolic || '') },
        { dataElement: config.dataElements.bpDiastolic,         value: String(bpDiastolic || '') },
        { dataElement: config.dataElements.haemoglobin,         value: String(haemoglobin || '') },
        { dataElement: config.dataElements.weight,              value: String(weight || '') },
        { dataElement: config.dataElements.gestationalAge,      value: String(gestationalAge || '') },
        { dataElement: config.dataElements.visitNumber,         value: String(visitNumber || 1) },
        { dataElement: config.dataElements.malariaTestResult,   value: malariaTestResult || 'Not done' },
        { dataElement: config.dataElements.ironSupplementation, value: ironSupplementation ? 'true' : '' },
        { dataElement: config.dataElements.folicAcid,           value: folicAcid ? 'true' : '' },
        { dataElement: config.dataElements.nurseNotes,          value: nurseNotes || '' },
        { dataElement: config.dataElements.dangerSigns,         value: dangerSignsValue },
        { dataElement: config.dataElements.nextVisitDate,       value: nextVisitDate || '' },
    ].filter(dv => dv.value !== '')

    return {
        events: [
            {
                program:      config.program.id,
                programStage: config.programStage.id,
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
    const { config, loading: configLoading } = useDhis2Config()

    const lastEventUid =
        data?.bundleReport?.typeReportMap?.EVENT?.objectReports?.[0]?.uid ?? null

    async function recordVisit(formValues, teiUid, enrollmentUid, orgUnit) {
        const payload = buildEventPayload(formValues, teiUid, enrollmentUid, orgUnit, config)
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

    return { recordVisit, loading: loading || configLoading, error, lastEventUid }
}