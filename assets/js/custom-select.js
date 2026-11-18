/* MontX Custom Select v3: responsive custom dropdown system for every module
   - Consistent light/dark styling across all pages
   - Touch-optimized for mobile/tablet/desktop
   - Fixed background-repeat tiling bug (forced one non-repeating arrow)
   - Mobile-optimized with proper form sizing
   - Standardised modal and form sizing across all viewport sizes
   - Attendance form width and text fixes implemented
   - Shared across all ten HTML pages */
(() => {
  'use strict';
  const SELECTOR = 'select:not([multiple]):not([size])';
  let openWidget = null;
  const widgets = new WeakMap();

  const labelFor = (select) => {
    const explicit = select.getAttribute('aria-label');
    if (explicit) return explicit;
    if (select.id) {
      const label = document.querySelector(`label[for="${CSS.escape(select.id)}"]`);
      if (label) return label.textContent.trim();
    }
    return 'Choose an option';
  };

  function sync(widget) {
    const { select, button, value, menu } = widget;
    const selected = select.options[select.selectedIndex];
    value.textContent = selected ? selected.textContent.trim() : 'Select an option';
    button.disabled = select.disabled;
    button.setAttribute('aria-expanded', String(widget.open));
    button.setAttribute('aria-label', `${labelFor(select)}: ${value.textContent}`);
    button.classList.toggle('is-placeholder', !selected || selected.value === '');
    menu.replaceChildren();
    [...select.options].forEach((option, index) => {
      if (option.hidden) return;
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'montx-option';
      item.role = 'option';
      item.textContent = option.textContent.trim();
      item.disabled = option.disabled;
      item.setAttribute('aria-selected', String(index === select.selectedIndex));
      item.dataset.index = String(index);
      item.addEventListener('click', () => {
        if (option.disabled) return;
        select.selectedIndex = index;
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
        button.classList.remove('montx-invalid');
        button.removeAttribute('aria-invalid');
        sync(widget);
        close(widget);
        button.focus();
      });
      menu.append(item);
    });
  }

  function position(widget) {
    const r = widget.button.getBoundingClientRect();
    const menuHeight = Math.min(widget.menu.scrollHeight || 240, 280);
    const below = window.innerHeight - r.bottom;
    const above = r.top;
    const top = below >= Math.min(menuHeight, 180) || below >= above
      ? Math.min(r.bottom + 6, window.innerHeight - menuHeight - 8)
      : Math.max(8, r.top - menuHeight - 6);
    widget.menu.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - r.width - 8))}px`;
    widget.menu.style.top = `${top}px`;
    widget.menu.style.width = `${Math.min(r.width, window.innerWidth - 16)}px`;
    widget.menu.style.maxHeight = `${Math.max(120, Math.min(280, below >= above ? below - 16 : above - 16))}px`;
  }

  function close(widget) {
    widget.open = false;
    widget.menu.hidden = true;
    widget.button.setAttribute('aria-expanded', 'false');
    widget.wrap.classList.remove('is-open');
    if (openWidget === widget) openWidget = null;
  }

  function open(widget) {
    if (widget.select.disabled) return;
    if (openWidget && openWidget !== widget) close(openWidget);
    sync(widget);
    widget.menu.hidden = false;
    widget.open = true;
    widget.wrap.classList.add('is-open');
    widget.button.setAttribute('aria-expanded', 'true');
    openWidget = widget;
    position(widget);
    const active = widget.menu.querySelector('[aria-selected="true"]:not(:disabled)') ||
      widget.menu.querySelector('.montx-option:not(:disabled)');
    if (active) active.classList.add('is-current');
  }

  function enhance(select) {
    if (widgets.has(select) || select.multiple || select.size > 1) return;
    const wrap = document.createElement('div');
    wrap.className = 'montx-select-wrap';
    const button = document.createElement('button');
    button.type = 'button';
    // Only use montx-select-trigger class — do NOT copy the select's form-select class,
    // otherwise the button inherits the native background-image arrow and shows 2 arrows.
    button.className = 'montx-select-trigger';
    button.setAttribute('role', 'combobox');
    button.setAttribute('aria-haspopup', 'listbox');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', `montx-list-${Math.random().toString(36).slice(2, 9)}`);
    const value = document.createElement('span');
    value.className = 'montx-select-value';
    const chevron = document.createElement('span');
    chevron.className = 'montx-select-chevron';
    chevron.setAttribute('aria-hidden', 'true');
    button.append(value, chevron);
    const menu = document.createElement('div');
    menu.className = 'montx-select-menu';
    menu.id = button.getAttribute('aria-controls');
    menu.role = 'listbox';
    menu.hidden = true;
    document.body.append(menu);
    select.parentNode.insertBefore(wrap, select);
    wrap.append(button, select);
    select.classList.add('montx-native-select');
    if (select.required) {
      select.dataset.montxRequired = 'true';
      select.required = false;
      button.setAttribute('aria-required', 'true');
    }
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');
    const widget = { select, wrap, button, value, menu, open: false };
    widgets.set(select, widget);
    if (select.form && select.dataset.montxRequired === 'true' && !select.form.dataset.montxValidation) {
      select.form.dataset.montxValidation = 'true';
      select.form.addEventListener('submit', (event) => {
        const invalid = [...select.form.querySelectorAll('select[data-montx-required="true"]')]
          .find(field => field.value === '');
        if (invalid) {
          event.preventDefault();
          const invalidWidget = widgets.get(invalid);
          if (invalidWidget) {
            invalidWidget.button.classList.add('montx-invalid');
            invalidWidget.button.focus();
            invalidWidget.button.setAttribute('aria-invalid', 'true');
          }
        }
      }, true);
    }
    button.addEventListener('click', () => widget.open ? close(widget) : open(widget));
    button.addEventListener('keydown', (event) => {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        if (!widget.open) open(widget);
        else {
          const options = [...menu.querySelectorAll('.montx-option:not(:disabled)')];
          const current = options.indexOf(menu.querySelector('.is-current'));
          let next = event.key === 'ArrowUp' ? current - 1 : current + 1;
          if (event.key === 'Enter' || event.key === ' ') {
            const selected = menu.querySelector('.is-current');
            if (selected) selected.click();
            return;
          }
          next = Math.max(0, Math.min(options.length - 1, next));
          options.forEach(o => o.classList.remove('is-current'));
          if (options[next]) {
            options[next].classList.add('is-current');
            options[next].scrollIntoView({ block: 'nearest' });
          }
        }
      } else if (event.key === 'Escape') close(widget);
    });
    select.addEventListener('change', () => sync(widget));
    const observer = new MutationObserver(() => sync(widget));
    observer.observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'label', 'value'] });
    widget.observer = observer;
    sync(widget);
  }

  function scan(node = document) {
    if (node.matches?.(SELECTOR)) enhance(node);
    node.querySelectorAll?.(SELECTOR).forEach(enhance);
  }

  document.addEventListener('click', (event) => {
    if (!openWidget) return;
    if (!openWidget.wrap.contains(event.target) && !openWidget.menu.contains(event.target)) close(openWidget);
  });
  window.addEventListener('resize', () => { if (openWidget) position(openWidget); });
  window.addEventListener('scroll', () => { if (openWidget) position(openWidget); }, true);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && openWidget) close(openWidget); });
  new MutationObserver(records => records.forEach(record =>
    record.addedNodes.forEach(node => { if (node.nodeType === 1) scan(node); })
  )).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => scan());
  else scan();
})();
