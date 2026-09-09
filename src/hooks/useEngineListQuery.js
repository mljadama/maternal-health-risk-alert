import { useCallback, useEffect, useRef, useState } from 'react'
import { useDataEngine } from '@dhis2/app-runtime'
import { useAppContext } from '../context/AppContext.jsx'

const RETRY_DELAYS = [800, 2200, 4500]

export function useEngineListQuery({ enabled, query }) {
    const engine = useDataEngine()
    const { trackerEpoch } = useAppContext()
    const [data, setData] = useState(null)
    const [error, setError] = useState(null)
    const [tick, setTick] = useState(0)

    const seqRef = useRef(0)
    const engineRef = useRef(engine)
    engineRef.current = engine
    const queryRef = useRef(query)
    queryRef.current = query

    const refetch = useCallback(() => setTick(t => t + 1), [])

    const queryKey = enabled && query ? JSON.stringify(query) : ''

    useEffect(() => {
        if (!queryKey) return undefined

        let active = true
        const seq = ++seqRef.current

        const doFetch = () => {
            engineRef.current
                .query(queryRef.current)
                .then(result => {
                    if (!active || seq !== seqRef.current) return
                    setData(result)
                    setError(null)
                })
                .catch(err => {
                    if (!active || seq !== seqRef.current) return
                    setError(err)
                })
        }

        doFetch()

        const timers = trackerEpoch
            ? RETRY_DELAYS.map(ms => window.setTimeout(doFetch, ms))
            : []

        return () => {
            active = false
            timers.forEach(window.clearTimeout)
        }
    }, [queryKey, trackerEpoch, tick])

    return {
        data,
        loading: Boolean(queryKey) && !data && !error,
        error: queryKey ? error : null,
        refetch,
    }
}
