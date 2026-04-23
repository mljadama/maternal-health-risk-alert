// src/hooks/useVisits.js
// Fetches all ANC visit events for a specific patient
// GET /api/tracker/events?trackedEntity=<uid>

import { useDataQuery } from '@dhis2/app-runtime'
import { useMemo } from 'react'
import { useDhis2Config } from './useDhis2Config.js'

const getDV = (list = [], uid) =>
    list.find(d => d.dataElement === uid)?.value ?? null

export function useVisits(teiUid) {
    const { config, loading: configLoading } = useDhis2Config()
    const { dataElements } = config

    const VISITS_QUERY = useMemo(() => ({
        visits: {
            resource: 'tracker/events',
            params: ({ teiUid }) => ({
                program:       config.program.id,
                programStage:  config.programStage.id,
                trackedEntity: teiUid,
                ouMode:        'ACCESSIBLE',
                fields:        'event,trackedEntity,occurredAt,orgUnit,orgUnitName,status,dataValues',
                order:         'occurredAt:asc',
                paging:        false,
            }),
        },
    }), [config.program.id, config.programStage.id, teiUid])

    const { data, loading, error, refetch } = useDataQuery(VISITS_QUERY, {
        variables: { teiUid },
        lazy:      !teiUid || configLoading,
    })

    const visits = useMemo(() => {
        if (!data) return []
        return (data.visits?.events ?? []).map((ev, idx) => ({
            eventUid:      ev.event,
            eventDate:     ev.occurredAt,
            facility:      ev.orgUnitName ?? '—',
            orgUnit:       ev.orgUnit,
            visitNumber:   idx + 1,
            bpSystolic:    Number(getDV(ev.dataValues, dataElements.bpSystolic))    || null,
            bpDiastolic:   Number(getDV(ev.dataValues, dataElements.bpDiastolic))   || null,
            haemoglobin:   Number(getDV(ev.dataValues, dataElements.haemoglobin))   || null,
            weight:        Number(getDV(ev.dataValues, dataElements.weight))        || null,
            gestationalAge:Number(getDV(ev.dataValues, dataElements.gestationalAge))|| null,
            malariaResult: getDV(ev.dataValues, dataElements.malariaTestResult),
            ironGiven:     getDV(ev.dataValues, dataElements.ironSupplementation) === 'true',
            folicGiven:    getDV(ev.dataValues, dataElements.folicAcid) === 'true',
            dangerSigns:   (getDV(ev.dataValues, dataElements.dangerSigns) || '').split(',').map(s => s.trim()).filter(Boolean),
            nurseNotes:    getDV(ev.dataValues, dataElements.nurseNotes),
            nextVisitDate: getDV(ev.dataValues, dataElements.nextVisitDate),
        }))
    }, [data])

    const chartData = useMemo(() => visits.map(v => ({
        label:  v.eventDate ? new Date(v.eventDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }) : `V${v.visitNumber}`,
        sys:    v.bpSystolic,
        dia:    v.bpDiastolic,
        hb:     v.haemoglobin,
        weight: v.weight,
        ga:     v.gestationalAge,
    })), [visits])

    return { visits, chartData, loading: loading || configLoading, error, refetch }
}