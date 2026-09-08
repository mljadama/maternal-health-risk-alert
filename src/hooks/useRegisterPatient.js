// src/hooks/useRegisterPatient.js
// DHIS2 v42 Tracker API — POST /api/tracker
//
// v42 processes tracker requests asynchronously.
// POST /api/tracker returns a job ID.
// We then poll GET /api/tracker/jobs/{jobId} until complete.

import { useDataMutation, useDataEngine } from '@dhis2/app-runtime'
import { useDhis2Config } from './useDhis2Config.js'
import { formatTrackerError } from '../utils/trackerErrors.js'
import {
    validateAppSettings,
    buildConfigValidationMessage,
} from '../config/appSettings.js'

const TRACKER_MUTATION = {
    resource: 'tracker',
    type:     'create',
    params:   { async: false },
    data:     ({ payload }) => payload,
}

function buildPayload(formValues, orgUnit, config) {
    const today = new Date().toISOString().split('T')[0]
    const attributes = [
        { attribute: config.attributes.fullName, value: String(formValues.fullName) },
        { attribute: config.attributes.age, value: String(formValues.age) },
        { attribute: config.attributes.village, value: String(formValues.village) },
        { attribute: config.attributes.parity, value: String(formValues.parity) },
        { attribute: config.attributes.previousComplications, value: String(formValues.previousComplications || 'None') },
    ]

    if (formValues.phoneNumber && String(formValues.phoneNumber).trim()) {
        attributes.push({
            attribute: config.attributes.phoneNumber,
            value: String(formValues.phoneNumber).trim(),
        })
    }

    return {
        trackedEntities: [
            {
                trackedEntityType: config.trackedEntityType.id,
                orgUnit,
                attributes,
                enrollments: [
                    {
                        program: config.program.id,
                        orgUnit,
                        enrolledAt: today,
                        occurredAt: today,
                    }
                ],
            }
        ],
    }
}

// Poll the tracker job until it completes (with 404 safety)
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
                throw new Error(
                    formatTrackerError(
                        { details: report },
                        'Registration failed on DHIS2. Please verify patient data and try again.'
                    )
                )
            }
        } catch (err) {
            if (
                err.message.includes('Registration failed') ||
                err.message.includes('not valid') ||
                err.message.includes('permission')
            ) throw err
            // Ignore 404 or missing job report endpoints while polling
        }
    }
    return { teiUid: 'created', enrollmentUid: null }
}

function normalizeRegistrationError(error) {
    return new Error(
        formatTrackerError(error, 'Registration failed. Check the entered values and try again.')
    )
}

export function useRegisterPatient() {
    const [mutate, { loading, error }] = useDataMutation(TRACKER_MUTATION)
    const engine = useDataEngine()
    const { config, loading: configLoading } = useDhis2Config()

    async function register(formValues, orgUnit) {
        const configValidation = validateAppSettings(config)
        if (!configValidation.isValid) {
            throw new Error(
                buildConfigValidationMessage(
                    configValidation,
                    'Registration is blocked because configuration is incomplete.'
                )
            )
        }

        let result
        try {
            const payload = buildPayload(formValues, orgUnit, config)
            result = await mutate({ payload })
        } catch (error) {
            throw normalizeRegistrationError(error)
        }

        const report = result?.response || result
        if (report?.status === 'ERROR') {
            throw new Error(
                formatTrackerError(
                    { details: report },
                    'Registration failed on DHIS2. Please verify patient data and try again.'
                )
            )
        }

        // 1. Synchronous response (when async: false)
        const teiUid =
            report?.bundleReport?.typeReportMap?.TRACKED_ENTITY?.objectReports?.[0]?.uid ||
            report?.uid ||
            null

        if (teiUid) {
            return { teiUid, enrollmentUid: null }
        }

        // 2. Async job fallback (if DHIS2 queued job)
        const jobId = report?.id
        if (jobId) {
            return await pollJob(engine, jobId)
        }

        return { teiUid: 'created', enrollmentUid: null }
    }

    return { register, loading: loading || configLoading, error }
}