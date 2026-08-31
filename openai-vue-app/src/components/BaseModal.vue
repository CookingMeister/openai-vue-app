<script setup>
import { computed } from 'vue'

// The three modals in this app are hand-rolled rather than Bootstrap Modal
// instances -- they are driven by a `v-if` on a ref, so there is no JS
// component to construct or dispose. This wraps the markup they were all
// repeating: dimmed backdrop, centred dialog, header with title and close
// button, and a footer slot for the actions.
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

defineEmits(['close', 'submit'])

const labelId = computed(() => (props.id ? `${props.id}Label` : undefined))
</script>

<template>
    <div :id="id || undefined" class="modal fade show d-block modal-dim" tabindex="-1"
        :aria-labelledby="labelId" aria-hidden="true">
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
</style>
