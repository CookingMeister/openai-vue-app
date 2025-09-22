import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import 'prismjs/themes/prism-tomorrow.min.css'

import Prism from 'prismjs'
import 'prismjs/plugins/autoloader/prism-autoloader'

// Configure the autoloader path (CDN with all components)
Prism.plugins.autoloader.languages_path = 'https://cdn.jsdelivr.net/npm/prismjs@1.30.0/components/'

import { createApp } from 'vue'
import App from './App.vue'
createApp(App).mount('#app')