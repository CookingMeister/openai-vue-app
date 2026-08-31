import axios from 'axios'
import FormData from 'form-data'

// Image model. The dall-e-* models are discontinued, so gpt-image is the only
// path: it always returns base64, never a hosted URL.
//
// That difference drives the rest of the image code. Under dall-e the client
// received a link that expired in about an hour, which is why generated images
// used to be displayed, downloaded and persisted through a server-side URL
// proxy. gpt-image hands back the bytes directly, so the client stores them in
// IndexedDB and renders a local blob url -- the proxy is gone.
const IMAGE_MODEL = 'gpt-image-1'
const IMAGE_FORMAT = 'png'
const IMAGE_SIZE = '1024x1024'

const GENERATION_URL = 'https://api.openai.com/v1/images/generations'
const EDIT_URL = 'https://api.openai.com/v1/images/edits'

const authHeaders = () => ({
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
})

// Both endpoints report failures the same way; keep one reader for them.
const upstreamError = (response) =>
    response.data?.error?.message || `Image request failed (${response.status})`

const generateImage = async (prompt) => {
    const response = await axios.post(
        GENERATION_URL,
        {
            model: IMAGE_MODEL,
            prompt,
            n: 1,
            size: IMAGE_SIZE,
            output_format: IMAGE_FORMAT,
        },
        {
            headers: { ...authHeaders(), 'Content-Type': 'application/json' },
            validateStatus: () => true,
        },
    )

    if (response.status >= 400) {
        throw new Error(upstreamError(response))
    }

    const item = response.data?.data?.[0]

    if (!item?.b64_json) {
        throw new Error('No image returned.')
    }

    return {
        b64_json: item.b64_json,
        format: IMAGE_FORMAT,
        prompt,
    }
}

// gpt-image-1 treats the mask as optional: without one it re-imagines the
// whole frame, which is what the "iterate on this image" flow wants. dall-e-2
// required a mask, so the client used to synthesise a fully transparent one.
const editImage = async (image, prompt, mask = null) => {
    const formData = new FormData()

    formData.append('model', IMAGE_MODEL)
    formData.append('image', image.buffer, {
        filename: image.originalname || 'image.png',
        contentType: image.mimetype || 'image/png',
    })

    if (mask) {
        formData.append('mask', mask.buffer, {
            filename: mask.originalname || 'mask.png',
            contentType: mask.mimetype || 'image/png',
        })
    }

    formData.append('prompt', prompt)
    formData.append('n', '1')
    formData.append('size', IMAGE_SIZE)

    const response = await axios.post(EDIT_URL, formData, {
        headers: { ...authHeaders(), ...formData.getHeaders() },
        validateStatus: () => true,
        // A 1024x1024 png round trip is comfortably over the default limits.
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
    })

    if (response.status >= 400) {
        throw new Error(upstreamError(response))
    }

    const item = response.data?.data?.[0]

    if (!item?.b64_json) {
        throw new Error('No image returned.')
    }

    return {
        b64_json: item.b64_json,
        format: IMAGE_FORMAT,
        prompt,
    }
}

export default { generateImage, editImage, IMAGE_MODEL, IMAGE_FORMAT }
