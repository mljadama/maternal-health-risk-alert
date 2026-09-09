// src/hooks/useDashboardData.js
// Aggregated stats for the dashboard from DHIS2 v42

import { useMemo } from 'react'
import { assessRisk, RISK_LEVELS } from '../services/riskEngine.js'
import { useAppContext } from '../context/AppContext.jsx'
import { useDhis2Config } from './useDhis2Config.js'
import { useTrackerOrgUnitScope } from './useTrackerOrgUnitScope.js'
import { validateAppSettings, buildConfigValidationMessage } from '../config/appSettings.js'
import { useEngineListQuery } from './useEngineListQuery.js'

const getAttr = (list = [], uid) => list.find(a => a.attribute === uid)?.value ?? null
const getDV   = (list = [], uid) => list.find(d => d.dataElement === uid)?.value ?? null

function asList(payload, nestedKey) {
    if (Array.isArray(payload)) return payload
    if (Array.isArray(payload?.[nestedKey])) return payload[nestedKey]
    if (Array.isArray(payload?.instances)) return payload.instances
    if (Array.isArray(payload?.trackedEntities)) return payload.trackedEntities
    return []
}

function buildMonthlyTrend(events, dataElements) {
    const buckets = {}
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
        const d   = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        buckets[key] = {
            month:  d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
            visits: 0,
            high:   0,
        }
    }
    events.forEach(ev => {
        const key = ev.occurredAt?.slice(0, 7)
        if (!buckets[key]) return
        buckets[key].visits += 1
        const sys = Number(getDV(ev.dataValues, dataElements.bpSystolic))
        const dia = Number(getDV(ev.dataValues, dataElements.bpDiastolic))
        const hb  = Number(getDV(ev.dataValues, dataElements.haemoglobin))
        if (sys >= 140 || dia >= 90 || hb < 7) buckets[key].high += 1
    })
    return Object.values(buckets)
}

function buildCompletion(patients, byTEI) {
    const stages = [
        { label: '< 13 wks',  target: 1, test: (ga) => ga > 0 && ga < 13 },
        { label: '13-26 wks', target: 2, test: (ga) => ga >= 13 && ga <= 26 },
        { label: '27-36 wks', target: 4, test: (ga) => ga >= 27 && ga <= 36 },
        { label: '37+ wks',   target: 6, test: (ga) => ga >= 37 },
    ]
    return stages.map(st => {
        const relevant = patients.filter(p => st.test(p.ga ?? 0))
        if (!relevant.length) return { stage: st.label, rate: 0, count: 0 }
        const done = relevant.filter(p => (byTEI[p.teiUid]?.length ?? 0) >= st.target).length
        return {
            stage: st.label,
            rate:  Math.round((done / relevant.length) * 100),
            count: relevant.length,
        }
    })
}

export function useDashboardData() {
    const { config, loading: configLoading } = useDhis2Config()
    const { pendingPatients } = useAppContext()
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
                'Cannot load the dashboard because configuration is incomplete.'
            )
        )
    }, [configValidation])

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

    const programId = config.program?.id
    const programStageId = config.programStage?.id
    const shouldPauseQueries = configLoading || meLoading || Boolean(configError) || !programId
    const canQuery = !shouldPauseQueries

    const query = useMemo(() => {
        if (!canQuery) return null
        return {
            patients: {
                resource: 'tracker/trackedEntities',
                params: {
                    program: programId,
                    ...trackerQueryParams,
                    fields:  'trackedEntity,trackedEntityInstance,id,attributes,enrollments[enrollment,enrolledAt,orgUnit]',
                    page: 1,
                    pageSize: 500,
                },
            },
            events: {
                resource: 'tracker/events',
                params: {
                    program:      programId,
                    programStage: programStageId,
                    ...trackerQueryParams,
                    fields:       'event,trackedEntity,trackedEntityInstance,tei,occurredAt,dataValues',
                    page: 1,
                    pageSize: 500,
                },
            },
        }
    }, [canQuery, programId, programStageId, trackerQueryParams])

    const { data, loading: fetchLoading, error: pe } = useEngineListQuery({
        enabled: canQuery,
        query,
    })

    const loading = configLoading || meLoading || (canQuery && fetchLoading && !data && !pendingPatients.length)
    const error   = configError || meError || pe

    const stats = useMemo(() => {
        const teisArr = asList(data?.patients, 'trackedEntities')
        const eventsArr = asList(data?.events, 'events')

        if (!data && !pendingPatients.length) return null

        const byTEI = {}
        eventsArr.forEach(ev => {
            const id = ev.trackedEntity || ev.trackedEntityInstance || ev.tei || ev.id
            if (!id) return
            if (!byTEI[id]) byTEI[id] = []
            byTEI[id].push(ev)
        })
        Object.values(byTEI).forEach(a =>
            a.sort((x, y) => new Date(y.occurredAt) - new Date(x.occurredAt))
        )

        const patients = teisArr.map(tei => {
            const id     = tei.trackedEntity || tei.trackedEntityInstance || tei.id
            const visits = byTEI[id] ?? []
            const latest = visits[0] ?? null
            const first  = visits[visits.length - 1] ?? null
            const ga     = latest ? Number(getDV(latest.dataValues, dataElements.gestationalAge)) : null
            const age    = Number(getAttr(tei.attributes, attributes.age))    || null
            const parity = Number(getAttr(tei.attributes, attributes.parity)) || 0
            const comp   = getAttr(tei.attributes, attributes.previousComplications)
            const danger = latest ? (getDV(latest.dataValues, dataElements.dangerSigns) || '').split(',').filter(Boolean) : []

            const assessment = assessRisk(
                { age, parity, previousComplications: comp },
                {
                    totalVisits:         visits.length,
                    currentWeek:         ga ?? 0,
                    firstVisitWeek:      first ? Number(getDV(first.dataValues, dataElements.gestationalAge)) : null,
                    latestBpSystolic:    latest ? Number(getDV(latest.dataValues, dataElements.bpSystolic))    : null,
                    latestBpDiastolic:   latest ? Number(getDV(latest.dataValues, dataElements.bpDiastolic))   : null,
                    latestHaemoglobin:   latest ? Number(getDV(latest.dataValues, dataElements.haemoglobin))   : null,
                    latestMalariaResult: latest ? getDV(latest.dataValues, dataElements.malariaTestResult)     : null,
                    dangerSigns:         danger,
                },
                { thresholds: config.thresholds, scores: config.ruleScores }
            )

            return {
                teiUid:     id,
                name:       getAttr(tei.attributes, attributes.fullName) ?? 'Unknown',
                age,
                ga,
                totalVisits: visits.length,
                lastVisit:   latest?.occurredAt ?? null,
                assessment,
            }
        })

        const ids = new Set(patients.map(p => p.teiUid))
        pendingPatients.forEach(draft => {
            const already = (draft.teiUid && draft.teiUid !== 'created' && ids.has(draft.teiUid)) ||
                patients.some(p => p.name === draft.name)
            if (already) return
            patients.push({
                teiUid: draft.teiUid || `pending-${draft.name}`,
                name: draft.name ?? 'Unknown',
                age: draft.age ?? null,
                ga: draft.gestationalAge ?? null,
                totalVisits: 0,
                lastVisit: null,
                assessment: assessRisk(
                    { age: draft.age, parity: draft.parity, previousComplications: draft.prevComp },
                    {
                        totalVisits: 0,
                        currentWeek: draft.gestationalAge ?? 0,
                        firstVisitWeek: draft.gestationalAge ?? null,
                        latestBpSystolic: null,
                        latestBpDiastolic: null,
                        latestHaemoglobin: null,
                        latestMalariaResult: null,
                        dangerSigns: [],
                    },
                    { thresholds: config.thresholds, scores: config.ruleScores }
                ),
            })
        })

        const total    = patients.length
        const highRisk = patients.filter(p => p.assessment.level === RISK_LEVELS.HIGH).length
        const moderate = patients.filter(p => p.assessment.level === RISK_LEVELS.MODERATE).length
        const normal   = total - highRisk - moderate
        const completion = total > 0
            ? Math.round((patients.filter(p => p.totalVisits >= 4).length / total) * 100)
            : 0

        return {
            total,
            highRisk,
            moderate,
            normal,
            totalVisits:      eventsArr.length,
            avgVisits:        total > 0 ? (eventsArr.length / total).toFixed(1) : '0',
            completionRate:   completion,
            riskDistribution: [
                { name: 'High risk', value: highRisk, color: config.riskColors?.high?.main || '#dc2626' },
                { name: 'Moderate',  value: moderate, color: config.riskColors?.moderate?.main || '#d97706' },
                { name: 'Normal',  value: normal,   color: config.riskColors?.normal?.main || '#16a34a' },
            ],
            monthlyTrend:     buildMonthlyTrend(eventsArr, dataElements),
            completionStages: buildCompletion(patients, byTEI),
            alertPatients:    patients
                .filter(p => p.assessment.level !== RISK_LEVELS.NORMAL)
                .sort((a, b) => b.assessment.score - a.assessment.score)
                .slice(0, 5),
        }
    }, [data, config, pendingPatients, attributes, dataElements])

    return { stats, loading, error }
}
