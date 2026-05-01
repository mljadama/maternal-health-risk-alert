// src/hooks/useAlerts.js
import { useDataQuery } from '@dhis2/app-runtime'
import { useMemo } from 'react'
import { assessRisk, RISK_LEVELS } from '../services/riskEngine.js'
import { useDhis2Config } from './useDhis2Config.js'
import { useTrackerOrgUnitScope } from './useTrackerOrgUnitScope.js'
import { validateAppSettings, buildConfigValidationMessage } from '../config/appSettings.js'

// NOTE: Pagination is implemented to avoid performance issues on large deployments.
// pageSize: 500 balances between memory usage and API calls. Can be adjusted based on system capacity.
const getAttr = (list = [], uid) => list.find(a => a.attribute === uid)?.value ?? null
const getDV   = (list = [], uid) => list.find(d => d.dataElement === uid)?.value ?? null

export function useAlerts({ includeLevels = [RISK_LEVELS.HIGH, RISK_LEVELS.MODERATE] } = {}) {
    const { config, loading: configLoading } = useDhis2Config()
    const configValidation = useMemo(() => validateAppSettings(config), [config])
    const {
        preferredOrgUnitId,
        meLoading,
        meError,
    } = useTrackerOrgUnitScope()
    const { attributes, dataElements } = config

    const configError = useMemo(() => {
        if (configValidation.isValid) return null
        return new Error(
            buildConfigValidationMessage(
                configValidation,
                'Cannot load alerts because configuration is incomplete.'
            )
        )
    }, [configValidation])

    const trackerQueryParams = useMemo(() => {
        if (preferredOrgUnitId) {
            return { ou: preferredOrgUnitId, ouMode: 'DESCENDANTS' }
        }
        return { ouMode: 'ACCESSIBLE' }
    }, [preferredOrgUnitId])

    const shouldPauseQueries = configLoading || meLoading || Boolean(configError)

    const PATIENTS_QUERY = useMemo(() => ({
        patients: {
            resource: 'tracker/trackedEntities',
            params: {
                program:   config.program.id,
                ...trackerQueryParams,
                fields:    'trackedEntity,orgUnit,attributes,enrollments[enrollment,enrolledAt,orgUnit,orgUnitName,status]',
                page:      1,
                pageSize:  500,
                order:     'enrolledAt:desc',
            },
        },
    }), [config.program.id, trackerQueryParams])

    const EVENTS_QUERY = useMemo(() => ({
        events: {
            resource: 'tracker/events',
            params: {
                program:      config.program.id,
                programStage: config.programStage.id,
                ...trackerQueryParams,
                fields:       'event,trackedEntity,occurredAt,orgUnit,orgUnitName,dataValues',
                page:         1,
                pageSize:     500,
                order:        'occurredAt:desc',
            },
        },
    }), [config.program.id, config.programStage.id, trackerQueryParams])

    const ORG_UNITS_QUERY = useMemo(() => ({
        orgUnits: {
            resource: 'organisationUnits',
            params: {
                fields: 'id,displayName',
                paging: false,
            },
        },
    }), [])

    const { data: pData, loading: pl, error: pe, refetch: rp } = useDataQuery(PATIENTS_QUERY, { lazy: shouldPauseQueries })
    const { data: eData, loading: el, error: ee, refetch: re } = useDataQuery(EVENTS_QUERY, { lazy: shouldPauseQueries })
    const { data: ouData, loading: ol } = useDataQuery(ORG_UNITS_QUERY, { lazy: configLoading || meLoading })

    const loading = pl || el || ol || configLoading || meLoading
    const error   = configError || meError || pe || ee

    const ouMap = useMemo(() => {
        const map = {}
        ouData?.orgUnits?.organisationUnits?.forEach(ou => {
            map[ou.id] = ou.displayName
        })
        return map
    }, [ouData])

    const alerts = useMemo(() => {
        if (!pData || !eData) return []

        const teis   = pData.patients?.trackedEntities ?? []
        const events = eData.events?.events ?? []

        const byTEI = {}
        events.forEach(ev => {
            const id = ev.trackedEntity
            if (!byTEI[id]) byTEI[id] = []
            byTEI[id].push(ev)
        })
        Object.values(byTEI).forEach(arr =>
            arr.sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))
        )

        return teis
            .map(tei => {
                const id         = tei.trackedEntity
                const visits     = byTEI[id] ?? []
                const latest     = visits[0] ?? null
                const firstVisit = visits[visits.length - 1] ?? null
                const enrollment = tei.enrollments?.[0] ?? {}

                const age      = Number(getAttr(tei.attributes, attributes.age))    || null
                const parity   = Number(getAttr(tei.attributes, attributes.parity)) || 0
                const prevComp = getAttr(tei.attributes, attributes.previousComplications)
                const latestGA = latest ? Number(getDV(latest.dataValues, dataElements.gestationalAge)) : null
                const firstGA  = firstVisit ? Number(getDV(firstVisit.dataValues, dataElements.gestationalAge)) : null
                const danger   = latest ? (getDV(latest.dataValues, dataElements.dangerSigns) || '').split(',').map(s => s.trim()).filter(Boolean) : []

                const facilityOrgUid = enrollment.orgUnit ?? tei.orgUnit
                const facilityName   =
                    enrollment.orgUnitName ||
                    ouMap[facilityOrgUid]  ||
                    facilityOrgUid         ||
                    '—'

                const assessment = assessRisk(
                    { age, parity, previousComplications: prevComp },
                    {
                        totalVisits:         visits.length,
                        currentWeek:         latestGA ?? 0,
                        firstVisitWeek:      firstGA,
                        latestBpSystolic:    latest ? Number(getDV(latest.dataValues, dataElements.bpSystolic))    : null,
                        latestBpDiastolic:   latest ? Number(getDV(latest.dataValues, dataElements.bpDiastolic))   : null,
                        latestHaemoglobin:   latest ? Number(getDV(latest.dataValues, dataElements.haemoglobin))   : null,
                        latestMalariaResult: latest ? getDV(latest.dataValues, dataElements.malariaTestResult)     : null,
                        dangerSigns:         danger,
                    }
                )

                return {
                    teiUid:              id,
                    name:                getAttr(tei.attributes, attributes.fullName)    ?? 'Unknown',
                    age,
                    village:             getAttr(tei.attributes, attributes.village)     ?? '—',
                    phone:               getAttr(tei.attributes, attributes.phoneNumber) ?? '—',
                    parity,
                    prevComp,
                    facility:            facilityName,
                    orgUnit:             facilityOrgUid,
                    gestationalAge:      latestGA,
                    totalVisits:         visits.length,
                    lastVisitDate:       latest?.occurredAt ?? null,
                    latestBpSystolic:    latest ? Number(getDV(latest.dataValues, dataElements.bpSystolic))    : null,
                    latestBpDiastolic:   latest ? Number(getDV(latest.dataValues, dataElements.bpDiastolic))   : null,
                    latestHaemoglobin:   latest ? Number(getDV(latest.dataValues, dataElements.haemoglobin))   : null,
                    latestMalariaResult: latest ? getDV(latest.dataValues, dataElements.malariaTestResult)     : null,
                    dangerSigns:         danger,
                    nurseNotes:          latest ? getDV(latest.dataValues, dataElements.nurseNotes) : null,
                    assessment,
                }
            })
            .filter(p => includeLevels.includes(p.assessment.level))
            .sort((a, b) => b.assessment.score - a.assessment.score)
    }, [pData, eData, ouMap, includeLevels])

    return { alerts, loading, error, refetch: () => { rp(); re() } }
}