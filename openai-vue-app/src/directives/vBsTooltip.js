const getTooltipClass = () => globalThis.bootstrap?.Tooltip

const tooltipText = (binding) => {
    const value = binding.value

    if (value && typeof value === 'object') return String(value.title || '')
    return value == null ? '' : String(value)
}

const tooltipOptions = (binding) => {
    const value = binding.value
    const supplied = value && typeof value === 'object' ? value : {}

    return {
        trigger: 'hover focus',
        container: 'body',
        placement: supplied.placement || 'top',
        popperConfig: (defaults) => ({ ...defaults, strategy: 'fixed' }),
    }
}

const disposeTooltip = (el) => {
    getTooltipClass()?.getInstance(el)?.dispose()
    delete el._tooltipText
}

const syncTooltip = (el, binding) => {
    const Tooltip = getTooltipClass()
    const text = tooltipText(binding)

    if (!Tooltip) return

    let instance = Tooltip.getInstance(el)

    if (!text) {
        disposeTooltip(el)
        el.removeAttribute('data-bs-title')
        return
    }

    el.setAttribute('data-bs-title', text)

    if (!instance) {
        instance = new Tooltip(el, tooltipOptions(binding))
    } else if (el._tooltipText !== text) {
        instance.setContent({ '.tooltip-inner': text })
    }

    el._tooltipText = text
}

// bootstrap.bundle is loaded by main.js before Vue mounts. Bootstrap removes
// the native `title` attribute while active, so every element using this
// directive gets the themed app tooltip rather than the browser popup. It also
// follows reactive labels and disposes body-teleported tips with their trigger.
export const vBsTooltip = {
    mounted(el, binding) {
        syncTooltip(el, binding)

        // A tooltip opened by hover/focus must not remain over a modal or a
        // freshly reset chat after its trigger has been activated.
        el._tooltipClickHandler = () => getTooltipClass()?.getInstance(el)?.hide()
        el.addEventListener('click', el._tooltipClickHandler)

        // Bootstrap's "focus" trigger fires for programmatic focus too, so a
        // dialog returning focus to the button that opened it re-showed its
        // tooltip with the pointer nowhere near. :focus-visible tells the two
        // apart: it stays true for keyboard users, who do want the label, and
        // false when focus was restored after a click.
        el._tooltipShowHandler = (event) => {
            if (!el.matches(':hover') && !el.matches(':focus-visible')) {
                event.preventDefault()
            }
        }
        el.addEventListener('show.bs.tooltip', el._tooltipShowHandler)
    },
    updated: syncTooltip,
    beforeUnmount(el) {
        el.removeEventListener('click', el._tooltipClickHandler)
        el.removeEventListener('show.bs.tooltip', el._tooltipShowHandler)
        delete el._tooltipClickHandler
        delete el._tooltipShowHandler
        disposeTooltip(el)
    },
}

export default vBsTooltip
