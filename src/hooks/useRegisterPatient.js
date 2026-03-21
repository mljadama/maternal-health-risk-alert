// src/hooks/useRegisterPatient.js
// ─────────────────────────────────────────────────────────────
// Registers a new pregnant woman in DHIS2 using the v42 Tracker API.
//
// DHIS2 v42 breaking change:
//   OLD (v40/v41): POST /api/trackedEntityInstances  (separate calls)
//                  POST /api/enrollments
//
//   NEW (v42):     POST /api/tracker  (single call with both TEI + enrollment)
//
// The new endpoint accepts a single payload containing
// trackedEntities[] with enrollments[] nested inside.
// ─────────────────────────────────────────────────────────────

import { useDataMutation } from '@dhis2/app-runtime'
import { PROGRAM, ATTRIBUTES, TRACKED_ENTITY_TYPE } from '../config/dhis2.js'

// ── v42 Tracker mutation ──────────────────────────────────────
const TRACKER_MUTATION = {
    resource: 'tracker',
    type:     'create',
    data:     ({ payload }) => payload,
}

// ─────────────────────────────────────────────────────────────

/**
 * buildTrackerPayload
 * ───────────────────
 * Builds the v42 unified tracker payload.
 * TEI and enrollment are nested in a single request.
 *
 * POST /api/tracker
 * {
 *   trackedEntities: [{
 *     trackedEntityType, orgUnit, attributes: [...],
 *     enrollments: [{ program, orgUnit, enrolledAt, occurredAt }]
 *   }]
 * }
 */
function buildTrackerPayload(formValues, orgUnit) {
    const today = new Date().toISOString().split('T')[0]

    return {
        trackedEntities: [
            {
                trackedEntityType: TRACKED_ENTITY_TYPE,
                orgUnit:           orgUnit,
                attributes: [
                    { attribute: ATTRIBUTES.fullName,              value: formValues.fullName },
                    { attribute: ATTRIBUTES.age,                   value: String(formValues.age) },
                    { attribute: ATTRIBUTES.village,               value: formValues.village },
                    { attribute: ATTRIBUTES.phoneNumber,           value: formValues.phoneNumber },
                    { attribute: ATTRIBUTES.parity,                value: String(formValues.parity) },
                    { attribute: ATTRIBUTES.previousComplications, value: formValues.previousComplications || 'None' },
                ],
                enrollments: [
                    {
                        program:    PROGRAM.id,
                        orgUnit:    orgUnit,
                        enrolledAt: today,
                        occurredAt: today,
                        notes: [
                            {
                                value:     `Gestational age at enrollment: ${formValues.gestationalAge} weeks`,
                                storedAt:  today,
                            }
                        ],
                    }
                ],
            }
        ],
    }
}

// ─────────────────────────────────────────────────────────────

/**
 * useRegisterPatient
 * ──────────────────
 * Returns { register, loading, error }
 *
 * register(formValues, orgUnit) → POST /api/tracker
 * Resolves with { teiUid, enrollmentUid }
 */
export function useRegisterPatient() {
    const [submitTracker, { loading, error }] = useDataMutation(TRACKER_MUTATION)

    async function register(formValues, orgUnit) {
        const payload = buildTrackerPayload(formValues, orgUnit)

        const result = await submitTracker({ payload })

        // v42 response format
        const bundleReport  = result?.bundleReport
        const teiReport     = bundleReport?.typeReportMap?.TRACKED_ENTITY
        const enrollReport  = bundleReport?.typeReportMap?.ENROLLMENT

        const teiUid        = teiReport?.objectReports?.[0]?.uid
        const enrollmentUid = enrollReport?.objectReports?.[0]?.uid

        if (!teiUid) {
            // Try alternative response format
            const stats = result?.stats
            if (stats?.created > 0) {
                return { teiUid: 'created', enrollmentUid: 'created' }
            }
            throw new Error('Registration failed — no UID returned from DHIS2. Check program sharing settings.')
        }

        return { teiUid, enrollmentUid }
    }

    return { register, loading, error }
}