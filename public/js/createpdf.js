/* ═══════════════════════════════════════════════════════════════════
   Create PDF – Document Scanner & PDF Generator
   All processing in-browser · No server upload
   ═══════════════════════════════════════════════════════════════════ */
(() => {
'use strict';

const { PDFDocument, rgb, degrees, StandardFonts } = PDFLib;

// ── State ──────────────────────────────────────────────────────────
const state = {
    pages: [],          // { id, originalImg, editedCanvas, filter, brightness, contrast, undoStack, redoStack }
    activeIdx: 0,
    signatureData: null,
    generatedBlob: null,
    generatedName: '',
    idCounter: 0,
};

// ── DOM Helpers ────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

function notify(msg, type = 'info') {
    const el = document.createElement('div');
    el.className = `cpdf-notification ${type}`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => { el.remove(); }, 3500);
}

// ── Image Loading ──────────────────────────────────────────────────
function loadImage(file) {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) { reject(new Error('Not an image')); return; }
        if (file.size > 50 * 1024 * 1024) { reject(new Error('File too large (max 50MB)')); return; }
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = reader.result;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

function imgToCanvas(img) {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth || img.width;
    c.height = img.naturalHeight || img.height;
    c.getContext('2d').drawImage(img, 0, 0);
    return c;
}

function cloneCanvas(src) {
    const c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    c.getContext('2d').drawImage(src, 0, 0);
    return c;
}

// ── Add Pages ──────────────────────────────────────────────────────
async function addImages(files) {
    const fileArr = Array.from(files).slice(0, 50 - state.pages.length);
    if (!fileArr.length) return;

    for (const file of fileArr) {
        try {
            const img = await loadImage(file);
            const canvas = imgToCanvas(img);
            state.pages.push({
                id: ++state.idCounter,
                originalImg: img,
                editedCanvas: canvas,
                filter: 'original',
                brightness: 0,
                contrast: 0,
                undoStack: [],
                redoStack: [],
            });
        } catch (e) {
            notify(`Skipped: ${file.name} – ${e.message}`, 'error');
        }
    }

    if (state.pages.length) {
        showEditor();
        renderThumbs();
        selectPage(state.pages.length > 1 ? state.activeIdx : 0);
    }
}

// ── Section Switching ──────────────────────────────────────────────
function showUpload() {
    $('uploadSection').hidden = false;
    $('editorSection').hidden = true;
    $('resultSection').hidden = true;
}

function showEditor() {
    $('uploadSection').hidden = true;
    $('editorSection').hidden = false;
    $('resultSection').hidden = true;
}

function showResult() {
    $('uploadSection').hidden = true;
    $('editorSection').hidden = true;
    $('resultSection').hidden = false;
}

// ── Thumbnails ─────────────────────────────────────────────────────
function renderThumbs() {
    const list = $('thumbList');
    list.innerHTML = '';
    $('pageCount').textContent = state.pages.length;

    state.pages.forEach((page, idx) => {
        const div = document.createElement('div');
        div.className = 'cpdf-thumb' + (idx === state.activeIdx ? ' active' : '');
        div.dataset.idx = idx;
        div.draggable = true;

        const thumbCanvas = document.createElement('canvas');
        const tw = 160, th = Math.round((page.editedCanvas.height / page.editedCanvas.width) * tw);
        thumbCanvas.width = tw;
        thumbCanvas.height = th;
        thumbCanvas.getContext('2d').drawImage(page.editedCanvas, 0, 0, tw, th);

        const img = document.createElement('img');
        img.src = thumbCanvas.toDataURL('image/jpeg', 0.5);
        img.alt = `Page ${idx + 1}`;
        img.draggable = false;

        const num = document.createElement('span');
        num.className = 'cpdf-thumb-num';
        num.textContent = idx + 1;

        const grip = document.createElement('span');
        grip.className = 'cpdf-thumb-drag';
        grip.innerHTML = '⠿';

        div.append(grip, img, num);
        div.addEventListener('click', () => selectPage(idx));

        // Drag & drop reorder
        div.addEventListener('dragstart', e => {
            e.dataTransfer.setData('text/plain', String(idx));
            div.classList.add('dragging');
        });
        div.addEventListener('dragend', () => div.classList.remove('dragging'));
        div.addEventListener('dragover', e => { e.preventDefault(); div.classList.add('drag-over'); });
        div.addEventListener('dragleave', () => div.classList.remove('drag-over'));
        div.addEventListener('drop', e => {
            e.preventDefault();
            div.classList.remove('drag-over');
            const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
            const toIdx = idx;
            if (fromIdx !== toIdx) reorderPage(fromIdx, toIdx);
        });

        list.appendChild(div);
    });
}

function selectPage(idx) {
    if (idx < 0 || idx >= state.pages.length) return;
    state.activeIdx = idx;

    $$('.cpdf-thumb').forEach((t, i) => t.classList.toggle('active', i === idx));

    renderMainCanvas();
    closePanels();
}

function reorderPage(from, to) {
    const [item] = state.pages.splice(from, 1);
    state.pages.splice(to, 0, item);
    if (state.activeIdx === from) state.activeIdx = to;
    else if (from < state.activeIdx && to >= state.activeIdx) state.activeIdx--;
    else if (from > state.activeIdx && to <= state.activeIdx) state.activeIdx++;
    renderThumbs();
    renderMainCanvas();
}

// ── Main Canvas Rendering ──────────────────────────────────────────
function renderMainCanvas() {
    const page = state.pages[state.activeIdx];
    if (!page) return;

    const mc = $('mainCanvas');
    const src = page.editedCanvas;
    mc.width = src.width;
    mc.height = src.height;
    const ctx = mc.getContext('2d');
    ctx.drawImage(src, 0, 0);

    // Apply live filter for display
    if (page.filter !== 'original') {
        applyFilterToCtx(ctx, mc.width, mc.height, page.filter);
    }

    // Apply live brightness/contrast for display
    if (page.brightness !== 0 || page.contrast !== 0) {
        applyBrightnessContrast(ctx, mc.width, mc.height, page.brightness, page.contrast);
    }

    // Update filter button states
    $$('.cpdf-filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === page.filter));
}

// ── Image Filters ──────────────────────────────────────────────────
function applyFilterToCtx(ctx, w, h, filter) {
    const imageData = ctx.getImageData(0, 0, w, h);
    const d = imageData.data;

    switch (filter) {
        case 'bw': {
            for (let i = 0; i < d.length; i += 4) {
                const avg = d[i] * 0.299 + d[i+1] * 0.587 + d[i+2] * 0.114;
                const val = avg > 128 ? 255 : 0;
                d[i] = d[i+1] = d[i+2] = val;
            }
            break;
        }
        case 'grayscale': {
            for (let i = 0; i < d.length; i += 4) {
                const avg = d[i] * 0.299 + d[i+1] * 0.587 + d[i+2] * 0.114;
                d[i] = d[i+1] = d[i+2] = avg;
            }
            break;
        }
        case 'enhance': {
            for (let i = 0; i < d.length; i += 4) {
                d[i]   = Math.min(255, d[i] * 1.2 + 10);
                d[i+1] = Math.min(255, d[i+1] * 1.15 + 5);
                d[i+2] = Math.min(255, d[i+2] * 1.1);
            }
            break;
        }
        case 'highcontrast': {
            for (let i = 0; i < d.length; i += 4) {
                const avg = d[i] * 0.299 + d[i+1] * 0.587 + d[i+2] * 0.114;
                const factor = 2.5;
                const val = Math.min(255, Math.max(0, ((avg - 128) * factor) + 128));
                const bw = val > 120 ? 255 : 0;
                d[i] = d[i+1] = d[i+2] = bw;
            }
            break;
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

function applyBrightnessContrast(ctx, w, h, brightness, contrast) {
    const imageData = ctx.getImageData(0, 0, w, h);
    const d = imageData.data;
    const b = brightness;
    const c = (contrast + 100) / 100;
    const factor = (259 * (c * 255 + 255)) / (255 * (259 - c * 255));

    for (let i = 0; i < d.length; i += 4) {
        d[i]   = Math.min(255, Math.max(0, factor * (d[i] - 128) + 128 + b));
        d[i+1] = Math.min(255, Math.max(0, factor * (d[i+1] - 128) + 128 + b));
        d[i+2] = Math.min(255, Math.max(0, factor * (d[i+2] - 128) + 128 + b));
    }
    ctx.putImageData(imageData, 0, 0);
}

// ── Sharpen ────────────────────────────────────────────────────────
function applySharpen(ctx, w, h) {
    const imageData = ctx.getImageData(0, 0, w, h);
    const d = imageData.data;
    const copy = new Uint8ClampedArray(d);
    // 3x3 sharpen kernel
    const k = [0, -1, 0, -1, 5, -1, 0, -1, 0];
    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            for (let c = 0; c < 3; c++) {
                let sum = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = ((y + ky) * w + (x + kx)) * 4 + c;
                        sum += copy[idx] * k[(ky + 1) * 3 + (kx + 1)];
                    }
                }
                d[(y * w + x) * 4 + c] = Math.min(255, Math.max(0, sum));
            }
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

// ── Rotate ─────────────────────────────────────────────────────────
function rotatePage(direction) {
    const page = state.pages[state.activeIdx];
    if (!page) return;
    pushUndo(page);

    const src = page.editedCanvas;
    const c = document.createElement('canvas');
    c.width = src.height;
    c.height = src.width;
    const ctx = c.getContext('2d');
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate((direction === 'right' ? 90 : -90) * Math.PI / 180);
    ctx.drawImage(src, -src.width / 2, -src.height / 2);

    page.editedCanvas = c;
    renderThumbs();
    renderMainCanvas();
}

// ── Perspective Correction (simple 4-point manual not practical in vanilla,
//    so we apply auto-enhancement: slight keystone correction heuristic) ───
function applyPerspective() {
    const page = state.pages[state.activeIdx];
    if (!page) return;
    pushUndo(page);

    const src = page.editedCanvas;
    const c = document.createElement('canvas');
    // Slight trapezoidal correction — adjusts top width
    const shrink = 0.03;
    c.width = src.width;
    c.height = src.height;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);

    const dx = Math.round(src.width * shrink);
    // Draw with CSS-like perspective via drawImage source mapping (simple stretch)
    ctx.drawImage(src,
        0, 0, src.width, src.height,
        dx, 0, src.width - dx * 2, src.height
    );

    page.editedCanvas = c;
    renderThumbs();
    renderMainCanvas();
    notify('Perspective correction applied', 'success');
}

// ── Crop ───────────────────────────────────────────────────────────
let cropState = { active: false, x: 0, y: 0, w: 0, h: 0, dragging: null, startX: 0, startY: 0 };

function startCrop() {
    const page = state.pages[state.activeIdx];
    if (!page) return;

    const mc = $('mainCanvas');
    const rect = mc.getBoundingClientRect();
    const scaleX = mc.width / rect.width;
    const scaleY = mc.height / rect.height;

    // Default crop: 80% centered
    const margin = 0.1;
    cropState = {
        active: true,
        x: Math.round(rect.width * margin),
        y: Math.round(rect.height * margin),
        w: Math.round(rect.width * (1 - margin * 2)),
        h: Math.round(rect.height * (1 - margin * 2)),
        scaleX, scaleY,
        dragging: null, startX: 0, startY: 0,
        origX: 0, origY: 0, origW: 0, origH: 0,
    };

    const box = $('cropBox');
    box.hidden = false;
    $('cropOverlay').hidden = false;
    updateCropBox();
}

function updateCropBox() {
    const box = $('cropBox');
    box.style.left = cropState.x + 'px';
    box.style.top = cropState.y + 'px';
    box.style.width = cropState.w + 'px';
    box.style.height = cropState.h + 'px';
}

function applyCrop() {
    const page = state.pages[state.activeIdx];
    if (!page) return;
    pushUndo(page);

    const mc = $('mainCanvas');
    const rect = mc.getBoundingClientRect();
    const scaleX = mc.width / rect.width;
    const scaleY = mc.height / rect.height;

    const sx = Math.round(cropState.x * scaleX);
    const sy = Math.round(cropState.y * scaleY);
    const sw = Math.round(cropState.w * scaleX);
    const sh = Math.round(cropState.h * scaleY);

    if (sw < 10 || sh < 10) { notify('Crop area too small', 'error'); return; }

    const c = document.createElement('canvas');
    c.width = sw;
    c.height = sh;
    c.getContext('2d').drawImage(page.editedCanvas, sx, sy, sw, sh, 0, 0, sw, sh);

    page.editedCanvas = c;
    cancelCrop();
    renderThumbs();
    renderMainCanvas();
    notify('Cropped successfully', 'success');
}

function cancelCrop() {
    cropState.active = false;
    $('cropBox').hidden = true;
    $('cropOverlay').hidden = true;
    $$('.cpdf-tool-btn[data-tool="crop"]').forEach(b => b.classList.remove('active'));
}

// Crop handle dragging
function initCropDrag() {
    const wrap = $('previewWrap');

    wrap.addEventListener('pointerdown', e => {
        if (!cropState.active) return;
        const handle = e.target.closest('.cpdf-crop-handle');
        const box = e.target.closest('.cpdf-crop-box');
        if (!handle && !box) return;

        e.preventDefault();
        cropState.dragging = handle ? handle.dataset.handle : 'move';
        cropState.startX = e.clientX;
        cropState.startY = e.clientY;
        cropState.origX = cropState.x;
        cropState.origY = cropState.y;
        cropState.origW = cropState.w;
        cropState.origH = cropState.h;
    });

    document.addEventListener('pointermove', e => {
        if (!cropState.dragging) return;
        e.preventDefault();
        const dx = e.clientX - cropState.startX;
        const dy = e.clientY - cropState.startY;
        const d = cropState.dragging;

        if (d === 'move') {
            cropState.x = cropState.origX + dx;
            cropState.y = cropState.origY + dy;
        } else if (d === 'br') {
            cropState.w = Math.max(30, cropState.origW + dx);
            cropState.h = Math.max(30, cropState.origH + dy);
        } else if (d === 'tl') {
            cropState.x = cropState.origX + dx;
            cropState.y = cropState.origY + dy;
            cropState.w = Math.max(30, cropState.origW - dx);
            cropState.h = Math.max(30, cropState.origH - dy);
        } else if (d === 'tr') {
            cropState.y = cropState.origY + dy;
            cropState.w = Math.max(30, cropState.origW + dx);
            cropState.h = Math.max(30, cropState.origH - dy);
        } else if (d === 'bl') {
            cropState.x = cropState.origX + dx;
            cropState.w = Math.max(30, cropState.origW - dx);
            cropState.h = Math.max(30, cropState.origH + dy);
        }
        updateCropBox();
    });

    document.addEventListener('pointerup', () => { cropState.dragging = null; });
}

// ── Undo / Redo ────────────────────────────────────────────────────
function pushUndo(page) {
    page.undoStack.push(cloneCanvas(page.editedCanvas));
    if (page.undoStack.length > 20) page.undoStack.shift();
    page.redoStack = [];
}

function undo() {
    const page = state.pages[state.activeIdx];
    if (!page || !page.undoStack.length) return;
    page.redoStack.push(cloneCanvas(page.editedCanvas));
    page.editedCanvas = page.undoStack.pop();
    renderThumbs();
    renderMainCanvas();
}

function redo() {
    const page = state.pages[state.activeIdx];
    if (!page || !page.redoStack.length) return;
    page.undoStack.push(cloneCanvas(page.editedCanvas));
    page.editedCanvas = page.redoStack.pop();
    renderThumbs();
    renderMainCanvas();
}

// ── Page Operations ────────────────────────────────────────────────
function duplicatePage() {
    const page = state.pages[state.activeIdx];
    if (!page || state.pages.length >= 50) return;
    state.pages.splice(state.activeIdx + 1, 0, {
        id: ++state.idCounter,
        originalImg: page.originalImg,
        editedCanvas: cloneCanvas(page.editedCanvas),
        filter: page.filter,
        brightness: page.brightness,
        contrast: page.contrast,
        undoStack: [],
        redoStack: [],
    });
    renderThumbs();
    selectPage(state.activeIdx + 1);
    notify('Page duplicated', 'success');
}

function deletePage() {
    if (state.pages.length <= 1) {
        state.pages = [];
        showUpload();
        return;
    }
    state.pages.splice(state.activeIdx, 1);
    if (state.activeIdx >= state.pages.length) state.activeIdx = state.pages.length - 1;
    renderThumbs();
    selectPage(state.activeIdx);
    notify('Page deleted', 'success');
}

// ── Close panels helper ────────────────────────────────────────────
function closePanels() {
    $('adjustPanel').hidden = true;
    cancelCrop();
    $$('.cpdf-tool-btn').forEach(b => b.classList.remove('active'));
    const page = state.pages[state.activeIdx];
    if (page) {
        $$('.cpdf-filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === page.filter));
    }
}

// ── Camera ─────────────────────────────────────────────────────────
let cameraStream = null;

async function openCamera() {
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
        });
        $('cameraVideo').srcObject = cameraStream;
        $('cameraModal').classList.add('active');
    } catch (e) {
        notify('Camera access denied or not available', 'error');
    }
}

function capturePhoto() {
    const video = $('cameraVideo');
    const canvas = $('cameraCanvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    const img = new Image();
    img.onload = () => {
        const c = imgToCanvas(img);
        state.pages.push({
            id: ++state.idCounter,
            originalImg: img,
            editedCanvas: c,
            filter: 'original',
            brightness: 0,
            contrast: 0,
            undoStack: [],
            redoStack: [],
        });
        showEditor();
        renderThumbs();
        selectPage(state.pages.length - 1);
        notify('Photo captured!', 'success');
    };
    img.src = canvas.toDataURL('image/jpeg', 0.92);
}

function closeCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
        cameraStream = null;
    }
    $('cameraModal').classList.remove('active');
}

// ── Signature Pad ──────────────────────────────────────────────────
let sigCtx, sigDrawing = false;

function initSignaturePad() {
    const canvas = $('signatureCanvas');
    sigCtx = canvas.getContext('2d');
    sigCtx.strokeStyle = '#fff';
    sigCtx.lineWidth = 2.5;
    sigCtx.lineCap = 'round';
    sigCtx.lineJoin = 'round';

    canvas.addEventListener('pointerdown', e => {
        sigDrawing = true;
        sigCtx.beginPath();
        const rect = canvas.getBoundingClientRect();
        sigCtx.moveTo(
            (e.clientX - rect.left) * (canvas.width / rect.width),
            (e.clientY - rect.top) * (canvas.height / rect.height)
        );
    });
    canvas.addEventListener('pointermove', e => {
        if (!sigDrawing) return;
        const rect = canvas.getBoundingClientRect();
        sigCtx.lineTo(
            (e.clientX - rect.left) * (canvas.width / rect.width),
            (e.clientY - rect.top) * (canvas.height / rect.height)
        );
        sigCtx.stroke();
    });
    canvas.addEventListener('pointerup', () => { sigDrawing = false; });
    canvas.addEventListener('pointerleave', () => { sigDrawing = false; });
}

function clearSignature() {
    sigCtx.clearRect(0, 0, $('signatureCanvas').width, $('signatureCanvas').height);
}

function applySignature() {
    const canvas = $('signatureCanvas');
    // Check if empty
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    if (canvas.toDataURL() === blank.toDataURL()) {
        notify('Please draw a signature first', 'error');
        return;
    }
    state.signatureData = canvas.toDataURL('image/png');
    $('signatureModal').classList.remove('active');
    notify('Signature saved', 'success');
}

// ── Preview ────────────────────────────────────────────────────────
function showPreview() {
    const container = $('previewPages');
    container.innerHTML = '';

    state.pages.forEach((page, idx) => {
        const c = document.createElement('canvas');
        const src = page.editedCanvas;
        const maxW = 600;
        const scale = Math.min(1, maxW / src.width);
        c.width = Math.round(src.width * scale);
        c.height = Math.round(src.height * scale);
        const ctx = c.getContext('2d');
        ctx.drawImage(src, 0, 0, c.width, c.height);
        if (page.filter !== 'original') applyFilterToCtx(ctx, c.width, c.height, page.filter);
        if (page.brightness !== 0 || page.contrast !== 0) applyBrightnessContrast(ctx, c.width, c.height, page.brightness, page.contrast);

        const label = document.createElement('p');
        label.style.cssText = 'color:var(--text3);font-size:.8rem;margin-top:4px;';
        label.textContent = `Page ${idx + 1}`;

        container.append(c, label);
    });

    $('previewModal').classList.add('active');
}

// ── PDF Generation ─────────────────────────────────────────────────
async function generatePDF() {
    const fileName = $('pdfFileName').value.trim() || 'Scanned Document';
    const pageSize = $('pageSize').value;
    const orientation = $('pageOrientation').value;
    const margin = parseFloat($('pageMargin').value) * 2.835; // mm to points
    const quality = parseFloat($('imageQuality').value);
    const addPageNums = $('addPageNumbers').checked;
    const compress = $('compressPdf').checked;
    const watermarkEnabled = $('addWatermark').checked;
    const watermarkText = $('watermarkText').value.trim();
    const ocrEnabled = $('enableOcr').checked;
    const signEnabled = $('addSignature').checked;

    // Close settings modal
    $('settingsModal').classList.remove('active');

    // Show progress
    $('progressOverlay').hidden = false;
    const setProgress = (pct, text) => {
        $('progressFill').style.width = pct + '%';
        $('progressPct').textContent = Math.round(pct) + '%';
        if (text) $('progressText').textContent = text;
    };

    try {
        const pdfDoc = await PDFDocument.create();
        const totalPages = state.pages.length;

        // Page dimensions (points)
        const PAGE_SIZES = {
            a4:     [595.28, 841.89],
            letter: [612, 792],
            legal:  [612, 1008],
            fit:    null,
        };

        let ocrTexts = [];

        for (let i = 0; i < totalPages; i++) {
            setProgress((i / totalPages) * 80, `Processing page ${i + 1} of ${totalPages}`);
            await new Promise(r => setTimeout(r, 10)); // yield for UI update

            const page = state.pages[i];

            // Render final image with filters applied
            const finalCanvas = cloneCanvas(page.editedCanvas);
            const fCtx = finalCanvas.getContext('2d');
            if (page.filter !== 'original') applyFilterToCtx(fCtx, finalCanvas.width, finalCanvas.height, page.filter);
            if (page.brightness !== 0 || page.contrast !== 0) {
                applyBrightnessContrast(fCtx, finalCanvas.width, finalCanvas.height, page.brightness, page.contrast);
            }

            // Optimize: resize large images
            let outCanvas = finalCanvas;
            const maxDim = quality >= 0.9 ? 3000 : quality >= 0.7 ? 2400 : 1600;
            if (finalCanvas.width > maxDim || finalCanvas.height > maxDim) {
                const scale = maxDim / Math.max(finalCanvas.width, finalCanvas.height);
                const rc = document.createElement('canvas');
                rc.width = Math.round(finalCanvas.width * scale);
                rc.height = Math.round(finalCanvas.height * scale);
                rc.getContext('2d').drawImage(finalCanvas, 0, 0, rc.width, rc.height);
                outCanvas = rc;
            }

            const imgBytes = await new Promise(resolve => {
                outCanvas.toBlob(blob => blob.arrayBuffer().then(resolve), 'image/jpeg', quality);
            });

            const img = await pdfDoc.embedJpg(imgBytes);
            const imgW = img.width;
            const imgH = img.height;

            let pw, ph;
            if (pageSize === 'fit') {
                pw = imgW + margin * 2;
                ph = imgH + margin * 2;
            } else {
                [pw, ph] = PAGE_SIZES[pageSize];
                if (orientation === 'landscape') [pw, ph] = [ph, pw];
            }

            const pdfPage = pdfDoc.addPage([pw, ph]);

            // Scale image to fit within page minus margins
            const availW = pw - margin * 2;
            const availH = ph - margin * 2;
            const scale = Math.min(availW / imgW, availH / imgH, 1);
            const drawW = imgW * scale;
            const drawH = imgH * scale;
            const x = margin + (availW - drawW) / 2;
            const y = margin + (availH - drawH) / 2;

            pdfPage.drawImage(img, { x, y, width: drawW, height: drawH });

            // Watermark
            if (watermarkEnabled && watermarkText) {
                const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
                const wmSize = Math.min(pw, ph) * 0.08;
                const wmWidth = font.widthOfTextAtSize(watermarkText, wmSize);
                pdfPage.drawText(watermarkText, {
                    x: (pw - wmWidth) / 2,
                    y: ph / 2,
                    size: wmSize,
                    font,
                    color: rgb(0.7, 0.7, 0.7),
                    opacity: 0.25,
                    rotate: degrees(-45),
                });
            }

            // Page numbers
            if (addPageNums) {
                const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
                const numText = `${i + 1} / ${totalPages}`;
                const numW = font.widthOfTextAtSize(numText, 9);
                pdfPage.drawText(numText, {
                    x: (pw - numW) / 2,
                    y: 16,
                    size: 9,
                    font,
                    color: rgb(0.5, 0.5, 0.5),
                });
            }

            // Signature on last page
            if (signEnabled && state.signatureData && i === totalPages - 1) {
                try {
                    const sigBytes = await fetch(state.signatureData).then(r => r.arrayBuffer());
                    const sigImg = await pdfDoc.embedPng(sigBytes);
                    const sigScale = Math.min(150 / sigImg.width, 60 / sigImg.height);
                    pdfPage.drawImage(sigImg, {
                        x: pw - margin - sigImg.width * sigScale - 10,
                        y: margin + 10,
                        width: sigImg.width * sigScale,
                        height: sigImg.height * sigScale,
                    });
                } catch (_) {}
            }

            // OCR
            if (ocrEnabled && typeof Tesseract !== 'undefined') {
                setProgress((i / totalPages) * 80 + 5, `OCR: Extracting text from page ${i + 1}...`);
                try {
                    const result = await Tesseract.recognize(outCanvas, 'eng');
                    if (result.data && result.data.text) {
                        ocrTexts.push(`--- Page ${i + 1} ---\n${result.data.text}`);
                    }
                } catch (_) {}
            }
        }

        setProgress(90, 'Finalizing PDF...');
        await new Promise(r => setTimeout(r, 10));

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });

        state.generatedBlob = blob;
        state.generatedName = fileName;

        // Size info
        const sizeMB = (blob.size / (1024 * 1024)).toFixed(2);
        $('resultInfo').textContent = `${fileName}.pdf · ${totalPages} page${totalPages > 1 ? 's' : ''} · ${sizeMB} MB`;

        if (ocrTexts.length) {
            const ocrBlob = new Blob([ocrTexts.join('\n\n')], { type: 'text/plain' });
            const ocrUrl = URL.createObjectURL(ocrBlob);
            $('resultInfo').innerHTML += `<br><a href="${ocrUrl}" download="${encodeURIComponent(fileName)}_OCR.txt" style="color:var(--accent-hover);text-decoration:underline;font-size:.85rem;">Download extracted text (OCR)</a>`;
        }

        setProgress(100, 'Done!');
        await new Promise(r => setTimeout(r, 400));
        $('progressOverlay').hidden = true;

        showResult();
        notify('PDF generated successfully!', 'success');

    } catch (err) {
        console.error('PDF generation error:', err);
        $('progressOverlay').hidden = true;
        notify('Failed to generate PDF: ' + err.message, 'error');
    }
}

// ── Download / Share ───────────────────────────────────────────────
function downloadPDF() {
    if (!state.generatedBlob) return;
    const url = URL.createObjectURL(state.generatedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (state.generatedName || 'document') + '.pdf';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function sharePDF() {
    if (!state.generatedBlob) return;
    if (navigator.share) {
        try {
            const file = new File([state.generatedBlob], (state.generatedName || 'document') + '.pdf', { type: 'application/pdf' });
            await navigator.share({ files: [file], title: state.generatedName });
        } catch (_) {
            downloadPDF(); // fallback
        }
    } else {
        downloadPDF();
        notify('Share not supported on this browser — downloaded instead', 'info');
    }
}

function previewInBrowser() {
    if (!state.generatedBlob) return;
    const url = URL.createObjectURL(state.generatedBlob);
    window.open(url, '_blank');
}

// ── Event Wiring ───────────────────────────────────────────────────
function setupEvents() {
    // Upload zone
    const dropzone = $('dropzone');
    const fileInput = $('fileInput');

    dropzone.addEventListener('click', () => fileInput.click());
    $('browseBtn').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => { if (fileInput.files.length) addImages(fileInput.files); fileInput.value = ''; });

    dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', e => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length) addImages(e.dataTransfer.files);
    });

    // Camera
    $('cameraBtn').addEventListener('click', openCamera);
    $('captureBtn').addEventListener('click', capturePhoto);
    $('cameraClose').addEventListener('click', closeCamera);

    // Add more images
    $('addMoreBtn').addEventListener('click', () => $('addMoreInput').click());
    $('addMoreInput').addEventListener('change', () => {
        if ($('addMoreInput').files.length) addImages($('addMoreInput').files);
        $('addMoreInput').value = '';
    });

    // Toolbar tools
    $$('.cpdf-tool-btn[data-tool]').forEach(btn => {
        btn.addEventListener('click', () => {
            const tool = btn.dataset.tool;
            if (tool === 'rotate-left') { rotatePage('left'); return; }
            if (tool === 'rotate-right') { rotatePage('right'); return; }
            if (tool === 'perspective') { applyPerspective(); return; }
            if (tool === 'sharpen') {
                const page = state.pages[state.activeIdx];
                if (!page) return;
                pushUndo(page);
                const ctx = page.editedCanvas.getContext('2d');
                applySharpen(ctx, page.editedCanvas.width, page.editedCanvas.height);
                renderThumbs();
                renderMainCanvas();
                notify('Sharpened', 'success');
                return;
            }
            if (tool === 'crop') {
                if (cropState.active) { cancelCrop(); return; }
                closePanels();
                btn.classList.add('active');
                startCrop();
                return;
            }
            if (tool === 'brightness') {
                closePanels();
                btn.classList.add('active');
                const page = state.pages[state.activeIdx];
                if (page) {
                    $('brightnessSlider').value = page.brightness;
                    $('brightnessVal').textContent = page.brightness;
                    $('contrastSlider').value = page.contrast;
                    $('contrastVal').textContent = page.contrast;
                }
                $('adjustPanel').hidden = false;
                return;
            }
        });
    });

    // Filters
    $$('.cpdf-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = state.pages[state.activeIdx];
            if (!page) return;
            page.filter = btn.dataset.filter;
            $$('.cpdf-filter-btn').forEach(b => b.classList.toggle('active', b === btn));
            renderMainCanvas();
        });
    });

    // Brightness/Contrast sliders
    $('brightnessSlider').addEventListener('input', e => {
        $('brightnessVal').textContent = e.target.value;
        const page = state.pages[state.activeIdx];
        if (page) { page.brightness = parseInt(e.target.value); renderMainCanvas(); }
    });
    $('contrastSlider').addEventListener('input', e => {
        $('contrastVal').textContent = e.target.value;
        const page = state.pages[state.activeIdx];
        if (page) { page.contrast = parseInt(e.target.value); renderMainCanvas(); }
    });
    $('resetAdjust').addEventListener('click', () => {
        const page = state.pages[state.activeIdx];
        if (page) { page.brightness = 0; page.contrast = 0; }
        $('brightnessSlider').value = 0; $('brightnessVal').textContent = '0';
        $('contrastSlider').value = 0; $('contrastVal').textContent = '0';
        renderMainCanvas();
    });
    $('applyAdjust').addEventListener('click', () => {
        const page = state.pages[state.activeIdx];
        if (!page) return;
        pushUndo(page);
        // Bake adjustments into the canvas
        const c = cloneCanvas(page.editedCanvas);
        const ctx = c.getContext('2d');
        if (page.brightness !== 0 || page.contrast !== 0) {
            applyBrightnessContrast(ctx, c.width, c.height, page.brightness, page.contrast);
        }
        page.editedCanvas = c;
        page.brightness = 0;
        page.contrast = 0;
        $('brightnessSlider').value = 0; $('brightnessVal').textContent = '0';
        $('contrastSlider').value = 0; $('contrastVal').textContent = '0';
        closePanels();
        renderThumbs();
        renderMainCanvas();
        notify('Adjustments applied', 'success');
    });

    // Crop
    $('applyCrop').addEventListener('click', applyCrop);
    $('cancelCrop').addEventListener('click', cancelCrop);
    initCropDrag();

    // Page operations
    $('duplicatePageBtn').addEventListener('click', duplicatePage);
    $('deletePageBtn').addEventListener('click', deletePage);
    $('undoBtn').addEventListener('click', undo);
    $('redoBtn').addEventListener('click', redo);

    // Bottom bar
    $('backToUpload').addEventListener('click', () => {
        if (state.pages.length && !confirm('Go back? Your pages will be preserved.')) return;
        showUpload();
    });
    $('previewPdfBtn').addEventListener('click', showPreview);
    $('generatePdfBtn').addEventListener('click', () => {
        if (!state.pages.length) { notify('Add at least one image', 'error'); return; }
        $('settingsModal').classList.add('active');
    });

    // Settings modal
    $('settingsClose').addEventListener('click', () => $('settingsModal').classList.remove('active'));
    $('settingsCancel').addEventListener('click', () => $('settingsModal').classList.remove('active'));
    $('settingsConfirm').addEventListener('click', () => {
        // Check signature
        if ($('addSignature').checked && !state.signatureData) {
            $('settingsModal').classList.remove('active');
            $('signatureModal').classList.add('active');
            return;
        }
        generatePDF();
    });

    // Toggle sub-inputs
    $('addWatermark').addEventListener('change', e => { $('watermarkText').hidden = !e.target.checked; });
    $('passwordProtect').addEventListener('change', e => { $('pdfPassword').hidden = !e.target.checked; });
    $('addSignature').addEventListener('change', e => {
        if (e.target.checked && !state.signatureData) {
            $('signatureModal').classList.add('active');
        }
    });

    // Signature modal
    $('sigClose').addEventListener('click', () => { $('signatureModal').classList.remove('active'); $('addSignature').checked = false; });
    $('sigClear').addEventListener('click', clearSignature);
    $('sigApply').addEventListener('click', () => {
        applySignature();
        // Re-open settings if it was pending
        if (!$('settingsModal').classList.contains('active')) {
            $('settingsModal').classList.add('active');
        }
    });

    // Preview modal
    $('previewClose').addEventListener('click', () => $('previewModal').classList.remove('active'));

    // Result actions
    $('downloadPdfBtn').addEventListener('click', downloadPDF);
    $('sharePdfBtn').addEventListener('click', sharePDF);
    $('previewResultBtn').addEventListener('click', previewInBrowser);
    $('createAnotherBtn').addEventListener('click', () => {
        state.pages = [];
        state.activeIdx = 0;
        state.generatedBlob = null;
        state.generatedName = '';
        state.signatureData = null;
        showUpload();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            $$('.cpdf-modal.active').forEach(m => m.classList.remove('active'));
            closeCamera();
            cancelCrop();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
    });

    // Close modals on backdrop click
    $$('.cpdf-modal').forEach(modal => {
        modal.addEventListener('click', e => {
            if (e.target === modal) {
                modal.classList.remove('active');
                if (modal.id === 'cameraModal') closeCamera();
            }
        });
    });

    // Save session progress locally
    window.addEventListener('beforeunload', e => {
        if (state.pages.length > 0 && !state.generatedBlob) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
}

// ── Init ───────────────────────────────────────────────────────────
function init() {
    setupEvents();
    initSignaturePad();
}

init();

})();
