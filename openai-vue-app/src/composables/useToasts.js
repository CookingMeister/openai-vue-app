import { ref } from 'vue'

// Toasts, ported from section 6 of the vanilla chatapp script.
//
// The original drove a single Bootstrap toast element imperatively, which meant
// a second message replaced the first mid-display. Here the list is reactive
// and each toast owns its own timer, so several can stack.

// Bootstrap has no "error" or "info" contextual class; map onto the ones it
// does have rather than emitting a class that silently renders unstyled.
const TOAST_TYPE_MAP = {
    error: 'danger',
    warn: 'warning',
    warning: 'warning',
    info: 'primary',
    success: 'success',
    danger: 'danger',
    primary: 'primary',
}

const toasts = ref([])

let nextId = 1

export const useToasts = () => {
    const dismissToast = (id) => {
        const toast = toasts.value.find((t) => t.id === id)

        if (toast?.timer) clearTimeout(toast.timer)

        toasts.value = toasts.value.filter((t) => t.id !== id)
    }

    const showToast = (message, { type = 'primary', delay = 4000, autohide = true } = {}) => {
        const text = String(message ?? '').trim()
        if (!text) return null

        const id = nextId++
        const normalized = String(type || 'primary').toLowerCase()

        const toast = {
            id,
            message: text,
            type: TOAST_TYPE_MAP[normalized] || 'primary',
            timer: null,
        }

        if (autohide) {
            toast.timer = setTimeout(() => dismissToast(id), delay)
        }

        toasts.value = [...toasts.value, toast]
        return id
    }

    const clearToasts = () => {
        for (const t of toasts.value) {
            if (t.timer) clearTimeout(t.timer)
        }

        toasts.value = []
    }

    return { toasts, showToast, dismissToast, clearToasts }
}

export default useToasts
