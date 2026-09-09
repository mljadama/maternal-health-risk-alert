// src/hooks/useRegisterPatient.js
// DHIS2 Tracker API — POST /api/tracker
// Creates the patient, enrollment, and a booking visit so gestational age
// is available on the patient record and visit history.

import { useDataEngine } from '@dhis2/app-runtime'
import { useState } from 'react'
import { useDhis2Config } from './useDhis2Config.js'
import { formatTrackerError } from '../utils/trackerErrors.js'
import {
    validateAppSettings,
    buildConfigValidationMessage,
} from '../config/appSettings.js'

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

    const bookingValues = []
    const addBookingValue = (uid, value) => {
        if (!uid || value === '' || value == null) return
        bookingValues.push({ dataElement: uid, value: String(value) })
    }

    addBookingValue(config.dataElements.gestationalAge, formValues.gestationalAge)
    addBookingValue(config.dataElements.visitNumber, '1')
    addBookingValue(config.dataElements.bpSystolic, formValues.bpSystolic)
    addBookingValue(config.dataElements.bpDiastolic, formValues.bpDiastolic)
    addBookingValue(config.dataElements.haemoglobin, formValues.haemoglobin)
    addBookingValue(config.dataElements.weight, formValues.weight)

    const enrollment = {
        program: config.program.id,
        orgUnit,
        enrolledAt: today,
        occurredAt: today,
        status: 'ACTIVE',
    }

    if (bookingValues.length && config.programStage?.id) {
        enrollment.events = [{
            program: config.program.id,
            programStage: config.programStage.id,
            orgUnit,
            occurredAt: today,
            scheduledAt: today,
            status: 'COMPLETED',
            dataValues: bookingValues,
        }]
    }

    return {
        trackedEntities: [
            {
                trackedEntityType: config.trackedEntityType.id,
                orgUnit,
                attributes,
                enrollments: [enrollment],
            },
        ],
    }
}

function getImportReport(result) {
    return result?.response && typeof result.response === 'object'
        ? result.response
        : result
}

function extractUid(report, trackerType) {
    return report?.bundleReport?.typeReportMap?.[trackerType]?.objectReports?.[0]?.uid || null
}

function normalizeRegistrationError(error) {
    return new Error(
        formatTrackerError(error, 'Registration failed. Check the entered values and try again.')
    )
}

export function useRegisterPatient() {
    const engine = useDataEngine()
    const { config, loading: configLoading } = useDhis2Config()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

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

        setLoading(true)
        setError(null)

        try {
            const result = await engine.mutate({
                resource: 'tracker',
                type: 'create',
                params: { async: false },
                data: buildPayload(formValues, orgUnit, config),
            })
            const report = getImportReport(result)
            if (report?.status === 'ERROR' || report?.validationReport?.errorReports?.length) {
                throw new Error(
                    formatTrackerError(
                        { details: report },
                        'Registration failed on DHIS2. Please verify patient data and try again.'
                    )
                )
            }

            return {
                teiUid: extractUid(report, 'TRACKED_ENTITY') || 'created',
                enrollmentUid: extractUid(report, 'ENROLLMENT') || null,
                eventUid: extractUid(report, 'EVENT') || null,
            }
        } catch (err) {
            const normalized = normalizeRegistrationError(err)
            setError(normalized)
            throw normalized
        } finally {
            setLoading(false)
        }
    }

    return { register, loading: loading || configLoading, error }
}
