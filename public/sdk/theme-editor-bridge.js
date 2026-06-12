/**
 * Storify Theme Editor Bridge — يحمّل من أصل لوحة التحكم (/sdk/theme-editor-bridge.js)
 * لا يعتمد على كود داخل كل ثيم: يعتمد على أن كل قسم في الـ layout له عنصر في DOM بـ id يطابق section.id.
 *
 * السلوك: نقرة واحدة على أي عنصر له id مطابق لقسم في layout → STORIFY_EDITOR_SELECT_SECTION
 * (بعد استقبال layout من STORIFY_THEME_CONFIG؛ عند التحميل يرسل الجسر STORIFY_EDITOR_BRIDGE_READY لإعادة الإرسال)
 */
(function () {
  'use strict';

  var MSG_SELECT = 'STORIFY_EDITOR_SELECT_SECTION';
  var MSG_BRIDGE_READY = 'STORIFY_EDITOR_BRIDGE_READY';
  var TYPE_CONFIG = 'STORIFY_THEME_CONFIG';
  var TYPE_PREVIEW = 'STORIFY_THEME_PREVIEW';

  /** @type {Record<string, { group: string }>} */
  var sectionById = Object.create(null);
  var editorActive = false;
  var embedded = typeof window !== 'undefined' && window.parent !== window;

  function normGroup(g) {
    return String(g || '')
      .trim()
      .toLowerCase();
  }

  function ingestLayout(layout) {
    sectionById = Object.create(null);
    if (!Array.isArray(layout)) return;
    for (var i = 0; i < layout.length; i++) {
      var s = layout[i];
      if (!s || s.id == null || s.id === '') continue;
      var id = String(s.id);
      sectionById[id] = { group: normGroup(s.group) };
    }
  }

  function findSectionIdFromTarget(target) {
    if (!target || target.nodeType !== 1) return null;
    var el = target;
    var guard = 0;
    while (el && el !== document.documentElement && guard++ < 80) {
      if (el.id && Object.prototype.hasOwnProperty.call(sectionById, el.id)) {
        return el.id;
      }
      el = el.parentElement;
    }
    return null;
  }

  function postSelect(sectionId) {
    try {
      window.parent.postMessage({ type: MSG_SELECT, sectionId: sectionId }, '*');
    } catch (e) {
      /* ignore */
    }
  }

  function onPointerDown(ev) {
    if (!embedded) return;
    if (!editorActive) {
      try {
        if (new URLSearchParams(window.location.search).get('storifyEditor') === '1') editorActive = true;
      } catch (e) {
        /* ignore */
      }
    }
    if (!editorActive) return;

    var sid = findSectionIdFromTarget(ev.target);
    if (!sid) return;

    ev.preventDefault();
    ev.stopPropagation();
    postSelect(sid);
  }

  function onMessage(ev) {
    var d = ev.data;
    if (!d || typeof d !== 'object') return;

    if (d.type === 'STORIFY_SCROLL_TO_SECTION' && d.sectionId != null && String(d.sectionId).trim() !== '') {
      var scrollEl = document.getElementById(String(d.sectionId).trim());
      if (scrollEl) {
        scrollEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        scrollEl.style.outline = '4px solid #6366f1';
        scrollEl.style.outlineOffset = '-4px';
        window.setTimeout(function () {
          scrollEl.style.outline = '';
          scrollEl.style.outlineOffset = '';
        }, 2000);
      }
      return;
    }

    if (d.type === TYPE_CONFIG && d.payload) {
      var p = d.payload;
      ingestLayout(p.layout);
      if (p.editorPreview) editorActive = true;
      return;
    }

    if (d.type === TYPE_PREVIEW && d.theme) {
      var theme = d.theme;
      var page = typeof d.previewPage === 'string' ? d.previewPage : 'index';
      var layout = [];
      try {
        var pages = theme.pages && typeof theme.pages === 'object' ? theme.pages : {};
        var pageKey = page && page !== 'index' ? page : 'home';
        var fromPage = pages[pageKey] && Array.isArray(pages[pageKey].layout) ? pages[pageKey].layout : null;
        var fromHome = pages.home && Array.isArray(pages.home.layout) ? pages.home.layout : null;
        var fromUploaded = Array.isArray(theme.uploadedThemeLayout) ? theme.uploadedThemeLayout : null;
        var fromTheme = Array.isArray(theme.layout) ? theme.layout : null;
        layout = fromPage || fromHome || fromUploaded || fromTheme || [];
      } catch (e) {
        layout = [];
      }
      ingestLayout(layout);
      editorActive = true;
    }
  }

  function bootUrlFlag() {
    try {
      if (new URLSearchParams(window.location.search).get('storifyEditor') === '1') editorActive = true;
    } catch (e) {
      /* ignore */
    }
  }

  function boot() {
    if (!embedded) return;
    bootUrlFlag();
    window.addEventListener('message', onMessage);
    document.addEventListener('pointerdown', onPointerDown, true);
    try {
      window.parent.postMessage({ type: MSG_BRIDGE_READY }, '*');
    } catch (e) {
      /* ignore */
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
