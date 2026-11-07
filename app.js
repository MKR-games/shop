/* MUKKURI desktop — dependency-free. Works from index.html and static hosting. */
(() => {
  'use strict';
  const $ = (q, scope = document) => scope.querySelector(q);
  const $$ = (q, scope = document) => [...scope.querySelectorAll(q)];
  const clamp = (n, min, max) => Math.min(Math.max(n, min), Math.max(min, max));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const storage = {
    read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
    write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Private browsing still works. */ } }
  };
  document.documentElement.classList.add('has-js');
  const status = $('#desktop-status');
  let announceTimer;
  function announce(text) { clearTimeout(announceTimer); status.textContent = ''; announceTimer = setTimeout(() => { status.textContent = text; }, 50); }

  // Two fully decoded photographs overlap during each crossfade.
  const slides = $$('.wallpaper-slide');
  const pause = $('#scene-pause');
  const next = $('#scene-next');
  let scene = 0, sceneTimer, sceneBusy = false, sceneToken = 0;
  let paused = storage.read('mukkuri-background-paused', false) === true;
  function sceneControls() {
    const stopped = paused || reduced.matches;
    pause.textContent = stopped ? '▶' : 'Ⅱ';
    pause.disabled = reduced.matches;
    pause.setAttribute('aria-pressed', String(stopped));
    pause.setAttribute('aria-label', reduced.matches ? '동작 줄이기 설정으로 자동 전환 정지' : (paused ? '배경 자동 전환 재생' : '배경 자동 전환 일시정지'));
    pause.title = pause.getAttribute('aria-label');
    $('.scene-number').textContent = `${String(scene + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    next.title = `다음 배경 보기 · 현재 ${slides[scene].dataset.scene}`;
  }
  function scheduleScene() {
    clearTimeout(sceneTimer);
    if (!paused && !reduced.matches && !document.hidden) sceneTimer = setTimeout(() => changeScene(false), 10000);
  }
  async function changeScene(manual) {
    if (sceneBusy || (!manual && (paused || reduced.matches || document.hidden))) return;
    sceneBusy = true;
    const token = sceneToken;
    let target = (scene + 1) % slides.length;
    try {
      await slides[target].decode();
      if (token !== sceneToken || (!manual && (paused || reduced.matches || document.hidden))) return;
      slides[target].classList.add('is-active');
      slides[scene].classList.remove('is-active');
      scene = target;
      sceneControls();
    } catch { /* A missing photograph never removes the visible background. */ }
    finally { sceneBusy = false; scheduleScene(); }
  }
  pause.addEventListener('click', () => { paused = !paused; sceneToken++; storage.write('mukkuri-background-paused', paused); sceneControls(); scheduleScene(); });
  next.addEventListener('click', () => { clearTimeout(sceneTimer); changeScene(true); });
  document.addEventListener('visibilitychange', () => { sceneToken++; scheduleScene(); });
  reduced.addEventListener('change', () => { sceneToken++; sceneControls(); scheduleScene(); });
  sceneControls(); scheduleScene();

  // Desktop items keep their anchor semantics. Moving never activates a link.
  const desktop = $('.desktop');
  const items = $$('.desktop-item');
  const layoutKey = 'mukkuri-desktop-layout-v2';
  const storedLayout = storage.read(layoutKey, {});
  const layouts = storedLayout && typeof storedLayout === 'object' && !Array.isArray(storedLayout) ? storedLayout : {};
  const offset = new Map(items.map(el => [el, {x: 0, y: 0}]));
  const getProfile = () => innerWidth <= 600 ? 'phone' : innerWidth <= 800 ? 'tablet' : 'desktop';
  let profile = getProfile(), drag = null, dragLayer = 2;
  const suppressed = new WeakMap();
  function bounds(el) {
    const area = desktop.getBoundingClientRect(), r = el.getBoundingClientRect();
    return {minX: 12, maxX: innerWidth - r.width - 12, minY: area.top + 66, maxY: area.bottom - r.height - 70};
  }
  function moveItem(el, x, y) {
    const r = el.getBoundingClientRect(), b = bounds(el), o = offset.get(el);
    const nx = clamp(x, b.minX, b.maxX), ny = clamp(y, b.minY, b.maxY);
    const value = {x: o.x + nx - r.left, y: o.y + ny - r.top};
    offset.set(el, value); el.style.translate = `${value.x}px ${value.y}px`;
  }
  function saveItem(el) {
    const r = el.getBoundingClientRect(), b = bounds(el);
    if (!layouts[profile] || typeof layouts[profile] !== 'object') layouts[profile] = {};
    layouts[profile][el.getAttribute('href')] = {x: (r.left - b.minX) / Math.max(1, b.maxX - b.minX), y: (r.top - b.minY) / Math.max(1, b.maxY - b.minY)};
    storage.write(layoutKey, layouts);
  }
  function resetItem(el) { offset.set(el, {x: 0, y: 0}); el.style.removeProperty('translate'); el.style.removeProperty('z-index'); }
  function restoreLayout() {
    if (desktop.getBoundingClientRect().width === 0 || drag) return;
    profile = getProfile(); items.forEach(resetItem);
    items.forEach(el => {
      const p = layouts[profile]?.[el.getAttribute('href')];
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
      const b = bounds(el); moveItem(el, b.minX + clamp(p.x, 0, 1) * (b.maxX - b.minX), b.minY + clamp(p.y, 0, 1) * (b.maxY - b.minY));
    });
  }
  items.forEach(el => {
    el.addEventListener('dragstart', e => e.preventDefault());
    el.addEventListener('pointerdown', e => {
      if (!e.isPrimary || e.button !== 0 || activeWindow || drag) return;
      const r = el.getBoundingClientRect();
      drag = {el, id: e.pointerId, startX: e.clientX, startY: e.clientY, x: r.left, y: r.top, origin: {...offset.get(el)}, moved: false};
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', e => {
      if (!drag || drag.el !== el || drag.id !== e.pointerId) return;
      const dx = e.clientX - drag.startX, dy = e.clientY - drag.startY;
      if (!drag.moved && Math.hypot(dx, dy) < 7) return;
      if (!drag.moved) { drag.moved = true; el.classList.add('is-dragging'); el.style.zIndex = String(++dragLayer); document.body.classList.add('is-dragging'); }
      e.preventDefault(); moveItem(el, drag.x + dx, drag.y + dy);
    });
    function finish(e, cancel = false) {
      if (!drag || drag.el !== el || drag.id !== e.pointerId) return;
      if (drag.moved) {
        suppressed.set(el, performance.now() + 350);
        if (cancel) { offset.set(el, drag.origin); el.style.translate = `${drag.origin.x}px ${drag.origin.y}px`; }
        else { saveItem(el); announce(`${$('.file-label', el).textContent} 위치를 옮겼습니다.`); }
      }
      drag = null; el.classList.remove('is-dragging'); document.body.classList.remove('is-dragging');
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    }
    el.addEventListener('pointerup', e => finish(e));
    el.addEventListener('pointercancel', e => finish(e, true));
    el.addEventListener('lostpointercapture', e => finish(e, true));
    el.addEventListener('click', e => { if (e.detail !== 0 && performance.now() < (suppressed.get(el) || 0)) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
    el.addEventListener('keydown', e => {
      if (!e.shiftKey || activeWindow) return;
      const dirs = {ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, -12], ArrowDown: [0, 12]};
      if (e.key === 'Home') { e.preventDefault(); resetItem(el); delete layouts[profile]?.[el.getAttribute('href')]; storage.write(layoutKey, layouts); announce('원래 위치로 돌아왔습니다.'); }
      else if (dirs[e.key]) { e.preventDefault(); const r = el.getBoundingClientRect(), d = dirs[e.key]; moveItem(el, r.left + d[0], r.top + d[1]); saveItem(el); }
    });
  });
  $('#reset-layout').addEventListener('click', () => { for (const key of Object.keys(layouts)) delete layouts[key]; storage.write(layoutKey, layouts); items.forEach(resetItem); announce('모든 아이콘을 원래 위치로 되돌렸습니다.'); });

  // One focused document at a time, with real window controls and URL history.
  const windows = $$('.content-window');
  const backdrop = $('.window-backdrop');
  const outside = [$('.desktop-menu'), $('.desktop-footer'), desktop, $('.skip-link')];
  let activeWindow = null, returnFocus = null, windowDrag = null;
  function centerWindow(win) { win.style.removeProperty('left'); win.style.removeProperty('top'); win.style.removeProperty('transform'); }
  function setMaximized(win, value) {
    win.classList.toggle('is-maximized', value); centerWindow(win);
    const button = $('.window-maximize', win); button.setAttribute('aria-pressed', String(value)); button.setAttribute('aria-label', value ? '창 원래 크기로' : '창 확대'); button.title = button.getAttribute('aria-label'); $('span', button).textContent = value ? '❐' : '□';
  }
  function clampWindow(win, x, y) {
    const r = win.getBoundingClientRect();
    win.style.left = `${clamp(x, 8, innerWidth - r.width - 8)}px`;
    win.style.top = `${clamp(y, 8, innerHeight - r.height - 8)}px`;
    win.style.transform = 'none';
  }
  function updateRoute() {
    const id = location.hash.slice(1);
    const win = windows.find(el => el.id === id) || null;
    const old = activeWindow;
    if (old && old !== win) {
      old.removeAttribute('role'); old.removeAttribute('aria-modal'); old.classList.remove('is-open', 'window-moving');
      setMaximized(old, false); windowDrag = null;
    }
    activeWindow = win;
    document.body.classList.toggle('has-window', !!win);
    backdrop.hidden = !win;
    outside.forEach(el => { el.inert = !!win; });
    if (win) {
      if (!old && !returnFocus) returnFocus = document.activeElement;
      win.classList.add('is-open'); win.setAttribute('role', 'dialog'); win.setAttribute('aria-modal', 'true');
      if (old !== win) {
        setMaximized(win, false); $('.window-body', win).scrollTop = 0;
        requestAnimationFrame(() => { if (activeWindow === win) win.focus({preventScroll: true}); });
      }
      $$('details[open]').forEach(el => el.open = false);
    } else {
      if (old) {
        const target = returnFocus?.isConnected && returnFocus.getBoundingClientRect().width ? returnFocus : $('.menu-group a');
        returnFocus = null; target?.focus({preventScroll: true});
      }
      if (id !== 'documents') requestAnimationFrame(restoreLayout);
    }
  }
  document.addEventListener('click', e => {
    const link = e.target.closest('a[href^="#"]');
    if (!link || e.defaultPrevented || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    if (windows.some(win => `#${win.id}` === link.getAttribute('href')) && !activeWindow) returnFocus = link;
  });
  backdrop.addEventListener('click', () => { if (activeWindow) location.hash = 'desktop'; });
  document.addEventListener('keydown', e => {
    if (!activeWindow) return;
    if (e.key === 'Escape') { e.preventDefault(); location.hash = 'desktop'; return; }
    if (e.key !== 'Tab') return;
    const focusables = $$('a[href], button:not([disabled]), [tabindex="0"]', activeWindow).filter(el => el.getClientRects().length);
    const first = focusables[0], last = focusables.at(-1);
    if (e.shiftKey && (document.activeElement === first || document.activeElement === activeWindow)) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || document.activeElement === activeWindow)) { e.preventDefault(); first?.focus(); }
  });
  windows.forEach(win => {
    const bar = $('.window-bar', win);
    $('.window-maximize', win).addEventListener('click', () => setMaximized(win, !win.classList.contains('is-maximized')));
    bar.addEventListener('dblclick', e => { if (!e.target.closest('a,button') && activeWindow === win) setMaximized(win, !win.classList.contains('is-maximized')); });
    bar.addEventListener('pointerdown', e => {
      if (!e.isPrimary || e.button !== 0 || activeWindow !== win || win.classList.contains('is-maximized') || e.target.closest('a,button')) return;
      const r = win.getBoundingClientRect(); windowDrag = {win, id:e.pointerId, x:r.left, y:r.top, startX:e.clientX, startY:e.clientY}; bar.setPointerCapture(e.pointerId);
      win.classList.add('window-moving');
    });
    bar.addEventListener('pointermove', e => { if (windowDrag?.win !== win || windowDrag.id !== e.pointerId) return; e.preventDefault(); clampWindow(win, windowDrag.x + e.clientX - windowDrag.startX, windowDrag.y + e.clientY - windowDrag.startY); });
    function finishWindow(e) { if (windowDrag?.win !== win || windowDrag.id !== e.pointerId) return; windowDrag = null; win.classList.remove('window-moving'); if(bar.hasPointerCapture(e.pointerId)) bar.releasePointerCapture(e.pointerId); }
    bar.addEventListener('pointerup', finishWindow); bar.addEventListener('pointercancel', finishWindow); bar.addEventListener('lostpointercapture', finishWindow);
  });
  let resizeTimer;
  addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { restoreLayout(); if (activeWindow) centerWindow(activeWindow); }, 100); });
  addEventListener('hashchange', updateRoute);
  updateRoute(); requestAnimationFrame(restoreLayout);
})();
