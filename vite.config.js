import { defineConfig } from 'vite'

export default defineConfig({
    server: {
        proxy: {
            '/api': {
                target:       'http://localhost:8080',
                changeOrigin: true,
                secure:       false,
            },
            '/dhis-web-commons-security': {
                target:       'http://localhost:8080',
                changeOrigin: true,
                secure:       false,
            },
            '/dhis-web-commons': {
                target:       'http://localhost:8080',
                changeOrigin: true,
                secure:       false,
            },
        },
    },
})