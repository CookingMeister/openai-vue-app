<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

// The modals here are hand-rolled rather than Bootstrap Modal instances --
// they are driven by a `v-if` on a ref, so there is no JS component to
// construct or dispose. This wraps the markup all of them repeated (dimmed
// backdrop, centred dialog, header, footer) and the dialog behaviour Bootstrap
// would otherwise have provided: Escape to dismiss, a click outside, focus
// moved in and returned, Tab kept inside, and the page behind held still.
const props = defineProps({
    // Applied to the modal root. Existing ids are kept because CSS hooks off
    // them (#ragSettingsModal sizes its fields).
    id: { type: String, default: '' },
    title: { type: String, required: true },
    // Bootstrap Icons class shown before the title, e.g. 'bi-magic'.
    icon: { type: String, default: '' },
    titleTag: { type: String, default: 'h5' },
    // 'form' when the body is a form the footer submits; 'div' otherwise.
    as: { type: String, default: 'div' },
})

const emit = defineEmits(['close', 'submit'])

const root = ref(null)
const labelId = computed(() => (props.id ? `${props.id}Label` : undefined))

const FOCUSABLE = [
    'a[href]', 'button:not([disabled])', 'input:not([disabled])',
    'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',')

const focusable = () =>
    Array.from(root.value?.querySelectorAll(FOCUSABLE) || []).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
    )

const onKeydown = (event) => {
    if (event.key === 'Escape') {
        event.preventDefault()
        emit('close')
        return
    }

    if (event.key !== 'Tab') return

    // Wrap at both ends so focus cannot walk out into the page behind.
    const items = focusable()
    if (!items.length) return

    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement

    if (event.shiftKey && (active === first || !root.value?.contains(active))) {
        event.preventDefault()
        last.focus()
    } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
    }
}

let previouslyFocused = null
let restoreOverflow = ''

onMounted(async () => {
    previouslyFocused = document.activeElement
    restoreOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeydown)

    await nextTick()
    // An explicit autofocus wins; otherwise the first control, falling back to
    // the dialog itself so the keydown handler still has somewhere to land.
    const target = root.value?.querySelector('[autofocus]') || focusable()[0] || root.value
    target?.focus()
})

onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeydown)
    document.body.style.overflow = restoreOverflow
    previouslyFocused?.focus?.()
})
</script>

<template>
    <div ref="root" :id="id || undefined" class="modal fade show d-block modal-dim" tabindex="-1"
        role="dialog" aria-modal="true" :aria-labelledby="labelId" @click.self="$emit('close')">
        <div class="modal-dialog modal-dialog-centered">
            <component :is="as" class="modal-content" @submit.prevent="$emit('submit')">
                <div class="modal-header">
                    <component :is="titleTag" class="modal-title" :id="labelId">
                        <i v-if="icon" :class="['bi', icon, 'me-1']" aria-hidden="true"></i>{{ title }}
                    </component>
                    <button type="button" class="btn-close btn-close-white" aria-label="Close"
                        @click="$emit('close')"></button>
                </div>
                <div class="modal-body">
                    <slot />
                </div>
                <div class="modal-footer">
                    <slot name="footer" />
                </div>
            </component>
        </div>
    </div>
</template>

<style scoped>
/* Was an inline style repeated on every modal root. */
.modal-dim {
    background-color: rgba(0, 0, 0, 0.5);
}

/* The root takes focus when a dialog has no controls of its own; it should not
   draw a focus ring for that. */
.modal:focus {
    outline: none;
}
</style>
