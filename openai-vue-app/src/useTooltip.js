// A simple custom directive for Bootstrap v5 tooltips in Vue
export const vBTooltip = {
  mounted(el, binding) {
    import('bootstrap').then(bs => {
      el._tooltip = new bs.Tooltip(el, {
        title: binding.value,
        trigger: 'hover'
      });
    });
  },
  unmounted(el) {
    if (el._tooltip) {
      el._tooltip.dispose();
      el._tooltip = null;
    }
  }
}
