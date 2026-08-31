<script setup>
import BaseModal from '@/components/BaseModal.vue'
import { useConfirm } from '@/composables/useConfirm.js'

const { confirmState, accept, reject } = useConfirm()
</script>

<template>
    <BaseModal v-if="confirmState.open" id="confirmModal" :title="confirmState.title" title-tag="h5"
        @close="reject">
        {{ confirmState.message }}
        <template #footer>
            <button type="button" class="btn btn-outline-secondary btn-modal-cancel" @click="reject">
                {{ confirmState.cancelText }}
            </button>
            <button type="button" :class="['btn', confirmState.danger ? 'btn-danger' : 'btn-primary']"
                @click="accept">
                {{ confirmState.okText }}
            </button>
        </template>
    </BaseModal>
</template>
