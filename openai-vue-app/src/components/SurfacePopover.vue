<script setup>
// The shared popover surface: response stats and the context estimate are the
// same panel, as they were in the source template's single .ui-surface-pop
// family. Callers add their own class for placement (.stats-popover anchors
// inside a message bubble, .context-pop above the composer widget).
</script>

<template>
    <div class="ui-surface-pop" @click.stop>
        <slot />
    </div>
</template>

<style>
/* Deliberately not scoped: the rows are passed in through the slot, so they
   carry the caller's scope id rather than this component's. */
.ui-surface-pop {
    min-width: 220px;
    padding: 10px 14px;
    font-size: 12px;
    /* The airy row rhythm: rows carry no padding of their own. */
    line-height: 1.8;
    color: var(--text-primary);
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
    backdrop-filter: blur(10px);
    cursor: default;
}

.ui-surface-pop-title {
    font-weight: 500;
    font-size: 10px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 6px;
}

.ui-surface-pop-divider {
    border-top: 1px solid var(--border-color);
    margin: 6px 0;
}

.ui-surface-pop-row {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
}

.ui-surface-pop-label {
    color: var(--text-secondary);
}

.ui-surface-pop-value {
    font-weight: 500;
    color: var(--text-primary);
}

.ui-surface-pop-value.muted,
.ui-surface-pop-row.muted {
    color: var(--text-muted);
}
</style>
