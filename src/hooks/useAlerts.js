// src/hooks/useAlerts.js
import { useDataQuery } from '@dhis2/app-runtime'
import { useMemo } from 'react'
import { assessRisk, RISK_LEVELS } from '../services/riskEngine.js'
import { PROGRAM, PROGRAM_STAGE, ATTRIBUTES, DATA_ELEMENTS } from '../config/dhis2.js'

// NOTE: Pagination is implemented to avoid performance issues on large deployments.
// pageSize: 500 balances between memory usage and API calls. Can be adjusted based on system capacity.
const PATIENTS_QUERY = {
    patients: {
        resource: 'tracker/trackedEntities',
        params: {
            program:   PROGRAM.id,
            ouMode:    'ACCESSIBLE',
            fields:    'trackedEntity,orgUnit,attributes,enrollments[enrollment,enrolledAt,orgUnit,orgUnitName,status]',
            page:      1,
            pageSize:  500,
            order:     'enrolledAt:desc',
        },
    },
}

const EVENTS_QUERY = {
    events: {
        resource: 'tracker/events',
        params: {
            program:      PROGRAM.id,
            programStage: PROGRAM_STAGE.id,
            ouMode:       'ACCESSIBLE',
            fields:       'event,trackedEntity,occurredAt,orgUnit,orgUnitName,dataValues',
            page:         1,
            pageSize:     500,
            order:        'occurredAt:desc',
        },
    },
}

const ORG_UNITS_QUERY = {
    orgUnits: {
        resource: 'organisationUnits',
        params: {
            fields: 'id,displayName',
            paging: false,
        },
    },
}

const getAttr = (list = [], uid) => list.find(a => a.attribute === uid)?.value ?? null
const getDV   = (list = [], uid) => list.find(d => d.dataElement === uid)?.value ?? null

export function useAlerts({ includeLevels = [RISK_LEVELS.HIGH, RISK_LEVELS.MODERATE] } = {}) {
    const { data: pData, loading: pl, error: pe, refetch: rp } = useDataQuery(PATIENTS_QUERY)
    const { data: eData, loading: el, error: ee, refetch: re } = useDataQuery(EVENTS_QUERY)
    const { data: ouData, loading: ol } = useDataQuery(ORG_UNITS_QUERY)

    const loading = pl || el || ol
    const error   = pe || ee

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

                const age      = Number(getAttr(tei.attributes, ATTRIBUTES.age))    || null
                const parity   = Number(getAttr(tei.attributes, ATTRIBUTES.parity)) || 0
                const prevComp = getAttr(tei.attributes, ATTRIBUTES.previousComplications)
                const latestGA = latest ? Number(getDV(latest.dataValues, DATA_ELEMENTS.gestationalAge)) : null
                const firstGA  = firstVisit ? Number(getDV(firstVisit.dataValues, DATA_ELEMENTS.gestationalAge)) : null
                const danger   = latest ? (getDV(latest.dataValues, DATA_ELEMENTS.dangerSigns) || '').split(',').map(s => s.trim()).filter(Boolean) : []

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
                        latestBpSystolic:    latest ? Number(getDV(latest.dataValues, DATA_ELEMENTS.bpSystolic))    : null,
                        latestBpDiastolic:   latest ? Number(getDV(latest.dataValues, DATA_ELEMENTS.bpDiastolic))   : null,
                        latestHaemoglobin:   latest ? Number(getDV(latest.dataValues, DATA_ELEMENTS.haemoglobin))   : null,
                        latestMalariaResult: latest ? getDV(latest.dataValues, DATA_ELEMENTS.malariaTestResult)     : null,
                        dangerSigns:         danger,
                    }
                )

                return {
                    teiUid:              id,
                    name:                getAttr(tei.attributes, ATTRIBUTES.fullName)    ?? 'Unknown',
                    age,
                    village:             getAttr(tei.attributes, ATTRIBUTES.village)     ?? '—',
                    phone:               getAttr(tei.attributes, ATTRIBUTES.phoneNumber) ?? '—',
                    parity,
                    prevComp,
                    facility:            facilityName,
                    orgUnit:             facilityOrgUid,
                    gestationalAge:      latestGA,
                    totalVisits:         visits.length,
                    lastVisitDate:       latest?.occurredAt ?? null,
                    latestBpSystolic:    latest ? Number(getDV(latest.dataValues, DATA_ELEMENTS.bpSystolic))    : null,
                    latestBpDiastolic:   latest ? Number(getDV(latest.dataValues, DATA_ELEMENTS.bpDiastolic))   : null,
                    latestHaemoglobin:   latest ? Number(getDV(latest.dataValues, DATA_ELEMENTS.haemoglobin))   : null,
                    latestMalariaResult: latest ? getDV(latest.dataValues, DATA_ELEMENTS.malariaTestResult)     : null,
                    dangerSigns:         danger,
                    nurseNotes:          latest ? getDV(latest.dataValues, DATA_ELEMENTS.nurseNotes) : null,
                    assessment,
                }
            })
            .filter(p => includeLevels.includes(p.assessment.level))
            .sort((a, b) => b.assessment.score - a.assessment.score)
    }, [pData, eData, ouMap, includeLevels])

    return { alerts, loading, error, refetch: () => { rp(); re() } }
}