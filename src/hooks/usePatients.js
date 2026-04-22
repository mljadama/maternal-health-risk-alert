// src/hooks/usePatients.js
import { useDataQuery } from '@dhis2/app-runtime'
import { useMemo } from 'react'
import { assessRisk } from '../services/riskEngine.js'
import { useDhis2Config } from './useDhis2Config.js'

const getAttr = (list = [], uid) =>
    list.find(a => a.attribute === uid)?.value ?? null

const getDV = (list = [], uid) =>
    list.find(d => d.dataElement === uid)?.value ?? null

export function usePatients() {
    const { config, loading: configLoading } = useDhis2Config()

    const PATIENTS_QUERY = useMemo(() => ({
        patients: {
            resource: 'tracker/trackedEntities',
            params: {
                program: config.program.id,
                ouMode:  'ACCESSIBLE',
                fields:  'trackedEntity,orgUnit,attributes,enrollments[enrollment,enrolledAt,orgUnit,orgUnitName,status]',
                paging:  false,
            },
        },
    }), [config.program.id])

    const EVENTS_QUERY = useMemo(() => ({
        events: {
            resource: 'tracker/events',
            params: {
                program:  config.program.id,
                ouMode:   'ACCESSIBLE',
                fields:   'event,trackedEntity,occurredAt,orgUnit,orgUnitName,dataValues',
                paging:   false,
            },
        },
    }), [config.program.id])

    const ORG_UNITS_QUERY = useMemo(() => ({
        orgUnits: {
            resource: 'organisationUnits',
            params: {
                fields:  'id,displayName',
                paging:  false,
            },
        },
    }), [])

    const { data: pData, loading: pl, error: pe, refetch: rp } = useDataQuery(PATIENTS_QUERY, { lazy: configLoading })
    const { data: eData, loading: el, error: ee, refetch: re } = useDataQuery(EVENTS_QUERY, { lazy: configLoading })
    const { data: ouData, loading: ol } = useDataQuery(ORG_UNITS_QUERY, { lazy: configLoading })

    const loading = pl || el || ol || configLoading
    const error   = pe || ee

    const ouMap = useMemo(() => {
        const map = {}
        ouData?.orgUnits?.organisationUnits?.forEach(ou => {
            map[ou.id] = ou.displayName
        })
        return map
    }, [ouData])

    const patients = useMemo(() => {
        if (!pData || !eData) return []

        const rawTeis = pData.patients?.trackedEntities ?? []
        const events = eData.events?.events ?? []

        // Some DHIS2 responses can include repeated tracked entities across enrollments/pages.
        // Keep the last seen entry per UID so each patient renders once.
        const teis = Array.from(
            rawTeis.reduce((acc, tei) => {
                if (tei?.trackedEntity) {
                    acc.set(tei.trackedEntity, tei)
                }
                return acc
            }, new Map()).values()
        )

        const byTEI = {}
        events.forEach(ev => {
            const id = ev.trackedEntity
            if (!byTEI[id]) byTEI[id] = []
            byTEI[id].push(ev)
        })
        Object.values(byTEI).forEach(arr =>
            arr.sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))
        )

        return teis.map(tei => {
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

            // Resolve facility name from multiple sources
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
                teiUid:         id,
                name:           getAttr(tei.attributes, ATTRIBUTES.fullName)    ?? 'Unknown',
                age,
                village:        getAttr(tei.attributes, ATTRIBUTES.village)     ?? '—',
                phoneNumber:    getAttr(tei.attributes, ATTRIBUTES.phoneNumber) ?? '—',
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
    }, [pData, eData, ouMap])

    return {
        patients,
        loading,
        error,
        refetch: () => { rp(); re() },
    }
}