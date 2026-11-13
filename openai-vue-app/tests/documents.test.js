import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { JSDOM } from 'jsdom'

import { extractTextFromFile, htmlToEmbeddableText } from '../src/utils/documents.js'
import { chunkTextByTokens } from '../src/composables/useTokens.js'

const dom = new JSDOM('')
const previousParser = globalThis.DOMParser
globalThis.DOMParser = dom.window.DOMParser
after(() => {
    if (previousParser === undefined) delete globalThis.DOMParser
    else globalThis.DOMParser = previousParser
    dom.window.close()
})

const file = (html, name = 'manual.html', type = 'text/html') => ({
    name, type, text: async () => html,
})

const wordCounts = (text) => {
    const counts = new Map()
    for (const word of text.trim().split(/\s+/)) {
        counts.set(word, (counts.get(word) || 0) + 1)
    }
    return counts
}

test('separates adjacent blocks, cells and line breaks without splitting inline words', () => {
    const text = htmlToEmbeddableText(
        '<p>Alpha</p><p>Beta<br>Gamma</p>' +
        '<table><tr><td>READ</td><td>Description</td></tr></table>' +
        '<p>READ<b>,</b> file<b>name</b> &amp; value</p>',
    )
    assert.equal(text, 'Alpha\n\nBeta\n\nGamma\n\nREAD\n\nDescription\n\nREAD, filename & value')
})

test('retains title and avoids duplicating a matching first heading', () => {
    assert.equal(htmlToEmbeddableText('<title>Manual &amp; Help</title><p>Body</p>'),
        'Manual & Help\n\nBody')
    assert.equal(htmlToEmbeddableText('<title>Manual</title><h1>MANUAL</h1><p>Body</p>'),
        'MANUAL\n\nBody')
})

test('retains nested lists, nested layout tables, captions and every data column exactly once', () => {
    const text = htmlToEmbeddableText(`
        <table><caption>CaptionMarker</caption><tr><td><h1>HeadingMarker</h1>
          <ul><li>ParentMarker<ul><li>NestedMarker</li></ul>TailMarker</li></ul>
          <table><tr><th>Code</th><th>Description</th><th>Notes</th></tr>
            <tr><td>$CLOSE</td><td>DescriptionMarker</td><td>ThirdColumnMarker</td></tr>
            <tr><td>*ABSON</td><td>-1</td><td>!!!</td></tr>
          </table>
        </td></tr></table>`)
    for (const marker of ['CaptionMarker', 'HeadingMarker', 'ParentMarker', 'NestedMarker',
        'TailMarker', '$CLOSE', 'DescriptionMarker', 'ThirdColumnMarker', '*ABSON', '-1', '!!!']) {
        assert.equal(text.split(marker).length - 1, 1, marker)
    }
    assert.ok(text.indexOf('NestedMarker') < text.indexOf('TailMarker'))
})

test('does not apply a rendering allowlist or remove meaningful navigation and See Also text', () => {
    const text = htmlToEmbeddableText(
        '<article><custom-wrapper>Custom content</custom-wrapper></article>' +
        '<nav>Related topic</nav><p>See Also: Another topic</p>',
    )
    assert.equal(text, 'Custom content\n\nRelated topic\n\nSee Also: Another topic')
})

test('preserves preformatted code line breaks and indentation', () => {
    assert.equal(htmlToEmbeddableText('<p>Before</p><pre>if (ready) {\n    run();\n}</pre><p>After</p>'),
        'Before\n\nif (ready) {\n    run();\n}\n\nAfter')
})

test('excludes script/style and non-prose fallback content without executing uploaded scripts', () => {
    const text = htmlToEmbeddableText('<style>STYLE_SECRET</style><p>Safe</p>' +
        '<script>globalThis.EXTRACTION_EXECUTED = true</script>' +
        '<iframe>FRAME_SECRET</iframe><noscript>FALLBACK_SECRET</noscript>' +
        '<template>TEMPLATE_SECRET</template>')
    assert.equal(text, 'Safe')
    assert.equal(globalThis.EXTRACTION_EXECUTED, undefined)
})

test('handles fragments, empty documents and title-only documents', () => {
    assert.equal(htmlToEmbeddableText('plain <b>fragment</b>'), 'plain fragment')
    assert.equal(htmlToEmbeddableText(''), '')
    assert.equal(htmlToEmbeddableText('<script>onlyScript()</script>'), '')
    assert.equal(htmlToEmbeddableText('<title>Only title</title>'), 'Only title')
})

test('uses the same extraction for HTML extension, MIME type and sniffed HTML', async () => {
    const html = '<!doctype html><title>Title</title><p>One</p><p>Two</p>'
    const expected = 'Title\n\nOne\n\nTwo'
    for (const [name, type] of [['manual.htm', ''], ['manual.txt', 'text/html'], ['manual.txt', 'text/plain']]) {
        assert.equal(await extractTextFromFile(file(html, name, type)), expected)
    }
    assert.equal(await extractTextFromFile(file('plain\u0000 text', 'manual.txt', 'text/plain')), 'plain text')
})

test('large HTML retains every content word through extraction and embedding chunk preparation', async () => {
    const words = Array.from({ length: 2400 }, (_, i) => `word${i}`)
    const html = '<title>DocumentTitle</title><table><tr><td><ul><li>' +
        words.slice(0, 800).join(' ') + '<ul><li>' + words.slice(800, 1600).join(' ') +
        '</li></ul></li></ul></td><td>' + words.slice(1600).join(' ') + '</td></tr></table>'
    const text = await extractTextFromFile(file(html))
    const expected = ['DocumentTitle', ...words].join(' ')
    assert.deepEqual(wordCounts(text), wordCounts(expected))

    const chunks = chunkTextByTokens(text, 200, 0)
    assert.ok(chunks.length > 1)
    assert.deepEqual(wordCounts(chunks.map((chunk) => chunk.text).join(' ')), wordCounts(expected))

    // Production overlap intentionally duplicates words, but must never lose one.
    const overlapping = chunkTextByTokens(text, 500, 64)
    const embeddedWords = wordCounts(overlapping.map((chunk) => chunk.text).join(' '))
    for (const word of ['DocumentTitle', ...words]) assert.ok(embeddedWords.has(word), word)
})
