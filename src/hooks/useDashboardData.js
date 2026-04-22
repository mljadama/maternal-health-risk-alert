// src/hooks/useDashboardData.js
// Aggregated stats for the dashboard from DHIS2 v42

import { useDataQuery } from '@dhis2/app-runtime'
import { useMemo } from 'react'
import { assessRisk, RISK_LEVELS } from '../services/riskEngine.js'
import { useDhis2Config } from './useDhis2Config.js'

const getAttr = (list = [], uid) => list.find(a => a.attribute === uid)?.value ?? null
const getDV   = (list = [], uid) => list.find(d => d.dataElement === uid)?.value ?? null

function buildMonthlyTrend(events) {
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
        const sys = Number(getDV(ev.dataValues, DATA_ELEMENTS.bpSystolic))
        const dia = Number(getDV(ev.dataValues, DATA_ELEMENTS.bpDiastolic))
        const hb  = Number(getDV(ev.dataValues, DATA_ELEMENTS.haemoglobin))
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

    const PATIENTS_QUERY = useMemo(() => ({
        patients: {
            resource: 'tracker/trackedEntities',
            params: {
                program: config.program.id,
                ouMode:  'ACCESSIBLE',
                fields:  'trackedEntity,attributes,enrollments[enrollment,enrolledAt,orgUnit]',
                paging:  false,
            },
        },
    }), [config.program.id])

    const EVENTS_QUERY = useMemo(() => ({
        events: {
            resource: 'tracker/events',
            params: {
                program:      config.program.id,
                programStage: config.programStage.id,
                ouMode:       'ACCESSIBLE',
                fields:       'event,trackedEntity,occurredAt,dataValues',
                paging:       false,
            },
        },
    }), [config.program.id, config.programStage.id])

    const { data: pData, loading: pl, error: pe } = useDataQuery(PATIENTS_QUERY, { lazy: configLoading })
    const { data: eData, loading: el, error: ee } = useDataQuery(EVENTS_QUERY, { lazy: configLoading })

    const loading = pl || el || configLoading
    const error   = pe || ee

    const stats = useMemo(() => {
        if (!pData || !eData) return null

        const teis   = pData.patients?.trackedEntities ?? []
        const events = eData.events?.events ?? []

        const byTEI = {}
        events.forEach(ev => {
            const id = ev.trackedEntity
            if (!byTEI[id]) byTEI[id] = []
            byTEI[id].push(ev)
        })
        Object.values(byTEI).forEach(a =>
            a.sort((x, y) => new Date(y.occurredAt) - new Date(x.occurredAt))
        )

        const patients = teis.map(tei => {
            const id     = tei.trackedEntity
            const visits = byTEI[id] ?? []
            const latest = visits[0] ?? null
            const first  = visits[visits.length - 1] ?? null
            const ga     = latest ? Number(getDV(latest.dataValues, DATA_ELEMENTS.gestationalAge)) : null
            const age    = Number(getAttr(tei.attributes, ATTRIBUTES.age))    || null
            const parity = Number(getAttr(tei.attributes, ATTRIBUTES.parity)) || 0
            const comp   = getAttr(tei.attributes, ATTRIBUTES.previousComplications)
            const danger = latest ? (getDV(latest.dataValues, DATA_ELEMENTS.dangerSigns) || '').split(',').filter(Boolean) : []

            const assessment = assessRisk(
                { age, parity, previousComplications: comp },
                {
                    totalVisits:         visits.length,
                    currentWeek:         ga ?? 0,
                    firstVisitWeek:      first ? Number(getDV(first.dataValues, DATA_ELEMENTS.gestationalAge)) : null,
                    latestBpSystolic:    latest ? Number(getDV(latest.dataValues, DATA_ELEMENTS.bpSystolic))    : null,
                    latestBpDiastolic:   latest ? Number(getDV(latest.dataValues, DATA_ELEMENTS.bpDiastolic))   : null,
                    latestHaemoglobin:   latest ? Number(getDV(latest.dataValues, DATA_ELEMENTS.haemoglobin))   : null,
                    latestMalariaResult: latest ? getDV(latest.dataValues, DATA_ELEMENTS.malariaTestResult)     : null,
                    dangerSigns:         danger,
                }
            )

            return {
                teiUid:     id,
                name:       getAttr(tei.attributes, ATTRIBUTES.fullName) ?? 'Unknown',
                age,
                ga,
                totalVisits: visits.length,
                lastVisit:   latest?.occurredAt ?? null,
                assessment,
            }
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
            totalVisits:      events.length,
            avgVisits:        total > 0 ? (events.length / total).toFixed(1) : '0',
            completionRate:   completion,
            riskDistribution: [
                { name: 'High risk', value: highRisk, color: '#dc2626' },
                { name: 'Moderate',  value: moderate, color: '#d97706' },
                { name: 'Normal',    value: normal,   color: '#16a34a' },
            ],
            monthlyTrend:     buildMonthlyTrend(events),
            completionStages: buildCompletion(patients, byTEI),
            alertPatients:    patients
                .filter(p => p.assessment.level !== RISK_LEVELS.NORMAL)
                .sort((a, b) => b.assessment.score - a.assessment.score)
                .slice(0, 5),
        }
    }, [pData, eData])

    return { stats, loading, error }
}