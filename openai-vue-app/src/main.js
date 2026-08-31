import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import 'prismjs/themes/prism-tomorrow.min.css'

// After the vendor sheets: the theme tokens and body rules override Bootstrap.
import '@/assets/main.css'

// Load one shared Bootstrap runtime for dropdowns and custom tooltips. Expose
// it because the tooltip directive is mounted by Vue after this module runs.
import * as bootstrap from 'bootstrap'
globalThis.bootstrap = bootstrap

import { createApp } from 'vue'

import App from '@/App.vue'

// Prism grammars are loaded on demand by src/utils/prism.js, which resolves
// the alias table and the dependency graph. The bundled `autoloader` plugin
// that used to live here did neither: it asked the CDN for "prism-js.js" and
// loaded tsx without jsx or typescript.
createApp(App).mount('#app')
