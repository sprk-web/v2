import { SITE_CONFIG } from '../config.js';
import { createSprkLogo } from '../logo.js';

(() => {
  const ACCENT_KEY = 'sprk-accent';
  const THEME_KEY = 'sprk-theme';
  const defaultAccent = SITE_CONFIG.theme.defaultAccent;
  const defaultMode = SITE_CONFIG.theme.defaultMode;
  const presets = SITE_CONFIG.theme.accents;
  const options = SITE_CONFIG.controls || {};
  const links = SITE_CONFIG.navigation || [];
  const simulatorPath = SITE_CONFIG.simulatorPath || '/simulator/';
  const isSimulator = false;

  let savedTheme = defaultMode;
  let savedAccent = defaultAccent;
  try {
    const storedTheme = localStorage.getItem(THEME_KEY) || localStorage.getItem('theme');
    savedTheme = ['system', 'light', 'dark'].includes(storedTheme) ? storedTheme : defaultMode;
    const storedAccent = localStorage.getItem(ACCENT_KEY);
    savedAccent = storedAccent && /^#[\da-f]{6}$/i.test(storedAccent) ? storedAccent : defaultAccent;
  } catch (error) {
    console.warn('Unable to read saved appearance preferences:', error);
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);
  }

  function applyTheme(theme) {
    const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.dataset.colorTheme = dark ? 'dark' : 'light';
  }

  function themeLabel(theme) {
    return theme.charAt(0).toUpperCase() + theme.slice(1);
  }

  function themeIcon() {
    const icon = document.documentElement.classList.contains('dark') ? 'moon' : 'sun';
    const graphic = icon === 'moon'
      ? '<path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/>'
      : '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>';
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${graphic}</svg>`;
  }

  function updateThemeControls() {
    const themeSelect = document.getElementById('sprk-theme-mode');
    const themeButton = document.getElementById('sprk-theme-cycle');
    if (themeSelect) themeSelect.value = savedTheme;
    if (themeButton) {
      const nextTheme = ['system', 'light', 'dark'][(['system', 'light', 'dark'].indexOf(savedTheme) + 1) % 3];
      themeButton.innerHTML = `${themeIcon()}<span>${themeLabel(savedTheme)}</span>`;
      themeButton.setAttribute('aria-label', `Appearance: ${themeLabel(savedTheme)}. Activate to switch to ${themeLabel(nextTheme)}.`);
      themeButton.title = `Appearance: ${themeLabel(savedTheme)} · switch to ${themeLabel(nextTheme)}`;
    }
  }

  function saveTheme() {
    try {
      localStorage.setItem(THEME_KEY, savedTheme);
      localStorage.setItem('theme', savedTheme);
    } catch (error) {
      console.warn('Unable to save the theme preference:', error);
    }
    const legacySelect = document.getElementById('theme-select');
    if (legacySelect) legacySelect.value = savedTheme;
    updateThemeControls();
  }

  function setTheme(theme) {
    if (!['system', 'light', 'dark'].includes(theme)) return;
    savedTheme = theme;
    applyTheme(savedTheme);
    saveTheme();
  }

  function applyAccent(color) {
    if (!/^#[\da-f]{6}$/i.test(color)) return;
    savedAccent = color;
    document.documentElement.style.setProperty('--sprk-accent', color);
    const picker = document.getElementById('sprk-accent-picker');
    if (picker) picker.value = color;
    document.querySelectorAll('.sprk-color-presets button').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.color.toLowerCase() === color.toLowerCase()));
    });
    try {
      localStorage.setItem(ACCENT_KEY, color);
    } catch (error) {
      console.warn('Unable to save the accent color preference:', error);
    }
  }

  applyTheme(savedTheme);
  applyAccent(savedAccent);

  const logoUrl = new URL(SITE_CONFIG.logo, new URL('../config.js', import.meta.url)).href;
  document.querySelectorAll('link[rel~="icon"]').forEach(link => { link.href = logoUrl; });

  const pageHeader = document.querySelector('body header');
  const appbarActions = document.createElement('div');
  appbarActions.className = 'sprk-appbar-actions';
  appbarActions.setAttribute('role', 'group');
  appbarActions.setAttribute('aria-label', 'Page controls');
  const pageActions = document.querySelector('[data-appbar-actions]');
  if (pageActions) {
    [...pageActions.childNodes].forEach(node => appbarActions.append(node));
    pageActions.remove();
  }
  if (pageHeader) {
    const legacyBrand = pageHeader.querySelector('[data-appbar-brand], .brand-logo-container, .brand')
      || pageHeader.querySelector('#site-logo')?.closest('.brand')
      || pageHeader.querySelector('#site-name')?.closest('.brand');
    const brandPath = new Set();
    for (let ancestor = legacyBrand; ancestor && ancestor !== pageHeader; ancestor = ancestor.parentElement) {
      brandPath.add(ancestor);
    }
    if (legacyBrand) {
      legacyBrand.remove();
    } else {
      pageHeader.querySelector('#site-logo')?.remove();
      pageHeader.querySelector('#site-name')?.remove();
    }

    function moveHeaderContent(container) {
      [...container.childNodes].forEach(node => {
        if (brandPath.has(node)) {
          moveHeaderContent(node);
        } else if (node.nodeType === Node.ELEMENT_NODE
          || (node.nodeType === Node.TEXT_NODE && node.textContent.trim())) {
          appbarActions.append(node);
        }
      });
    }

    moveHeaderContent(pageHeader);
    pageHeader.classList.add('sprk-page-toolbar');
    pageHeader.setAttribute('role', 'group');
    pageHeader.setAttribute('aria-label', 'Page controls');
  }

  const header = document.createElement('header');
  header.className = 'sprk-appbar-host sprk-generated-appbar';
  header.innerHTML = `
    <div class="sprk-appbar-row">
      <a class="sprk-appbar-brand" href="/" aria-label="${escapeHTML(SITE_CONFIG.name)} home">
        <span class="sprk-appbar-logo"></span>
        <span id="site-name" class="sprk-appbar-brand-name">${escapeHTML(SITE_CONFIG.name)}</span>
      </a>
      <nav class="sprk-primary-nav" aria-label="Primary navigation"></nav>
    </div>`;
  header.querySelector('.sprk-appbar-logo').append(createSprkLogo());
  document.body.prepend(header);

  const row = header.querySelector('.sprk-appbar-row');

  let authButton = document.getElementById('auth-button');
  if (options.showMainAuth && !isSimulator) {
    if (authButton) {
      authButton.classList.add('sprk-site-auth');
    } else {
      authButton = document.createElement('button');
      authButton.id = 'auth-button';
      authButton.type = 'button';
      authButton.className = 'sprk-site-auth';
      authButton.textContent = 'Sign in';
      authButton.setAttribute('aria-label', 'Sign in or create an account');
    }
  }

  const tools = document.createElement('div');
  tools.className = 'sprk-appbar-tools';

  if (appbarActions.childNodes.length) tools.append(appbarActions);

  const primaryNavigation = row.querySelector('.sprk-primary-nav');
  primaryNavigation.innerHTML = links.map(({ label, href }) =>
    `<a href="${escapeHTML(href)}">${escapeHTML(label)}</a>`
  ).join('');

  let themeButton = null;
  if (options.showThemeSelector) {
    themeButton = document.createElement('button');
    themeButton.className = 'sprk-theme-cycle';
    themeButton.id = 'sprk-theme-cycle';
    themeButton.type = 'button';
    tools.append(themeButton);
  }

  if (options.showSiteMenu && !isSimulator) {
    const menu = document.createElement('div');
    menu.className = 'sprk-site-menu';
    const navigation = links.map(({ label, href }) =>
      `<a href="${escapeHTML(href)}">${escapeHTML(label)}</a>`
    ).join('');
    const themeControl = options.showThemeSelector ? `
      <div class="sprk-site-setting">
        <label for="sprk-theme-mode">Color mode</label>
        <select id="sprk-theme-mode" aria-label="Color theme">
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>` : '';
    const accentControl = options.showAccentPicker ? `
      <div class="sprk-site-setting sprk-site-accent-setting">
        <label for="sprk-accent-picker">Accent color</label>
        <input id="sprk-accent-picker" type="color" value="${escapeHTML(savedAccent)}" aria-label="Choose a custom accent color">
        <span class="sprk-setting-hint">Choose a preset or any custom color.</span>
        <div class="sprk-color-presets" role="group" aria-label="Preset accent colors">
          ${presets.map(({ label, value }) => `<button type="button" data-color="${escapeHTML(value)}" style="background:${escapeHTML(value)}" aria-label="${escapeHTML(label)}" title="${escapeHTML(label)}" aria-pressed="${value.toLowerCase() === savedAccent.toLowerCase()}"></button>`).join('')}
        </div>
      </div>` : '';

    menu.innerHTML = `
      <section class="sprk-site-panel" id="sprk-site-panel" aria-label="Site navigation and appearance" hidden>
        <div class="sprk-panel-heading">
          <div><span class="sprk-panel-eyebrow">Your workspace</span><h2>Menu & appearance</h2><p>Find a destination or make SPRK feel like yours.</p></div>
          <button class="sprk-panel-close" type="button" aria-label="Close site menu">×</button>
        </div>
        <nav class="sprk-site-nav" aria-label="More site destinations">${navigation}</nav>
        ${(themeControl || accentControl) ? `<section class="sprk-appearance-section" aria-label="Appearance settings"><h3>Appearance</h3><div class="sprk-site-appearance">${themeControl}${accentControl}</div></section>` : ''}
        ${(themeControl || accentControl) ? '<button class="sprk-site-reset" id="sprk-appearance-reset" type="button">Reset appearance</button>' : ''}
        <section class="sprk-cloud-activity" aria-label="Cloud account activity">
          <div class="sprk-cloud-activity-heading">
            <div><h3>Cloud account</h3><p id="sprk-cloud-status" aria-live="polite">Checking connection…</p></div>
            <button type="button" id="sprk-activity-refresh">Recent activity</button>
          </div>
          <ol id="sprk-activity-list" class="sprk-activity-list" hidden></ol>
        </section>
      </section>
      <button class="sprk-menu-trigger" id="sprk-site-trigger" type="button" aria-expanded="false" aria-controls="sprk-site-panel">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h16M4 12h16M4 17h16"/></svg><span>Menu</span>
      </button>`;
    tools.append(menu);

    const panel = menu.querySelector('#sprk-site-panel');
    const trigger = menu.querySelector('#sprk-site-trigger');
    const themeSelect = menu.querySelector('#sprk-theme-mode');
    const colorPicker = menu.querySelector('#sprk-accent-picker');
    if (themeSelect) themeSelect.value = savedTheme;

    const allNavigationLinks = [...primaryNavigation.querySelectorAll('a'), ...menu.querySelectorAll('.sprk-site-nav a')];
    const currentLink = allNavigationLinks
      .filter(link => location.pathname === link.getAttribute('href')
        || (link.getAttribute('href') !== '/' && location.pathname.startsWith(link.getAttribute('href'))))
      .sort((a, b) => b.getAttribute('href').length - a.getAttribute('href').length)[0];
    if (currentLink) {
      allNavigationLinks
        .filter(link => link.getAttribute('href') === currentLink.getAttribute('href'))
        .forEach(link => link.setAttribute('aria-current', 'page'));
    }

    function closeMenu(restoreFocus = false) {
      panel.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      if (restoreFocus) trigger.focus();
    }

    trigger.addEventListener('click', () => {
      panel.hidden = !panel.hidden;
      trigger.setAttribute('aria-expanded', String(!panel.hidden));
    });
    menu.querySelector('.sprk-panel-close').addEventListener('click', () => closeMenu(true));
    menu.querySelectorAll('.sprk-site-nav a').forEach(link => link.addEventListener('click', () => closeMenu()));
    document.addEventListener('click', event => {
      if (!panel.hidden && !menu.contains(event.target)) closeMenu();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !panel.hidden) closeMenu(true);
    });

    if (themeSelect) {
      themeSelect.addEventListener('change', () => setTheme(themeSelect.value));
    }

    if (colorPicker) colorPicker.addEventListener('input', () => applyAccent(colorPicker.value));
    menu.querySelectorAll('.sprk-color-presets button').forEach(button => {
      button.addEventListener('click', () => applyAccent(button.dataset.color));
    });
    const resetButton = menu.querySelector('#sprk-appearance-reset');
    if (resetButton) {
      resetButton.addEventListener('click', () => {
        setTheme(defaultMode);
        applyAccent(defaultAccent);
      });
    }

    menu.querySelector('#sprk-activity-refresh').addEventListener('click', async event => {
      const button = event.currentTarget;
      const list = menu.querySelector('#sprk-activity-list');
      button.disabled = true;
      try {
        const { loadRecentActivity } = await import('./site-database.js');
        const entries = await loadRecentActivity();
        list.replaceChildren();
        if (!entries.length) {
          const empty = document.createElement('li');
          empty.textContent = 'No activity recorded yet.';
          list.append(empty);
        } else {
          entries.forEach(entry => {
            const item = document.createElement('li');
            const link = document.createElement('a');
            const time = document.createElement('time');
            link.href = entry.page_path;
            link.textContent = entry.page_title || entry.page_path;
            time.dateTime = entry.visited_at;
            time.textContent = new Date(entry.visited_at).toLocaleString();
            item.append(link, time);
            list.append(item);
          });
        }
        list.hidden = false;
      } catch (error) {
        console.error('Unable to load recent site activity:', error);
        const status = menu.querySelector('#sprk-cloud-status');
        status.textContent = error.message || 'Unable to load activity.';
      } finally {
        button.disabled = false;
      }
    });
  }

  if (primaryNavigation.childElementCount) {
    const currentPath = location.pathname;
    const linksForCurrentPath = [...primaryNavigation.querySelectorAll('a')]
      .filter(link => currentPath === link.getAttribute('href')
        || (link.getAttribute('href') !== '/' && currentPath.startsWith(link.getAttribute('href'))))
      .sort((a, b) => b.getAttribute('href').length - a.getAttribute('href').length);
    if (linksForCurrentPath[0]) linksForCurrentPath[0].setAttribute('aria-current', 'page');
  }

  if (themeButton) {
    themeButton.addEventListener('click', () => {
      const modes = ['system', 'light', 'dark'];
      setTheme(modes[(modes.indexOf(savedTheme) + 1) % modes.length]);
    });
  }

  if (authButton && options.showMainAuth && !isSimulator) tools.append(authButton);
  if (tools.childElementCount) row.append(tools);
  updateThemeControls();
  if (pageHeader && !pageHeader.querySelector('button, a, input, select, textarea, nav')
    && !pageHeader.textContent.trim()) {
    if (pageHeader.id && !header.id) header.id = pageHeader.id;
    pageHeader.remove();
  }

  if (authButton && options.showMainAuth && !isSimulator) {
    import('./site-auth.js').catch(error => {
      console.error('Unable to initialize main-site authentication:', error);
      authButton.disabled = true;
      authButton.title = 'Unable to initialize authentication';
    });
  }
  if (!isSimulator) {
    import('./site-database.js').then(({ initializeSiteDatabase }) => initializeSiteDatabase()).catch(error => {
      console.error('Unable to initialize main-site database features:', error);
      const status = document.getElementById('sprk-cloud-status');
      if (status) status.textContent = error.message || 'Cloud features could not be initialized.';
    });
  }

  document.addEventListener('click', event => {
    const toggle = event.target instanceof Element ? event.target.closest('#theme-toggle') : null;
    if (!toggle) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    setTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark');
    const icon = document.getElementById('theme-icon');
    if (icon) {
      icon.setAttribute('data-lucide', savedTheme === 'dark' ? 'sun' : 'moon');
      icon.textContent = savedTheme === 'dark' ? '☀' : '☾';
      if (window.lucide) window.lucide.createIcons();
    }
  }, true);

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (savedTheme === 'system') {
      applyTheme('system');
      updateThemeControls();
    }
  });
})();
