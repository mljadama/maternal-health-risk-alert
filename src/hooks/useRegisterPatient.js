// src/hooks/useRegisterPatient.js
// DHIS2 v42 Tracker API — POST /api/tracker
//
// v42 processes tracker requests asynchronously.
// POST /api/tracker returns a job ID.
// We then poll GET /api/tracker/jobs/{jobId} until complete.

import { useDataMutation, useDataEngine } from '@dhis2/app-runtime'
import { PROGRAM, ATTRIBUTES, TRACKED_ENTITY_TYPE } from '../config/dhis2.js'

const TRACKER_MUTATION = {
    resource: 'tracker',
    type:     'create',
    data:     ({ payload }) => payload,
}

function buildPayload(formValues, orgUnit) {
    const today = new Date().toISOString().split('T')[0]
    return {
        trackedEntities: [
            {
                trackedEntityType: TRACKED_ENTITY_TYPE,
                orgUnit,
                attributes: [
                    { attribute: ATTRIBUTES.fullName,              value: String(formValues.fullName) },
                    { attribute: ATTRIBUTES.age,                   value: String(formValues.age) },
                    { attribute: ATTRIBUTES.village,               value: String(formValues.village) },
                    { attribute: ATTRIBUTES.phoneNumber,           value: String(formValues.phoneNumber) },
                    { attribute: ATTRIBUTES.parity,                value: String(formValues.parity) },
                    { attribute: ATTRIBUTES.previousComplications, value: String(formValues.previousComplications || 'None') },
                ],
                enrollments: [
                    {
                        program:    PROGRAM.id,
                        orgUnit,
                        enrolledAt: today,
                        occurredAt: today,
                    }
                ],
            }
        ],
    }
}

// Poll the tracker job until it completes
async function pollJob(engine, jobId, maxAttempts = 10) {
    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, 1500))
        try {
            const result = await engine.query({
                job: {
                    resource: `tracker/jobs/${jobId}/report`,
                    params:   { reportMode: 'FULL' },
                },
            })
            const report = result?.job
            if (report?.status === 'OK' || report?.status === 'WARNING') {
                const teiUid = report?.bundleReport?.typeReportMap?.TRACKED_ENTITY?.objectReports?.[0]?.uid
                const enrUid = report?.bundleReport?.typeReportMap?.ENROLLMENT?.objectReports?.[0]?.uid
                return { teiUid: teiUid || 'created', enrollmentUid: enrUid || 'created' }
            }
            if (report?.status === 'ERROR') {
                throw new Error('Registration failed on DHIS2 server — check program sharing settings')
            }
        } catch (err) {
            if (err.message.includes('Registration failed')) throw err
            // Still processing — keep polling
        }
    }
    // Job timed out after all attempts
    throw new Error('Patient registration job timed out. Please check if the registration was successful in DHIS2.')
}

export function useRegisterPatient() {
    const [mutate, { loading, error }] = useDataMutation(TRACKER_MUTATION)
    const engine = useDataEngine()

    async function register(formValues, orgUnit) {
        const payload = buildPayload(formValues, orgUnit)
        const result  = await mutate({ payload })

        // v42 returns a job ID — poll for the result
        const jobId = result?.response?.id
        if (jobId) {
            return await pollJob(engine, jobId)
        }

        // Synchronous response fallback (older versions)
        const teiUid =
            result?.bundleReport?.typeReportMap?.TRACKED_ENTITY?.objectReports?.[0]?.uid ||
            result?.response?.uid ||
            null

        if (!teiUid) {
            throw new Error('Registration failed — unexpected response from DHIS2')
        }

        return { teiUid, enrollmentUid: null }
    }

    return { register, loading, error }
}