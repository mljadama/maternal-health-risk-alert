import { defineConfig } from 'vite'

// Same-origin proxy so the app can call /api without a CORS preflight
// to :8080/:8081. Wired through d2.config.js `viteConfigExtensions`.
const dhis2Proxy = {
    target: 'http://localhost:8080',
    changeOrigin: true,
    secure: false,
    cookieDomainRewrite: 'localhost',
}

const forceSameOriginDhis2Url = {
    name: 'force-same-origin-dhis2-url',
    transformIndexHtml: {
        order: 'pre',
        handler() {
            return [
                {
                    tag: 'script',
                    injectTo: 'head-prepend',
                    children:
                        "(function(){var o=location.origin;try{var k='DHIS2_BASE_URL';var u=localStorage.getItem(k);if(!u||/:(8080|8081)\\/?$/.test(u)){localStorage.setItem(k,o)}}catch(e){}function fix(){document.querySelectorAll('input').forEach(function(el){if(/localhost:808[01]/.test(el.value||'')){var d=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value');if(d&&d.set){d.set.call(el,o)}else{el.value=o}el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}})}var n=0;var t=setInterval(function(){fix();if(++n>50)clearInterval(t)},200)})();",
                },
            ]
        },
    },
}

export default defineConfig({
    plugins: [forceSameOriginDhis2Url],
    server: {
        proxy: {
            '/api': dhis2Proxy,
            '/dhis-web-commons-security': dhis2Proxy,
            '/dhis-web-commons': dhis2Proxy,
            '/dhis-web-login': dhis2Proxy,
        },
    },
})
