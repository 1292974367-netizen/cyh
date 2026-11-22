/* cyh · Personal Atlas VI — inspector panel + image viewer (non-blocking, the 3D cosmos stays interactive). */
(() => {
  'use strict';
  const D = window.CYH;
  const { getPanel, renderPanelBody } = D;
  const $ = s => document.querySelector(s);
  const site = $('#site');
  const dialog = $('#preview'), content = $('#preview-content');
  const closeButton = $('#preview-close'), backButton = $('#preview-back');
  const imageViewer = $('#image-viewer'), imageClose = $('#image-viewer-close');
  let current = null, trail = [], category = '全部', caseCategory = '全部';
  let imageSelection = null, imageOpener = null;
  const listeners = { navigate: [] };
  const emit = (name, payload) => listeners[name].forEach(fn => fn(payload));
  const panelCat = k => (k === 's4' ? caseCategory : category);

  function renderPanel(keepScroll = false) {
    const pn = getPanel(current.k, current.i, panelCat(current.k));
    if (!pn) return;
    const scroll = content.scrollTop;
    dialog.style.setProperty('--hue', pn.hue);
    $('#preview-kicker').textContent = pn.kicker || '';
    $('#preview-title').textContent = pn.title || '';
    content.innerHTML = renderPanelBody(pn);
    const link = $('#preview-link');
    link.hidden = !pn.href;
    if (pn.href) { link.href = pn.href; link.textContent = pn.hrefLabel || '查看原文 ↗'; }
    else { link.removeAttribute('href'); link.textContent = ''; }
    backButton.textContent = trail.length ? '← 返回上一层' : '← 返回星空';
    content.scrollTop = keepScroll ? scroll : 0;
  }
  function openPanel(key, index = 0, push = false) {
    const next = { k: key, i: Number(index) || 0 };
    if (!getPanel(next.k, next.i, panelCat(key))) return false;
    if (push && dialog.open && current) trail.push({ ...current }); else trail = [];
    current = next;
    renderPanel();
    if (!dialog.open) dialog.show();
    site.classList.add('has-panel');
    $('#view-status').textContent = `已打开${$('#preview-title').textContent}`;
    return true;
  }
  function closePanel() { if (dialog.open) dialog.close(); }
  dialog.addEventListener('close', () => { current = null; trail = []; site.classList.remove('has-panel'); });
  closeButton.addEventListener('click', closePanel);
  backButton.addEventListener('click', () => {
    if (!trail.length) { closePanel(); return; }
    current = trail.pop();
    renderPanel();
    emit('navigate', current);
  });

  /* ---------- image viewer ---------- */
  function setViewerLink(href, label) {
    const link = $('#image-viewer-link');
    if (href) { link.hidden = false; link.href = href; link.textContent = label; }
    else { link.hidden = true; link.removeAttribute('href'); link.textContent = ''; }
  }
  function renderImage(index) {
    const pin = D.allPins[index];
    if (!pin) return;
    const group = D.boardPins.find(items => items.some(item => item.index === index)) || [pin];
    imageSelection = { index, group, position: group.findIndex(item => item.index === index) };
    const img = $('#image-viewer-image');
    img.src = pin.file; img.alt = `${pin.title} · 所属画板：${pin.board}`;
    $('#image-viewer-board').textContent = `画板 / ${pin.board}`;
    $('#image-viewer-title').textContent = pin.title;
    $('#image-viewer-counter').textContent = `${imageSelection.position + 1} / ${group.length}`;
    imageViewer.style.setProperty('--hue', D.C.violet);
    setViewerLink(pin.pin_url, '在 Pinterest 打开 ↗');
    $('#image-viewer-prev').disabled = group.length < 2;
    $('#image-viewer-next').disabled = group.length < 2;
  }
  function renderCaseImage(id, index) {
    const item = D.caseById.get(id), images = item?.images || [], image = images[index];
    if (!item || !image) return;
    imageSelection = { kind: 'case', id, index, count: images.length };
    const img = $('#image-viewer-image');
    img.src = image.file; img.alt = image.caption ? `${item.title}：${image.caption}` : item.title;
    $('#image-viewer-board').textContent = item.title;
    $('#image-viewer-title').textContent = image.caption || '';
    $('#image-viewer-counter').textContent = `${index + 1} / ${images.length}`;
    imageViewer.style.setProperty('--hue', D.C.coral);
    setViewerLink(item.source?.url, '打开微信原文 ↗');
    $('#image-viewer-prev').disabled = images.length < 2;
    $('#image-viewer-next').disabled = images.length < 2;
  }
  function openImage(index, trigger) {
    if (!D.allPins[index]) return;
    if (!dialog.open) {
      const boardIndex = D.boardPins.findIndex(items => items.some(pin => pin.index === index));
      if (boardIndex >= 0) openPanel('board', boardIndex);
    }
    imageOpener = trigger || document.activeElement;
    renderImage(index);
    if (!imageViewer.open) imageViewer.showModal();
    imageClose.focus({ preventScroll: true });
  }
  function openCaseImage(id, index, trigger) {
    if (!D.caseById.get(id)?.images?.[index]) return;
    imageOpener = trigger || document.activeElement;
    renderCaseImage(id, index);
    if (!imageViewer.open) imageViewer.showModal();
    imageClose.focus({ preventScroll: true });
  }
  function stepImage(direction) {
    if (!imageSelection) return;
    if (imageSelection.kind === 'case') {
      const n = imageSelection.count;
      renderCaseImage(imageSelection.id, (imageSelection.index + direction + n) % n);
      return;
    }
    const { group, position } = imageSelection;
    renderImage(group[(position + direction + group.length) % group.length].index);
  }
  imageClose.addEventListener('click', () => imageViewer.close());
  $('#image-viewer-prev').addEventListener('click', () => stepImage(-1));
  $('#image-viewer-next').addEventListener('click', () => stepImage(1));
  imageViewer.addEventListener('cancel', e => { e.preventDefault(); imageViewer.close(); });
  imageViewer.addEventListener('close', () => {
    if (imageOpener?.isConnected && dialog.contains(imageOpener)) imageOpener.focus({ preventScroll: true });
    imageSelection = null;
  });
  let imageBackdropDown = false;
  const outsideImage = e => { const r = imageViewer.getBoundingClientRect(); return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom; };
  imageViewer.addEventListener('pointerdown', e => { imageBackdropDown = e.target === imageViewer && outsideImage(e); });
  imageViewer.addEventListener('click', e => { if (imageBackdropDown && e.target === imageViewer && outsideImage(e)) imageViewer.close(); imageBackdropDown = false; });
  document.addEventListener('keydown', e => {
    if (!imageViewer.open) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); stepImage(e.key === 'ArrowLeft' ? -1 : 1); }
  });

  /* ---------- mobile touch gestures: sheet swipe-down & lightbox swipe ---------- */
  let sheetDrag = null;
  const sheetHandle = dialog.querySelector('.preview-header');
  const startSheetDrag = e => {
    if (innerWidth >= 760 || e.pointerType !== 'touch' || e.target.closest('button')) return;
    sheetDrag = { y0: e.clientY, dy: 0 };
    dialog.style.transition = 'none';
  };
  dialog.querySelector('.sheet-handle')?.addEventListener('pointerdown', startSheetDrag);
  sheetHandle?.addEventListener('pointerdown', startSheetDrag);
  dialog.addEventListener('pointermove', e => {
    if (!sheetDrag) return;
    sheetDrag.dy = Math.max(0, e.clientY - sheetDrag.y0);
    dialog.style.transform = `translateY(${sheetDrag.dy}px)`;
  });
  const endSheetDrag = () => {
    if (!sheetDrag) return;
    const close = sheetDrag.dy > 85;
    sheetDrag = null;
    dialog.style.transition = '';
    dialog.style.transform = '';
    if (close) closePanel();
  };
  dialog.addEventListener('pointerup', endSheetDrag);
  dialog.addEventListener('pointercancel', endSheetDrag);

  let imgSwipe = null;
  const stage = imageViewer.querySelector('.image-viewer-stage');
  stage?.addEventListener('pointerdown', e => { if (e.pointerType === 'touch' && !e.target.closest('button')) imgSwipe = { x: e.clientX, y: e.clientY }; });
  stage?.addEventListener('pointerup', e => {
    if (!imgSwipe) return;
    const dx = e.clientX - imgSwipe.x, dy = e.clientY - imgSwipe.y; imgSwipe = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) stepImage(dx < 0 ? 1 : -1);
  });
  stage?.addEventListener('pointercancel', () => { imgSwipe = null; });

  /* ---------- clicks inside the panel ---------- */
  content.addEventListener('click', e => {
    const casePicture = e.target.closest('[data-case-id]');
    if (casePicture) { openCaseImage(casePicture.dataset.caseId, Number(casePicture.dataset.caseIndex || 0), casePicture); return; }
    const picture = e.target.closest('[data-image]');
    if (picture) { openImage(Number(picture.dataset.image), picture); return; }
    const row = e.target.closest('[data-open]');
    if (row) {
      const key = row.dataset.open, index = Number(row.dataset.index || 0);
      if (openPanel(key, index, true)) emit('navigate', { k: key, i: index });
      return;
    }
    const caseFilter = e.target.closest('[data-case-category]');
    if (caseFilter) { caseCategory = caseFilter.dataset.caseCategory; renderPanel(true); return; }
    const filter = e.target.closest('[data-category]');
    if (filter) { category = filter.dataset.category; renderPanel(true); }
  });

  window.CYHUI = {
    openPanel, closePanel, openImage, openCaseImage,
    get panelOpen() { return dialog.open; },
    get viewerOpen() { return imageViewer.open; },
    closeViewer: () => imageViewer.close(),
    on: (name, fn) => listeners[name].push(fn),
  };
})();
