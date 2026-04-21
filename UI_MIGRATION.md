# Material UI to @dhis2/ui Migration Guide

## Migration Status
This document tracks the migration from Material UI (MUI) v5 to @dhis2/ui v9.

## Component Mapping: MUI → @dhis2/ui

### Layout & Containers
| MUI | @dhis2/ui | Notes |
|-----|-----------|-------|
| Box | Box | Similar API, use className for styling |
| Paper | N/A | Use Box with className instead |
| Card | Card | Different styling approach |
| Container | Box | Use Box with max-width |

### Text & Typography
| MUI | @dhis2/ui | Notes |
|-----|-----------|-------|
| Typography | Text | Different props (no variant prop) |
| divider | Divider | Similar functionality |

### Forms & Inputs
| MUI | @dhis2/ui | Notes |
|-----|-----------|-------|
| TextField | Input, InputField | InputField is recommended |
| MenuItem | N/A | Use Select component |
| Select | Select | Different API |
| Button | Button | Similar but different styling props |
| Checkbox | Checkbox | Similar API |
| Radio | Radio | Similar API |
| Switch | Switch | Similar API |
| FormControl/FormGroup | N/A | Use wrapper containers |

### Data Display
| MUI | @dhis2/ui | Notes |
|-----|-----------|-------|
| Table | DataTable | More powerful, different props |
| Chip | Chip, Tag | Use Chip or Tag depending on context |
| Alert | AlertBar | Different styling |
| Badge | Badge | Similar |
| Progress/LinearProgress | LinearProgress | N/A in @dhis2/ui v9 |

### Navigation
| MUI | @dhis2/ui | Notes |
|-----|-----------|-------|
| AppBar | N/A | Use Box or HeaderBar (if available) |
| Drawer | Drawer | Different styling |
| List/ListItem | N/A | Create custom or use Box |
| Breadcrumbs | N/A | Not in @dhis2/ui |

### Dialogs & Popovers
| MUI | @dhis2/ui | Notes |
|-----|-----------|-------|
| Dialog/Modal | Modal | Different styling |
| Popover | Popover | Similar |
| Snackbar | N/A | Use custom or other solution |
| Tooltip | Popover | Use Popover instead |

### Icons
| MUI | @dhis2/ui | Notes |
|-----|-----------|-------|
| @mui/icons-material | @dhis2/ui/icons | Different set of icons available |

## Styling Approach

### MUI (old):
```jsx
import { Box, Button } from '@mui/material'

export function Component() {
  return (
    <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
      <Button sx={{ fontWeight: 600 }} onClick={...}>Click</Button>
    </Box>
  )
}
```

### @dhis2/ui (new):
```jsx
import { Box, Button } from '@dhis2/ui'
import styles from './Component.module.css'

export function Component() {
  return (
    <Box className={styles.container}>
      <Button className={styles.button} onClick={...}>Click</Button>
    </Box>
  )
}
```

Or use inline styles with @dhis2/ui's useStyle utility when needed.

## Migration Phases

### Phase 1: Foundation (App.jsx, Layout, Navigation)
- Remove MUI theme
- Update App.jsx to use @dhis2/ui
- Update Layout sidebar and navigation
- Update top navigation bar

### Phase 2: Common Components
- ErrorAlert
- LoadingSpinner
- NotificationSnackbar  
- PageHeader
- Cards and containers

### Phase 3: Form Components
- PatientForm
- RegisterPatient
- RecordVisit
- All input fields and selects

### Phase 4: Data Display
- PatientCard
- VisitTable
- Charts (Recharts integration)
- Risk badges and alerts

### Phase 5: Pages
- Dashboard
- PatientList
- PatientDetail
- RiskAlerts

## Key Differences to Note

1. **Styling**: @dhis2/ui uses CSS modules and className instead of sx prop
2. **Theme**: No theme provider needed; colors are built-in
3. **Icons**: Different icon set; may need to find alternatives or create custom icons
4. **No Typography component**: Use Text component instead
5. **No built-in Linear Progress**: Consider custom solution or Chart.js
6. **DataTable**: More powerful than Table, but requires different props

## Installation
@dhis2/ui is already in package.json. No additional installation needed.

```bash
npm install  # Already has @dhis2/ui@^9.0.0
```

## Testing Strategy
1. Visual regression testing on each component
2. Ensure all interactions work (buttons, forms, navigation)
3. Test responsive design
4. Verify color contrast and accessibility
5. Test on different browsers

## Notes
- @dhis2/ui provides a consistent look and feel with other DHIS2 apps
- Component API is slightly different from MUI; requires familiarization
- Some MUI features may not have direct @dhis2/ui equivalents
- May need custom CSS for some styling needs
