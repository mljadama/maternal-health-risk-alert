// src/hooks/useAlerts.js
// Reads shared trackerData from AppContext and filters to at-risk patients.

import { useMemo } from 'react'
import { assessRisk, RISK_LEVELS } from '../services/riskEngine.js'
import { useAppContext } from '../context/AppContext.jsx'
import { useDhis2Config } from './useDhis2Config.js'

const getAttr = (list = [], uid) => list.find(a => a.attribute === uid)?.value ?? null
const getDV   = (list = [], uid) => list.find(d => d.dataElement === uid)?.value ?? null

export function useAlerts({ includeLevels = [RISK_LEVELS.HIGH, RISK_LEVELS.MODERATE] } = {}) {
    const { config, loading: configLoading } = useDhis2Config()
    const {
        trackerData: data,
        trackerLoading,
        trackerError,
        refreshTracker,
    } = useAppContext()
    const { attributes, dataElements } = config

    const loading = configLoading || trackerLoading || (!data && !trackerError)
    const error = trackerError

    const ouMap = useMemo(() => {
        const map = {}
        const list = data?.orgUnits?.organisationUnits ?? (Array.isArray(data?.orgUnits) ? data.orgUnits : [])
        list.forEach(ou => {
            if (ou?.id) map[ou.id] = ou.displayName
        })
        return map
    }, [data])

    const alerts = useMemo(() => {
        if (!data) return []

        const rawTeis = Array.isArray(data.patients)
            ? data.patients
            : (data.patients?.trackedEntities ?? data.patients?.instances ?? data.patients?.trackedEntityInstances ?? [])
        const events = Array.isArray(data.events)
            ? data.events
            : (data.events?.events ?? data.events?.instances ?? [])

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

        return rawTeis
            .map(tei => {
                const id         = tei.trackedEntity || tei.trackedEntityInstance || tei.id
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
                    },
                    { thresholds: config.thresholds, scores: config.ruleScores }
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
    }, [data, ouMap, includeLevels, config, attributes, dataElements])

    return { alerts, loading, error, refetch: refreshTracker }
}
