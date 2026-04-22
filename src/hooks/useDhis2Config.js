import { useAppContext } from '../context/AppContext.jsx'
import { normalizeAppSettings } from '../config/appSettings.js'

export function useDhis2Config() {
  const { appSettings, appSettingsLoading } = useAppContext()

  return {
    config: normalizeAppSettings(appSettings),
    loading: appSettingsLoading,
  }
}
