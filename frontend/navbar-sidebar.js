/**
 * VISION SENSE — GLOBAL NAVIGATION & SIDEBAR COMPONENT
 */

window.VisionSenseNav = {
  render: function (activePageKey = 'dashboard', pageTitle = 'Security Operations Dashboard') {
    const isDemo = new URLSearchParams(window.location.search).get('demo') === 'true';
    const demoParam = isDemo ? '?demo=true' : '';

    const navItems = [
      { key: 'dashboard', label: 'Vision Core SOC', icon: '⚡', url: `/dashboard${demoParam}`, section: 'core' },
      { key: 'monitoring', label: 'Live Monitoring', icon: '📹', url: `/analyze${demoParam}`, section: 'core' },
      { key: 'cameras', label: 'Camera Matrix', icon: '🎥', url: `/cameras${demoParam}`, section: 'surveillance' },
      { key: 'crowd', label: 'Crowd Safety', icon: '👥', url: `/crowd-safety${demoParam}`, section: 'surveillance' },
      { key: 'violence', label: 'Violence Detection', icon: '🛡️', url: `/violence-detection${demoParam}`, section: 'intelligence' },
      { key: 'alerts', label: 'Alert Center', icon: '🔔', url: `/alerts${demoParam}`, badge: '2', section: 'intelligence' },
      { key: 'incidents', label: 'Incident Log', icon: '📋', url: `/incidents${demoParam}`, section: 'management' },
      { key: 'analytics', label: 'Security Analytics', icon: '📊', url: `/analytics${demoParam}`, section: 'management' },
      { key: 'settings', label: 'System Settings', icon: '⚙️', url: `/settings${demoParam}`, section: 'system' },
      { key: 'login', label: 'Operator Portal', icon: '🔒', url: `/login${demoParam}`, section: 'system' }
    ];

    // Build sidebar HTML
    const sidebarHtml = `
      <aside class="vs-sidebar" id="vsSidebar">
        <a href="/dashboard${demoParam}" class="vs-brand" id="brand-link">
          <div class="vs-brand-icon"></div>
          <div class="vs-brand-title">
            <div class="vs-brand-name">VISION SENSE</div>
            <div class="vs-brand-tag">CROWD & VIOLENCE AI</div>
          </div>
        </a>

        <div class="vs-nav-section-title">Operations</div>
        ${navItems.filter(i => i.section === 'core').map(item => `
          <a href="${item.url}" class="vs-nav-item ${activePageKey === item.key ? 'active' : ''}" id="nav-${item.key}">
            <span>${item.icon}</span>
            <span>${item.label}</span>
          </a>
        `).join('')}

        <div class="vs-nav-section-title">Surveillance & Safety</div>
        ${navItems.filter(i => i.section === 'surveillance').map(item => `
          <a href="${item.url}" class="vs-nav-item ${activePageKey === item.key ? 'active' : ''}" id="nav-${item.key}">
            <span>${item.icon}</span>
            <span>${item.label}</span>
          </a>
        `).join('')}

        <div class="vs-nav-section-title">AI Intelligence</div>
        ${navItems.filter(i => i.section === 'intelligence').map(item => `
          <a href="${item.url}" class="vs-nav-item ${activePageKey === item.key ? 'active' : ''}" id="nav-${item.key}">
            <span>${item.icon}</span>
            <span>${item.label}</span>
            ${item.badge ? `<span class="vs-nav-badge" id="nav-badge-${item.key}">${item.badge}</span>` : ''}
          </a>
        `).join('')}

        <div class="vs-nav-section-title">Management</div>
        ${navItems.filter(i => i.section === 'management').map(item => `
          <a href="${item.url}" class="vs-nav-item ${activePageKey === item.key ? 'active' : ''}" id="nav-${item.key}">
            <span>${item.icon}</span>
            <span>${item.label}</span>
          </a>
        `).join('')}

        <div class="vs-nav-section-title">System</div>
        ${navItems.filter(i => i.section === 'system').map(item => `
          <a href="${item.url}" class="vs-nav-item ${activePageKey === item.key ? 'active' : ''}" id="nav-${item.key}">
            <span>${item.icon}</span>
            <span>${item.label}</span>
          </a>
        `).join('')}

        <div class="vs-sidebar-footer">
          <div class="vs-engine-pill">
            <div class="vs-engine-status">
              <div class="vs-dot" id="sidebar-ai-dot"></div>
              <span>AI Engine Active</span>
            </div>
            <span class="mono" style="font-size: 11px; color: var(--vs-cyan);">25 FPS</span>
          </div>
        </div>
      </aside>
    `;

    // Build Topbar HTML
    const topbarHtml = `
      <header class="vs-topbar" id="vsTopbar">
        <div class="vs-topbar-left">
          <button class="vs-btn vs-btn-outline vs-btn-sm" id="btn-toggle-sidebar" style="display: none;" onclick="VisionSenseNav.toggleSidebar()">
            ☰
          </button>
          <div class="vs-page-title" id="topbar-page-title">
            <span>${pageTitle}</span>
          </div>
          ${isDemo ? `<div class="vs-sim-banner" id="sim-banner">DEMO MODE — SIMULATED DATA</div>` : ''}
        </div>

        <div class="vs-topbar-right">
          <div class="vs-status-badge normal" id="topbar-threat-badge">
            <span class="vs-dot" id="topbar-threat-dot"></span>
            <span id="topbar-threat-text">SECURITY NORMAL</span>
          </div>
          <div class="vs-clock" id="vs-live-clock">--:--:-- UTC</div>
          <a href="/alerts${demoParam}" class="vs-btn vs-btn-outline vs-btn-sm" id="topbar-alerts-btn" style="position: relative;">
            🔔 <span id="topbar-alert-count">2</span>
          </a>
        </div>
      </header>
    `;

    const sidebarContainer = document.getElementById('sidebar-mount');
    if (sidebarContainer) sidebarContainer.innerHTML = sidebarHtml;

    const topbarContainer = document.getElementById('topbar-mount');
    if (topbarContainer) topbarContainer.innerHTML = topbarHtml;

    // Start Clock
    this.startClock();

    // Check System Status
    this.syncSystemStatus();
    setInterval(() => this.syncSystemStatus(), 4000);
  },

  startClock: function () {
    const update = () => {
      const el = document.getElementById('vs-live-clock');
      if (el) {
        const now = new Date();
        el.textContent = now.toTimeString().split(' ')[0] + ' ' + (Intl.DateTimeFormat().resolvedOptions().timeZone || 'LOC');
      }
    };
    update();
    setInterval(update, 1000);
  },

  syncSystemStatus: async function () {
    try {
      const res = await fetch('/api/system/status');
      if (res.ok) {
        const data = await res.json();
        const badge = document.getElementById('topbar-threat-badge');
        const text = document.getElementById('topbar-threat-text');
        const dot = document.getElementById('topbar-threat-dot');
        const sidebarDot = document.getElementById('sidebar-ai-dot');
        const alertBadge = document.getElementById('nav-badge-alerts');
        const topbarAlertCount = document.getElementById('topbar-alert-count');

        if (data.metrics && topbarAlertCount) {
          topbarAlertCount.textContent = data.metrics.active_alerts;
        }
        if (data.metrics && alertBadge) {
          alertBadge.textContent = data.metrics.active_alerts;
        }

        if (badge && text && dot) {
          badge.className = `vs-status-badge ${data.risk_level.toLowerCase()}`;
          text.textContent = `SECURITY ${data.risk_level}`;
          dot.className = `vs-dot ${data.risk_level === 'CRITICAL' ? 'critical' : (data.risk_level === 'WARNING' ? 'warning' : '')}`;
        }
        if (sidebarDot) {
          sidebarDot.className = `vs-dot ${data.risk_level === 'CRITICAL' ? 'critical' : (data.risk_level === 'WARNING' ? 'warning' : '')}`;
        }
      }
    } catch (e) {
      console.warn('System status sync:', e);
    }
  },

  toggleSidebar: function () {
    const sidebar = document.getElementById('vsSidebar');
    if (sidebar) {
      sidebar.classList.toggle('open');
    }
  }
};
