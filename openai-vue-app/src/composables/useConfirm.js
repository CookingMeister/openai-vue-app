import { reactive, readonly } from 'vue'

// A promise-based replacement for window.confirm, matching the source app's
// showConfirm(): the caller awaits a boolean and never touches the modal.
// The state is module-level because one dialog serves the whole app -- a
// second request while one is open would have nowhere to render.
const state = reactive({
    open: false,
    message: '',
    title: 'Confirm',
    okText: 'Yes',
    cancelText: 'Cancel',
    danger: false,
})

let resolver = null

const settle = (value) => {
    state.open = false

    // Guard against a double settle: Escape closing the dialog can arrive
    // after the button click that already resolved it.
    const resolve = resolver
    resolver = null
    resolve?.(value)
}

export function useConfirm() {
    const confirm = (message, options = {}) => {
        // An outstanding request is answered "no" rather than left dangling.
        settle(false)

        Object.assign(state, {
            open: true,
            message: message ?? 'Are you sure?',
            title: options.title ?? 'Confirm',
            okText: options.okText ?? 'Yes',
            cancelText: options.cancelText ?? 'Cancel',
            danger: options.danger ?? false,
        })

        return new Promise((resolve) => {
            resolver = resolve
        })
    }

    return {
        confirmState: readonly(state),
        confirm,
        accept: () => settle(true),
        reject: () => settle(false),
    }
}
