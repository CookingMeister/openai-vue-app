// Language maps for Prism, ported verbatim from section 1 of the vanilla
// chatapp script.

export const LANG_ALIASES = {
    js: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    jsx: 'jsx',
    tsx: 'tsx',
    ts: 'typescript',
    sh: 'bash',
    shell: 'bash',
    zsh: 'bash',
    console: 'bash',
    postgres: 'sql',
    postgresql: 'sql',
    yml: 'yaml',
    md: 'markdown',
    text: 'none',
    plaintext: 'none',
    json5: 'json',
    jsonc: 'json',
    env: 'ini',
    dotenv: 'ini',
    docker: 'docker',
    dockerfile: 'docker',
    xml: 'markup',
    svg: 'markup',
    mathml: 'markup',
    xhtml: 'markup',
    html: 'markup',
    gql: 'graphql',
    graphql: 'graphql',
    ps: 'powershell',
    ps1: 'powershell',
    // Build/infra
    make: 'makefile',
    makefile: 'makefile',
    // Config
    properties: 'ini',
    conf: 'ini',
    cfg: 'ini',
    toml: 'toml',
    // Popular languages
    py: 'python',
    rb: 'ruby',
    php: 'php',
    java: 'java',
    cs: 'csharp',
    'c#': 'csharp',
    c: 'c',
    'c++': 'cpp',
    cpp: 'cpp',
    objc: 'objectivec',
    'objective-c': 'objectivec',
    swift: 'swift',
    go: 'go',
    rs: 'rust',
    rust: 'rust',
    kt: 'kotlin',
    kotlin: 'kotlin',
    plb: 'plb',
    'pl/b': 'plb',
}

// Minimal filename/extension support
export const FILE_EXT_TO_LANG = {
    js: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    ts: 'typescript',
    jsx: 'jsx',
    tsx: 'tsx',
    json: 'json',
    json5: 'json',
    yml: 'yaml',
    yaml: 'yaml',
    toml: 'toml',
    ini: 'ini',
    env: 'ini',
    html: 'markup',
    htm: 'markup',
    xml: 'markup',
    svg: 'markup',
    css: 'css',
    scss: 'scss',
    less: 'less',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    py: 'python',
    rb: 'ruby',
    php: 'php',
    java: 'java',
    cs: 'csharp',
    c: 'c',
    h: 'c',
    cpp: 'cpp',
    hpp: 'cpp',
    go: 'go',
    rs: 'rust',
    kt: 'kotlin',
    swift: 'swift',
    md: 'markdown',
    markdown: 'markdown',
    gql: 'graphql',
    graphql: 'graphql',
}

// Special filename cases
export const FILENAME_TO_LANG = {
    dockerfile: 'docker',
    Dockerfile: 'docker',
    makefile: 'makefile',
    Makefile: 'makefile',
    '.env': 'ini',
}

// Language dependency map for Prism. The bundled autoloader plugin this
// replaces does not know these, so a tsx block would highlight as plain text
// until jsx and typescript happened to be loaded by something else.
export const PRISM_DEPS = {
    // bases
    markup: [],
    clike: [],
    javascript: ['clike'],
    typescript: ['javascript'],
    jsx: ['markup', 'javascript'],
    tsx: ['jsx', 'typescript'],

    // languages that extend clike
    java: ['clike'],
    c: ['clike'],
    cpp: ['c'],
    objectivec: ['c'],
    csharp: ['clike'],
    kotlin: ['clike'],
    swift: ['clike'],
    go: ['clike'],

    // styles
    scss: ['css'],
    less: ['css'],

    // templating
    php: ['clike', 'markup', 'markup-templating'],

    // markup-adjacent
    markdown: ['markup'],
}

// Prism languages that don't exist or shouldn't be loaded. `plb` is the
// business language the system prompt claims expertise in; Prism has no
// grammar for it, so asking the CDN would 404 on every block.
export const SKIP_LANGUAGES = new Set(['none', 'plb', 'text', 'plaintext', 'plain'])

// Turn an info string, class, or filename into a Prism language key.
export const normalizeLanguage = (info = '') => {
    const raw = info == null ? '' : String(info).trim()
    if (!raw) return 'none'

    // First token up to whitespace
    let first = raw.split(/\s+/)[0]

    // Strip common prefixes (case-insensitive): language- or lang-
    first = first.replace(/^(?:language|lang)-/i, '')

    // If it's a path (e.g., "src/app.tsx"), keep only the filename segment
    if (first.includes('/')) first = first.split('/').pop()

    // Keep only the leading language-ish token (drop glued attrs like {1,3})
    const m = first.match(/^[A-Za-z0-9#+._-]+/)
    const token = (m ? m[0] : '').trim()
    if (!token) return 'none'

    const tokenLower = token.toLowerCase()

    // Dotfiles like ".env"
    if (token.startsWith('.') && token.length > 1) {
        if (FILENAME_TO_LANG[token] || FILENAME_TO_LANG[tokenLower]) {
            return FILENAME_TO_LANG[token] || FILENAME_TO_LANG[tokenLower]
        }
        // Drop leading dot for potential extension inference below
    }

    // Aliases (by language name)
    if (LANG_ALIASES[tokenLower]) return LANG_ALIASES[tokenLower]

    // Exact filename matches (case-insensitive)
    if (FILENAME_TO_LANG[token] || FILENAME_TO_LANG[tokenLower]) {
        return FILENAME_TO_LANG[token] || FILENAME_TO_LANG[tokenLower]
    }

    // Extension inference for filenames like "app.tsx" or "Package.JSON"
    const ext = (token.match(/\.([A-Za-z0-9]+)$/) || [])[1]
    if (ext && FILE_EXT_TO_LANG[ext.toLowerCase()]) {
        return FILE_EXT_TO_LANG[ext.toLowerCase()]
    }

    // Treat plain text synonyms
    if (
        tokenLower === 'plain' ||
        tokenLower === 'text' ||
        tokenLower === 'plaintext' ||
        tokenLower === 'none'
    ) {
        return 'none'
    }

    // Fallback: return normalized token as-is
    return tokenLower
}
