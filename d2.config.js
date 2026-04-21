// d2.config.js
// ─────────────────────────────────────────────────────────────
// DHIS2 App Platform configuration
// Compatible with @dhis2/cli-app-scripts v12.x
//
// Proxy is configured via --proxy flag in package.json:
//   d2-app-scripts start --proxy https://play.dhis2.org/demo
// ─────────────────────────────────────────────────────────────
// d2.config.js
const config = {
    type: 'app',
    name: 'Maternal Health Risk Alert',
    title: 'Maternal Health Risk Alert',
    version: '1.0.1',
    description: 'Automated antenatal care risk assessment and patient tracking',
    minDHIS2Version: '2.38',
    entryPoints: {
        app: './src/App.jsx',
    },
}

module.exports = config