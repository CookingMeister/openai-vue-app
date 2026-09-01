import { reactive, readonly } from 'vue'

// The values gpt-image-1 accepts. Anything outside these lists is rejected by
// the API, so the picker offers exactly this set and the server checks the
// request against the same lists before forwarding it.
export const IMAGE_SIZES = [
    { value: 'auto', label: 'Auto (model chooses)' },
    { value: '1024x1024', label: 'Square — 1024 × 1024' },
    { value: '1536x1024', label: 'Landscape — 1536 × 1024' },
    { value: '1024x1536', label: 'Portrait — 1024 × 1536' },
]

export const IMAGE_QUALITIES = [
    { value: 'auto', label: 'Auto (model chooses)' },
    { value: 'low', label: 'Low — fastest and cheapest' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High — most detail' },
]

export const DEFAULT_IMAGE_SETTINGS = { size: '1024x1024', quality: 'auto' }

const STORAGE_KEY = 'chatApp.imageSettings'

const isValid = (list, value) => list.some((option) => option.value === value)

const settings = reactive({ ...DEFAULT_IMAGE_SETTINGS })

const load = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')

        // A stored value that is no longer offered falls back to the default
        // rather than being sent on to be rejected.
        if (isValid(IMAGE_SIZES, saved.size)) settings.size = saved.size
        if (isValid(IMAGE_QUALITIES, saved.quality)) settings.quality = saved.quality
    } catch {
        // Corrupt entry: the defaults already stand.
    }
}

load()

export function useImageSettings() {
    const setImageSettings = ({ size, quality }) => {
        if (isValid(IMAGE_SIZES, size)) settings.size = size
        if (isValid(IMAGE_QUALITIES, quality)) settings.quality = quality

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...settings }))
        } catch (err) {
            console.warn('Could not save image settings:', err)
        }
    }

    return { imageSettings: readonly(settings), setImageSettings }
}
