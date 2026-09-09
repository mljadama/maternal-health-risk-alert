import { useAppContext } from '../context/AppContext.jsx'

export const TRACKER_SCOPE_ERROR_MESSAGE = 'User needs to be assigned either search or data capture org units. Contact your DHIS2 admin to assign teiSearchOrganisationUnits or dataViewOrganisationUnits.'

export function useTrackerOrgUnitScope() {
    const {
        meLoading,
        trackerOrgUnitIds,
        fallbackOrgUnitIds,
        preferredOrgUnitId,
    } = useAppContext()

    return {
        meLoading,
        meError: null,
        trackerOrgUnitIds,
        fallbackOrgUnitIds,
        primaryOrgUnitId: trackerOrgUnitIds[0] ?? null,
        fallbackOrgUnitId: fallbackOrgUnitIds[0] ?? null,
        preferredOrgUnitId,
        hasTrackerOrgUnitScope: trackerOrgUnitIds.length > 0,
    }
}
