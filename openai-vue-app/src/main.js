import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import 'prismjs/themes/prism-tomorrow.min.css'

// Bootstrap's JS, for the input dropdown. Only the CSS was loaded before,
// which is why nothing here previously used a data-bs-toggle component.
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

import { createApp } from 'vue'

import App from './App.vue'

// Prism grammars are loaded on demand by src/utils/prism.js, which resolves
// the alias table and the dependency graph. The bundled `autoloader` plugin
// that used to live here did neither: it asked the CDN for "prism-js.js" and
// loaded tsx without jsx or typescript.
createApp(App).mount('#app')
