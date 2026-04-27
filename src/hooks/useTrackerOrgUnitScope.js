import { useDataQuery } from '@dhis2/app-runtime'
import { useMemo } from 'react'

export const TRACKER_SCOPE_ERROR_MESSAGE = 'User needs to be assigned either search or data capture org units. Contact your DHIS2 admin to assign teiSearchOrganisationUnits or dataViewOrganisationUnits.'

const ME_TRACKER_SCOPE_QUERY = {
    me: {
        resource: 'me',
        params: {
            fields: 'id,username,organisationUnits[id],dataViewOrganisationUnits[id],teiSearchOrganisationUnits[id]',
        },
    },
}

export function useTrackerOrgUnitScope() {
    const { data, loading, error } = useDataQuery(ME_TRACKER_SCOPE_QUERY)
    const me = data?.me

    const trackerOrgUnitIds = useMemo(() => {
        if (!me) return []

        // DHIS2 tracker APIs require search or data-capture scopes.
        const byPriority = [
            ...(me.teiSearchOrganisationUnits ?? []),
            ...(me.dataViewOrganisationUnits ?? []),
        ]

        return Array.from(new Set(byPriority.map(ou => ou?.id).filter(Boolean)))
    }, [me])

    const fallbackOrgUnitIds = useMemo(() => {
        if (!me) return []
        return Array.from(new Set((me.organisationUnits ?? []).map(ou => ou?.id).filter(Boolean)))
    }, [me])

    const primaryOrgUnitId = trackerOrgUnitIds[0] ?? null
    const fallbackOrgUnitId = fallbackOrgUnitIds[0] ?? null
    const preferredOrgUnitId = primaryOrgUnitId ?? fallbackOrgUnitId

    return {
        meLoading: loading,
        meError: error,
        trackerOrgUnitIds,
        fallbackOrgUnitIds,
        primaryOrgUnitId,
        fallbackOrgUnitId,
        preferredOrgUnitId,
        hasTrackerOrgUnitScope: trackerOrgUnitIds.length > 0,
    }
}
