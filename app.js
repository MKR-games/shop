/* MUKKURI Windows desktop — dependency-free; file:// and static hosting. */
(() => {
  'use strict';
  const $ = (q, scope = document) => scope.querySelector(q);
  const $$ = (q, scope = document) => [...scope.querySelectorAll(q)];
  const clamp = (n, min, max) => Math.min(Math.max(n, min), Math.max(min, max));
  const storage = {
    read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
    write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Private browsing still works. */ } }
  };
  document.documentElement.classList.add('has-js');
  const status = $('#desktop-status');
  let announceTimer;
  function announce(text) { clearTimeout(announceTimer); status.textContent = ''; announceTimer = setTimeout(() => { status.textContent = text; }, 50); }

  // Keep the current image until another image has loaded successfully.
  // Checking naturalWidth avoids a hanging decode() promise stopping rotation
  // in browsers that implement image decoding differently.
  const slides = $$('.wallpaper-slide');
  const SCENE_INTERVAL = 3000;
  let scene = Math.max(0, slides.findIndex(slide => slide.classList.contains('is-active')));
  let sceneTimer = null;
  let lastSceneChange = Date.now();
  let fading = null;

  // The old photo stays fully visible under the incoming photo until the
  // incoming photo has finished fading in. This avoids a flash of black.
  function finishSceneFade() {
    if (!fading) return;
    const {previous, incoming, onEnd, fallback} = fading;
    fading = null;
    clearTimeout(fallback);
    incoming.removeEventListener('transitionend', onEnd);
    previous.classList.add('is-resetting');
    previous.classList.remove('is-active');
    // Commit the reset before allowing transitions on this slide again.
    void previous.offsetWidth;
    previous.classList.remove('is-resetting');
    incoming.classList.remove('is-incoming');
  }

  function checkSceneFade() {
    if (!fading) return;
    // Some browsers suspend animation frames in a background tab. Never
    // replace the old image until the new one is actually opaque.
    if (Number(getComputedStyle(fading.incoming).opacity) >= 0.999) {
      finishSceneFade();
    } else {
      fading.fallback = setTimeout(checkSceneFade, 250);
    }
  }

  function changeScene() {
    if (slides.length < 2 || fading) return;
    for (let step = 1; step < slides.length; step++) {
      const next = (scene + step) % slides.length;
      const image = slides[next].querySelector('.wallpaper-image');
      if (!image || !image.complete || image.naturalWidth === 0) continue;
      const previous = slides[scene];
      const incoming = slides[next];
      incoming.classList.add('is-incoming');
      // Give the browser a definite zero-opacity starting frame.
      void incoming.offsetWidth;
      const onEnd = event => {
        if (event.target === incoming && event.propertyName === 'opacity') finishSceneFade();
      };
      const fallback = setTimeout(checkSceneFade, 1800);
      fading = {previous, incoming, onEnd, fallback};
      incoming.addEventListener('transitionend', onEnd);
      incoming.classList.add('is-active');
      scene = next;
      lastSceneChange = Date.now();
      return;
    }
  }
  function scheduleScene() {
    if (sceneTimer !== null) clearInterval(sceneTimer);
    if (slides.length > 1) sceneTimer = setInterval(changeScene, SCENE_INTERVAL);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    if (Date.now() - lastSceneChange >= SCENE_INTERVAL) changeScene();
    scheduleScene();
  });
  // Rotation and the wallpaper fade continue even when other motion is reduced.
  scheduleScene();

  // Desktop items keep their anchor semantics. Moving never activates a link.
  const desktop = $('.desktop');
  const items = $$('.desktop-item');
  const layoutKey = 'mukkuri-desktop-layout-v3';
  const storedLayout = storage.read(layoutKey, {});
  const layouts = storedLayout && typeof storedLayout === 'object' && !Array.isArray(storedLayout) ? storedLayout : {};
  const offset = new Map(items.map(el => [el, {x: 0, y: 0}]));
  const getProfile = () => innerWidth <= 600 ? 'phone' : innerWidth <= 1000 ? 'tablet' : 'desktop';
  let profile = getProfile(), drag = null, dragLayer = 2;
  const suppressed = new WeakMap();
  function bounds(el) {
    const area = desktop.getBoundingClientRect(), r = el.getBoundingClientRect();
    return {minX: 12, maxX: innerWidth - r.width - 12, minY: area.top + 92, maxY: area.bottom - r.height - 70};
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
      items.forEach(item => item.classList.toggle('is-selected', item === el));
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
  desktop.addEventListener('pointerdown', e => { if (!e.target.closest('.desktop-item')) items.forEach(item => item.classList.remove('is-selected')); });
  items.forEach(el => el.addEventListener('focus', () => items.forEach(item => item.classList.toggle('is-selected', item === el))));
  $('#reset-layout').addEventListener('click', () => { for (const key of Object.keys(layouts)) delete layouts[key]; storage.write(layoutKey, layouts); items.forEach(resetItem); announce('모든 아이콘을 원래 위치로 되돌렸습니다.'); });

  // One focused document at a time, with real window controls and URL history.
  const windows = $$('.content-window');
  const backdrop = $('.window-backdrop');
  const outside = [$('.desktop-menu'), $('.desktop-footer'), desktop, $('.skip-link')];
  let activeWindow = null, returnFocus = null, windowDrag = null;
  let minimizedState = null, minimizePending = false;
  const taskButton = $('#taskbar-app');
  function refreshTaskbar() {
    const target = activeWindow || (minimizedState && document.getElementById(minimizedState.id));
    taskButton.hidden = !target;
    if (!target) return;
    $('span', taskButton).textContent = $('.window-name strong', target).textContent;
    taskButton.classList.toggle('is-minimized', !activeWindow);
    taskButton.setAttribute('aria-label', `${$('.window-name strong', target).textContent} 창 복원`);
    taskButton.title = activeWindow ? '열린 창' : '최소화한 창 복원';
  }
  function minimizeWindow() {
    if (!activeWindow) return;
    minimizedState = {id:activeWindow.id, scroll:$('.window-body',activeWindow).scrollTop,
      maximized:activeWindow.classList.contains('is-maximized'),
      left:activeWindow.style.left,top:activeWindow.style.top,transform:activeWindow.style.transform};
    minimizePending = true;
    location.hash = 'desktop';
    announce('창을 최소화했습니다. 작업 표시줄에서 다시 열 수 있습니다.');
  }
  taskButton.addEventListener('click', () => { if (minimizedState) location.hash = minimizedState.id; });
  const clock = $('#taskbar-clock');
  function tickClock() {
    const now = new Date();
    clock.dateTime = now.toISOString();
    $('span',clock).textContent = now.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Seoul'});
    $('small',clock).textContent = now.toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Asia/Seoul'}).replace(/\. /g,'.').replace(/\.$/,'');
  }
  tickClock(); setInterval(tickClock,30000);
  document.addEventListener('pointerdown', e => { if (!e.target.closest('.info-menu')) $('.info-menu').open=false; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('.info-menu').open) { $('.info-menu').open=false; $('.info-menu summary').focus(); } });
  function updateReading(win) {
    const body = $('.window-body', win);
    const max = body.scrollHeight - body.clientHeight;
    const progress = max > 1 ? clamp(Math.round(body.scrollTop / max * 100), 0, 100) : 100;
    $('.reading-track span', win).style.width = `${progress}%`;
    $('.reading-status', win).textContent = `읽은 위치 ${progress}%`;
  }
  function centerWindow(win) { win.style.removeProperty('left'); win.style.removeProperty('top'); win.style.removeProperty('transform'); }
  function setMaximized(win, value) {
    win.classList.toggle('is-maximized', value); centerWindow(win);
    const button = $('.window-maximize', win); button.setAttribute('aria-pressed', String(value)); button.setAttribute('aria-label', value ? '창 원래 크기로' : '창 최대화'); button.title = button.getAttribute('aria-label'); updateReading(win);
  }
  function clampWindow(win, x, y) {
    const r = win.getBoundingClientRect();
    win.style.left = `${clamp(x, 8, innerWidth - r.width - 8)}px`;
    const barHeight = $('.desktop-footer').getBoundingClientRect().height;
    win.style.top = `${clamp(y, 8, innerHeight - barHeight - r.height - 8)}px`;
    win.style.transform = 'none';
  }
  function updateRoute() {
    const id = location.hash.slice(1);
    const win = windows.find(el => el.id === id) || null;
    const old = activeWindow;
    const restored = win && minimizedState?.id === win.id ? minimizedState : null;
    if (win || (old && !minimizePending)) minimizedState = null;
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
        setMaximized(win, restored?.maximized || false);
        $('.window-body', win).scrollTop = restored?.scroll || 0;
        if (restored && !restored.maximized && restored.left && restored.top) {
          win.style.left=restored.left; win.style.top=restored.top; win.style.transform=restored.transform;
          clampWindow(win, win.getBoundingClientRect().left, win.getBoundingClientRect().top);
        }
        requestAnimationFrame(() => { if (activeWindow === win) { win.focus({preventScroll: true}); updateReading(win); } });
      }
      $$('details[open]').forEach(el => el.open = false);
    } else {
      if (old) {
        refreshTaskbar();
        const target = minimizePending ? taskButton : returnFocus?.isConnected && returnFocus.getBoundingClientRect().width ? returnFocus : $('.menu-group a');
        returnFocus = null; target?.focus({preventScroll: true});
      }
      if (id !== 'documents') requestAnimationFrame(restoreLayout);
    }
    minimizePending = false;
    refreshTaskbar();
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
    const body = $('.window-body', win);
    body.addEventListener('scroll', () => updateReading(win), {passive: true});
    if ('ResizeObserver' in window) new ResizeObserver(() => updateReading(win)).observe(body);
    $$('img', body).forEach(img => img.addEventListener('load', () => updateReading(win)));
    $('.window-minimize', win).addEventListener('click', minimizeWindow);
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
