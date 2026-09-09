// src/hooks/usePatients.js
import { useMemo } from 'react'
import { assessConfiguredRisk } from '../utils/assessWithConfig.js'
import { useAppContext } from '../context/AppContext.jsx'
import { useDhis2Config } from './useDhis2Config.js'
import { useTrackerOrgUnitScope } from './useTrackerOrgUnitScope.js'
import { useEngineListQuery } from './useEngineListQuery.js'
import {
    validateAppSettings,
    buildConfigValidationMessage,
} from '../config/appSettings.js'

const getAttr = (list = [], uid) =>
    list.find(a => a.attribute === uid)?.value ?? null

const getDV = (list = [], uid) =>
    list.find(d => d.dataElement === uid)?.value ?? null

function normalizeQueryError(error) {
    if (!error) return null
    const message = String(error?.message || '')

    if (message.includes('(400)') || /\b400\b/.test(message)) {
        return new Error(
            'DHIS2 returned 400 while loading patients. Check Configuration and verify that Program, Program stage, Tracked entity type, and all mapped UIDs are valid for this instance.'
        )
    }

    return error
}

function asList(payload, nestedKey) {
    if (Array.isArray(payload)) return payload
    if (Array.isArray(payload?.[nestedKey])) return payload[nestedKey]
    if (Array.isArray(payload?.instances)) return payload.instances
    if (Array.isArray(payload?.trackedEntities)) return payload.trackedEntities
    if (Array.isArray(payload?.trackedEntityInstances)) return payload.trackedEntityInstances
    return []
}

function mergePendingPatients(serverPatients, pendingPatients, config) {
    if (!pendingPatients?.length) return serverPatients

    const ids = new Set(serverPatients.map(p => p.teiUid))
    const extras = pendingPatients.filter(draft => {
        if (draft.teiUid && draft.teiUid !== 'created' && ids.has(draft.teiUid)) {
            return false
        }
        return !serverPatients.some(p =>
            p.name === draft.name && p.village === draft.village && p.orgUnit === draft.orgUnit
        )
    })

    if (!extras.length) return serverPatients

    const mapped = extras.map((draft, index) => {
        const age = draft.age ?? null
        const parity = draft.parity ?? 0
        const assessment = assessConfiguredRisk(
            config,
            { age, parity, previousComplications: draft.prevComp },
            {
                totalVisits: 0,
                currentWeek: draft.gestationalAge ?? 0,
                firstVisitWeek: draft.gestationalAge ?? null,
                latestBpSystolic: null,
                latestBpDiastolic: null,
                latestHaemoglobin: null,
                latestMalariaResult: null,
                dangerSigns: [],
            }
        )

        return {
            teiUid: draft.teiUid && draft.teiUid !== 'created' ? draft.teiUid : `pending-${index}`,
            name: draft.name ?? 'Unknown',
            age,
            village: draft.village ?? '—',
            phoneNumber: draft.phoneNumber ?? '—',
            parity,
            prevComp: draft.prevComp,
            facility: draft.facility ?? '—',
            orgUnit: draft.orgUnit,
            enrollmentUid: null,
            enrollmentDate: draft.enrollmentDate ?? null,
            gestationalAge: draft.gestationalAge ?? null,
            totalVisits: 0,
            lastVisitDate: null,
            assessment,
            rawVisits: [],
        }
    })

    return [...mapped, ...serverPatients]
}

export function usePatients() {
    const { config, loading: configLoading } = useDhis2Config()
    const { pendingPatients } = useAppContext()
    const configValidation = useMemo(() => validateAppSettings(config), [config])
    const configError = useMemo(() => {
        if (configValidation.isValid) {
            return null
        }
        return new Error(
            buildConfigValidationMessage(
                configValidation,
                'Cannot load patients because configuration is incomplete.'
            )
        )
    }, [configValidation])
    const {
        preferredOrgUnitId,
        meLoading,
        meError,
    } = useTrackerOrgUnitScope()
    const { attributes, dataElements } = config

    const trackerQueryParams = useMemo(() => {
        if (preferredOrgUnitId) {
            return {
                orgUnit: preferredOrgUnitId,
                ou: preferredOrgUnitId,
                orgUnitMode: 'DESCENDANTS',
                ouMode: 'DESCENDANTS',
            }
        }
        return {
            orgUnitMode: 'ACCESSIBLE',
            ouMode: 'ACCESSIBLE',
        }
    }, [preferredOrgUnitId])

    const shouldPauseQueries = configLoading || meLoading || Boolean(configError)
    const canQuery = !shouldPauseQueries && Boolean(config.program?.id)

    const query = useMemo(() => {
        if (!canQuery) return null
        return {
            patients: {
                resource: 'tracker/trackedEntities',
                params: {
                    program: config.program.id,
                    ...trackerQueryParams,
                    fields:  'trackedEntity,orgUnit,attributes,enrollments[enrollment,enrolledAt,orgUnit,orgUnitName,status]',
                    page:    1,
                    pageSize: 500,
                },
            },
            events: {
                resource: 'tracker/events',
                params: {
                    program:  config.program.id,
                    ...trackerQueryParams,
                    fields:   'event,trackedEntity,occurredAt,orgUnit,orgUnitName,dataValues',
                    page:     1,
                    pageSize: 500,
                    order:    'occurredAt:desc',
                },
            },
            orgUnits: {
                resource: 'organisationUnits',
                params: {
                    fields:  'id,displayName',
                    userOnly: true,
                    pageSize: 500,
                },
            },
        }
    }, [canQuery, config.program.id, trackerQueryParams])

    const { data, loading: fetchLoading, error: pe, refetch } = useEngineListQuery({
        enabled: canQuery,
        query,
    })

    const loading = configLoading || meLoading || (canQuery && fetchLoading && !data && !pendingPatients.length)
    const queryError = normalizeQueryError(meError || pe)
    const error = configError || queryError

    const ouMap = useMemo(() => {
        const map = {}
        const list = data?.orgUnits?.organisationUnits ?? (Array.isArray(data?.orgUnits) ? data.orgUnits : [])
        list.forEach(ou => {
            if (ou?.id) map[ou.id] = ou.displayName
        })
        return map
    }, [data])

    const patients = useMemo(() => {
        const rawTeis = asList(data?.patients, 'trackedEntities')
        const events = asList(data?.events, 'events')

        const teis = Array.from(
            rawTeis.reduce((acc, tei) => {
                const id = tei?.trackedEntity || tei?.trackedEntityInstance || tei?.id
                if (id) {
                    acc.set(id, { ...tei, trackedEntity: id })
                }
                return acc
            }, new Map()).values()
        )

        const byTEI = {}
        events.forEach(ev => {
            const id = ev.trackedEntity || ev.trackedEntityInstance || ev.tei
            if (id) {
                if (!byTEI[id]) byTEI[id] = []
                byTEI[id].push(ev)
            }
        })
        Object.values(byTEI).forEach(arr =>
            arr.sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))
        )

        const fromServer = teis.map(tei => {
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
            const danger   = latest
                ? (getDV(latest.dataValues, dataElements.dangerSigns) || '')
                    .split(',').map(s => s.trim()).filter(Boolean)
                : []

            const facilityOrgUid = enrollment.orgUnit ?? tei.orgUnit
            const facilityName   =
                enrollment.orgUnitName ||
                ouMap[facilityOrgUid]  ||
                facilityOrgUid         ||
                '—'

            const assessment = assessConfiguredRisk(
                config,
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
                teiUid:         id,
                name:           getAttr(tei.attributes, attributes.fullName)    ?? 'Unknown',
                age,
                village:        getAttr(tei.attributes, attributes.village)     ?? '—',
                phoneNumber:    getAttr(tei.attributes, attributes.phoneNumber) ?? '—',
                parity,
                prevComp,
                facility:       facilityName,
                orgUnit:        facilityOrgUid,
                enrollmentUid:  enrollment.enrollment ?? null,
                enrollmentDate: enrollment.enrolledAt ?? null,
                gestationalAge: latestGA,
                totalVisits:    visits.length,
                lastVisitDate:  latest?.occurredAt ?? null,
                assessment,
                rawVisits:      visits,
            }
        })

        return mergePendingPatients(fromServer, pendingPatients, config)
    }, [data, ouMap, attributes, dataElements, config, pendingPatients])

    return {
        patients,
        loading,
        error,
        configReady: !shouldPauseQueries,
        refetch,
    }
}
