import { useCallback, useEffect, useRef, useState } from 'react'
import { useDataEngine } from '@dhis2/app-runtime'
import { useLocation } from 'react-router-dom'
import { useAppContext } from '../context/AppContext.jsx'

const POST_SAVE_RETRY_MS = [800, 2200, 4500]

function sleep(ms) {
    return new Promise(resolve => window.setTimeout(resolve, ms))
}

export function useEngineListQuery({ enabled, query }) {
    const engine = useDataEngine()
    const location = useLocation()
    const { trackerEpoch } = useAppContext()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [refreshTick, setRefreshTick] = useState(0)
    const queryRef = useRef(query)
    queryRef.current = query
    const dataRef = useRef(data)
    dataRef.current = data

    const refetch = useCallback(() => {
        setRefreshTick(n => n + 1)
    }, [])

    useEffect(() => {
        if (!enabled || !queryRef.current) {
            return undefined
        }

        let cancelled = false

        const run = async () => {
            if (!dataRef.current) {
                setLoading(true)
            }
            try {
                const result = await engine.query(queryRef.current)
                if (cancelled) return false
                setData(result)
                setError(null)
                setLoading(false)
                return true
            } catch (err) {
                if (cancelled) return false
                setError(err)
                setLoading(false)
                return false
            }
        }

        ;(async () => {
            const ok = await run()
            if (!ok || cancelled) return
            if (!trackerEpoch) return

            for (const ms of POST_SAVE_RETRY_MS) {
                await sleep(ms)
                if (cancelled) return
                await run()
            }
        })()

        return () => {
            cancelled = true
        }
    }, [enabled, engine, trackerEpoch, location.key, refreshTick, query])

    return {
        data,
        loading: enabled ? loading : false,
        error: enabled ? error : null,
        refetch,
    }
}
