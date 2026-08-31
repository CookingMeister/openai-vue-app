// Image helpers, ported from section 18 of the vanilla chatapp script.
//
// gpt-image-1 always returns base64 and never a hosted url, so the bytes are
// decoded once on arrival and everything downstream -- display, download,
// storage, re-editing -- works from that single Blob.

export const IMAGE_FORMAT = 'png'
export const IMAGE_MIME = `image/${IMAGE_FORMAT}`

export const base64ToBlob = (b64, mime = IMAGE_MIME) => {
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
    }

    return new Blob([bytes], { type: mime })
}

// Turn a prompt (or any alt text) into something Windows will accept as a
// file name.
export const toImageFileName = (name, ext = IMAGE_FORMAT) => {
    const base =
        String(name || '')
            .replace(/[\\/:*?"<>|]+/g, ' ') // illegal on Windows
            .replace(/\s+/g, '-')
            .replace(/^[-.]+|[-.]+$/g, '')
            .slice(0, 60) || 'image'

    return `${base}.${ext}`
}

export const clickDownloadLink = (href, fileName) => {
    const a = document.createElement('a')

    a.href = href
    a.download = fileName
    a.rel = 'noopener'

    document.body.appendChild(a)
    a.click()
    a.remove()
}
