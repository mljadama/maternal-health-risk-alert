// src/hooks/useRegisterPatient.js
// DHIS2 v42 Tracker API — POST /api/tracker
//
// v42 processes tracker requests asynchronously.
// POST /api/tracker returns a job ID.
// We then poll GET /api/tracker/jobs/{jobId} until complete.

import { useDataMutation, useDataEngine } from '@dhis2/app-runtime'
import { useDhis2Config } from './useDhis2Config.js'
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
    const events = []
    if (formValues.gestationalAge && config.programStage?.id && config.dataElements?.gestationalAge) {
        events.push({
            program: config.program.id,
            programStage: config.programStage.id,
            orgUnit,
            occurredAt: today,
            scheduledAt: today,
            status: 'COMPLETED',
            dataValues: [
                { dataElement: config.dataElements.gestationalAge, value: String(formValues.gestationalAge) },
            ],
        })
    }

    return {
        trackedEntities: [
            {
                trackedEntityType: config.trackedEntityType.id,
                orgUnit,
                attributes: [
                    { attribute: config.attributes.fullName,              value: String(formValues.fullName) },
                    { attribute: config.attributes.age,                   value: String(formValues.age) },
                    { attribute: config.attributes.village,               value: String(formValues.village) },
                    { attribute: config.attributes.phoneNumber,           value: String(formValues.phoneNumber) },
                    { attribute: config.attributes.parity,                value: String(formValues.parity) },
                    { attribute: config.attributes.previousComplications, value: String(formValues.previousComplications || 'None') },
                ],
                enrollments: [
                    {
                        program:    config.program.id,
                        orgUnit,
                        enrolledAt: today,
                        occurredAt: today,
                        events,
                    }
                ],
            }
        ],
    }
}

function extractTrackerErrorDetails(report) {
    if (!report) return ''

    const errorMessages = []

    // 1. Validation Report errors
    if (report.validationReport?.errorReports?.length) {
        report.validationReport.errorReports.forEach(err => {
            if (err.message) errorMessages.push(err.message)
        })
    }

    // 2. Object reports in bundle report
    if (report.bundleReport?.typeReportMap) {
        Object.values(report.bundleReport.typeReportMap).forEach(typeReport => {
            if (typeReport?.objectReports) {
                typeReport.objectReports.forEach(objReport => {
                    if (objReport?.errorReports) {
                        objReport.errorReports.forEach(err => {
                            if (err.message) errorMessages.push(err.message)
                        })
                    }
                })
            }
        })
    }

    if (errorMessages.length > 0) {
        return errorMessages.join(' | ')
    }

    return report.message || ''
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
                const details = extractTrackerErrorDetails(report)
                const errorMsg = details
                    ? `DHIS2 server validation error: ${details}`
                    : 'Registration failed on DHIS2 server. Please verify patient data and server settings.'
                throw new Error(errorMsg)
            }
        } catch (err) {
            if (err.message.includes('Registration failed') || err.message.includes('validation error')) throw err
            // Ignore 404 or missing job report endpoints while polling
        }
    }
    return { teiUid: 'created', enrollmentUid: null }
}

function normalizeRegistrationError(error) {
    const message = String(error?.message || '')
    if (message.includes('(400)') || /\b400\b/.test(message)) {
        return new Error(
            'DHIS2 returned 400 while registering the patient. Open Configuration and verify Program, Program stage, Tracked entity type, attribute UIDs, and data element UIDs.'
        )
    }
    return error instanceof Error ? error : new Error('Registration failed due to an unexpected error.')
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

        // 1. Synchronous response (when async: false)
        const teiUid =
            result?.bundleReport?.typeReportMap?.TRACKED_ENTITY?.objectReports?.[0]?.uid ||
            result?.response?.bundleReport?.typeReportMap?.TRACKED_ENTITY?.objectReports?.[0]?.uid ||
            result?.response?.uid ||
            result?.uid ||
            null

        if (teiUid) {
            return { teiUid, enrollmentUid: null }
        }

        // 2. Async job fallback (if DHIS2 queued job)
        const jobId = result?.response?.id || result?.id
        if (jobId) {
            return await pollJob(engine, jobId)
        }

        return { teiUid: 'created', enrollmentUid: null }
    }

    return { register, loading: loading || configLoading, error }
}