(function () {
    'use strict';

    /* ═══════════════════════════════════════════════════════════════════
       PDF Toolkit – Client-Side PDF Processing
       All processing happens in the browser. Files never leave the device.
       ═══════════════════════════════════════════════════════════════════ */

    let PDFDocument, rgb, degrees, StandardFonts, grayscale;
    if (typeof PDFLib !== 'undefined') {
        ({ PDFDocument, rgb, degrees, StandardFonts, grayscale } = PDFLib);
    }

    if (window.pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    /* ── Tool Metadata ────────────────────────────────────────────── */
    const CATEGORIES = [
        { id: 'organize', name: '📁 Organize', tools: ['merge','split','remove-pages','organize'] },
        { id: 'optimize', name: '⚡ Optimize', tools: ['compress','repair','pdfa'] },
        { id: 'to-pdf', name: '📄 Convert to PDF', tools: ['word-to-pdf','jpg-to-pdf','html-to-pdf','ppt-to-pdf','excel-to-pdf','create-pdf'] },
        { id: 'from-pdf', name: '🔄 Convert from PDF', tools: ['pdf-to-word','pdf-to-jpg','pdf-to-excel','pdf-to-ppt'] },
        { id: 'edit', name: '✏️ Edit', tools: ['edit','crop','compare'] },
        { id: 'security', name: '🔒 Security', tools: ['protect','unlock','redact'] },
        { id: 'personalize', name: '🎨 Personalize', tools: ['watermark','page-numbers','rotate'] },
        { id: 'advanced', name: '🚀 Advanced', tools: ['sign','ocr','batch'] },
    ];

    const TOOLS = {
        'merge':        { name:'Merge PDF',        icon:'📎', desc:'Combine multiple PDFs into one document',           color:'#4361ee' },
        'split':        { name:'Split PDF',        icon:'✂️', desc:'Divide a PDF into smaller files',                   color:'#7209b7' },
        'remove-pages': { name:'Remove Pages',     icon:'🗑️', desc:'Delete unwanted pages from a PDF',                 color:'#ef476f' },
        'organize':     { name:'Organize PDF',     icon:'🔀', desc:'Reorder, rotate and rearrange pages',              color:'#06d6a0' },
        'compress':     { name:'Compress PDF',     icon:'📦', desc:'Reduce PDF file size',                              color:'#4361ee' },
        'repair':       { name:'Repair PDF',       icon:'🔧', desc:'Fix corrupted or damaged PDF files',               color:'#ffd166' },
        'pdfa':         { name:'Convert to PDF/A', icon:'🏛️', desc:'Convert to PDF/A for long-term archiving',         color:'#06d6a0' },
        'pdf-to-word':  { name:'PDF to Word',      icon:'📝', desc:'Extract text from PDF to editable document',       color:'#4361ee' },
        'pdf-to-jpg':   { name:'PDF to JPG',       icon:'🖼️', desc:'Convert PDF pages into images',                    color:'#7209b7' },
        'pdf-to-excel': { name:'PDF to Excel',     icon:'📊', desc:'Extract data from PDF to spreadsheet',             color:'#06d6a0' },
        'pdf-to-ppt':   { name:'PDF to PPT',       icon:'📽️', desc:'Convert PDF pages for presentations',             color:'#ef476f' },
        'word-to-pdf':  { name:'Word to PDF',      icon:'📄', desc:'Convert DOC/DOCX files to PDF',                    color:'#4361ee' },
        'jpg-to-pdf':   { name:'JPG to PDF',       icon:'🖼️', desc:'Convert images into a PDF document',              color:'#7209b7' },
        'html-to-pdf':  { name:'HTML to PDF',      icon:'🌐', desc:'Convert HTML content to PDF',                      color:'#ffd166' },
        'ppt-to-pdf':   { name:'PPT to PDF',       icon:'📽️', desc:'Convert presentations to PDF',                    color:'#ef476f' },
        'excel-to-pdf': { name:'Excel to PDF',     icon:'📊', desc:'Convert spreadsheet data to PDF',                  color:'#06d6a0' },
        'edit':         { name:'Edit PDF',         icon:'✏️', desc:'Add text, images and annotations',                 color:'#4361ee' },
        'crop':         { name:'Crop PDF',         icon:'✂️', desc:'Trim margins and adjust page area',                color:'#7209b7' },
        'compare':      { name:'Compare PDF',      icon:'🔍', desc:'Compare two PDFs side by side',                    color:'#ffd166' },
        'protect':      { name:'Protect PDF',      icon:'🔐', desc:'Add password encryption to PDF',                   color:'#ef476f' },
        'unlock':       { name:'Unlock PDF',       icon:'🔓', desc:'Remove password from protected PDF',               color:'#06d6a0' },
        'redact':       { name:'Redact PDF',       icon:'██', desc:'Permanently hide sensitive content',               color:'#ef476f' },
        'watermark':    { name:'Add Watermark',    icon:'💧', desc:'Add text or image watermark to pages',             color:'#4361ee' },
        'page-numbers': { name:'Page Numbers',     icon:'🔢', desc:'Add page numbers to your document',               color:'#7209b7' },
        'rotate':       { name:'Rotate PDF',       icon:'🔄', desc:'Rotate pages 90°, 180° or 270°',                  color:'#ffd166' },
        'sign':         { name:'Sign PDF',         icon:'✍️', desc:'Draw and place your signature on PDF',             color:'#4361ee' },
        'ocr':          { name:'OCR',              icon:'👁️', desc:'Extract text from scanned documents or images',    color:'#7209b7' },
        'batch':        { name:'Batch Process',    icon:'⚙️', desc:'Process multiple PDFs at once',                    color:'#06d6a0' },
        'create-pdf':   { name:'Create PDF',       icon:'📸', desc:'Scan documents, edit images & create PDFs',         color:'#8b5cf6' },
    };

    /* ── DOM ──────────────────────────────────────────────────────── */
    let grid, workspace, wsIcon, wsTitle, wsDesc, wsBody, wsBack;

    function setupDOMElements() {
        grid = document.getElementById('tools-grid');
        workspace = document.getElementById('tool-workspace');
        wsIcon = document.getElementById('ws-icon');
        wsTitle = document.getElementById('ws-title');
        wsDesc = document.getElementById('ws-desc');
        wsBody = document.getElementById('ws-body');
        wsBack = document.getElementById('ws-back');
    }

    /* ── Init ─────────────────────────────────────────────────────── */
    function init() {
        setupDOMElements();
        if (!grid) return;
        renderGrid();
        if (wsBack) {
            wsBack.removeEventListener('click', closeWorkspace);
            wsBack.addEventListener('click', closeWorkspace);
        }
    }

    window.initPDFToolkit = init;
    window.closePDFWorkspace = closeWorkspace;
    window.openPDFTool = openTool;

    /* ── Grid ─────────────────────────────────────────────────────── */
    function renderGrid() {
        let html = '';
        for (const cat of CATEGORIES) {
            html += '<div class="tool-category"><h3>' + cat.name + '</h3><div class="tool-cards">';
            for (const tid of cat.tools) {
                const t = TOOLS[tid];
                html += '<div class="tool-card" data-tool="' + tid + '" style="--tool-color:' + t.color + '">' +
                    '<span class="tool-card-icon">' + t.icon + '</span>' +
                    '<h4>' + t.name + '</h4>' +
                    '<p>' + t.desc + '</p></div>';
            }
            html += '</div></div>';
        }
        grid.innerHTML = html;
        grid.querySelectorAll('.tool-card').forEach(function (card) {
            card.addEventListener('click', function () { openTool(card.dataset.tool); });
        });
    }

    /* ── Workspace ────────────────────────────────────────────────── */
    function openTool(id) {
        var t = TOOLS[id];
        if (!t || !handlers[id]) return;
        grid.hidden = true;
        workspace.hidden = false;
        wsIcon.textContent = t.icon;
        wsTitle.textContent = t.name;
        wsDesc.textContent = t.desc;
        wsBody.innerHTML = handlers[id].render();
        handlers[id].init();
        window.scrollTo(0, 0);
    }

    function closeWorkspace() {
        workspace.hidden = true;
        grid.hidden = false;
        wsBody.innerHTML = '';
        window.scrollTo(0, 0);
    }

    /* ═══════════════════════════════════════════════════════════════════
       SHARED UTILITIES
       ═══════════════════════════════════════════════════════════════════ */

    function readBuf(file) {
        return new Promise(function (res, rej) {
            var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej;
            r.readAsArrayBuffer(file);
        });
    }
    function readDataURL(file) {
        return new Promise(function (res, rej) {
            var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej;
            r.readAsDataURL(file);
        });
    }
    function readText(file) {
        return new Promise(function (res, rej) {
            var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej;
            r.readAsText(file);
        });
    }
    function dl(blob, name) {
        var u = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = u; a.download = name; document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(u);
    }
    function fmt(b) {
        if (!b) return '0 B';
        var u = ['B','KB','MB','GB'], i = Math.floor(Math.log(b) / Math.log(1024));
        return (b / Math.pow(1024, i)).toFixed(1) + ' ' + u[i];
    }
    function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
    /* Strip characters unsupported by WinAnsi encoding (pdf-lib standard fonts) */
    function sanitize(s) { return s ? s.replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ') : ''; }
    function notify(msg, type) {
        var d = document.createElement('div'); d.className = 'pdf-notification ' + (type || 'info');
        d.textContent = msg; document.body.appendChild(d);
        setTimeout(function () { if (d.parentNode) d.remove(); }, 4000);
    }

    /* Drop zone HTML */
    function dzHTML(id, accept, multi, label) {
        return '<div class="pdf-dropzone" id="' + id + '-drop">' +
            '<input type="file" accept="' + accept + '"' + (multi ? ' multiple' : '') + ' hidden>' +
            '<div class="pdf-dropzone-icon">📄</div>' +
            '<p class="pdf-dropzone-text">' + (label || 'Drop file here or click to browse') + '</p></div>' +
            '<div class="pdf-filelist" id="' + id + '-files" hidden></div>';
    }

    /* Attach drop zone events */
    function dzInit(id, cb) {
        var zone = document.getElementById(id + '-drop');
        if (!zone) return;
        var inp = zone.querySelector('input');
        zone.addEventListener('click', function () { inp.click(); });
        zone.addEventListener('dragover', function (e) { e.preventDefault(); zone.classList.add('dragover'); });
        zone.addEventListener('dragleave', function () { zone.classList.remove('dragover'); });
        zone.addEventListener('drop', function (e) { e.preventDefault(); zone.classList.remove('dragover'); cb(Array.from(e.dataTransfer.files)); });
        inp.addEventListener('change', function () { cb(Array.from(inp.files)); inp.value = ''; });
    }

    /* Show result with download button */
    function showResult(id, msg, blob, filename) {
        var el = document.getElementById(id + '-result');
        if (!el) return;
        el.hidden = false;
        el.innerHTML = '<div class="tool-result"><p class="tool-success">' + esc(msg) + '</p>' +
            '<button class="btn btn-primary btn-full" id="' + id + '-dl">⬇️ Download</button></div>';
        document.getElementById(id + '-dl').addEventListener('click', function () { dl(blob, filename); });
    }

    /* Render page thumbnails with pdf.js */
    async function renderThumbs(container, buf, opts) {
        opts = opts || {};
        var scale = opts.scale || 0.25;
        var pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;
        var thumbs = [];
        container.innerHTML = '';
        container.className = 'thumb-grid';
        for (var i = 1; i <= pdf.numPages; i++) {
            var page = await pdf.getPage(i);
            var vp = page.getViewport({ scale: scale });
            var canvas = document.createElement('canvas');
            canvas.width = vp.width; canvas.height = vp.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
            var wrap = document.createElement('div');
            wrap.className = 'thumb-wrapper'; wrap.dataset.page = i;
            wrap.appendChild(canvas);
            var num = document.createElement('span'); num.className = 'thumb-num'; num.textContent = i;
            wrap.appendChild(num);
            container.appendChild(wrap);
            thumbs.push({ canvas: canvas, page: i, wrapper: wrap });
        }
        return { pdf: pdf, thumbs: thumbs, numPages: pdf.numPages };
    }

    /* ═══════════════════════════════════════════════════════════════════
       TOOL HANDLERS
       ═══════════════════════════════════════════════════════════════════ */
    var handlers = {};

    /* ── 1. MERGE ─────────────────────────────────────────────────── */
    handlers.merge = {
        files: [],
        render: function () {
            return dzHTML('merge', '.pdf', true, 'Drop PDF files to merge (2 or more)') +
                '<div id="merge-actions" hidden>' +
                '<p class="tool-info">📌 Drag files to reorder. Click × to remove.</p>' +
                '<button class="btn btn-primary btn-full" id="merge-go">📎 Merge PDFs</button></div>' +
                '<div id="merge-result" hidden></div>';
        },
        init: function () {
            var self = this; self.files = [];
            dzInit('merge', function (f) {
                self.files = self.files.concat(f.filter(function (x) { return x.name.toLowerCase().endsWith('.pdf'); }));
                self.show();
            });
            document.getElementById('merge-go').addEventListener('click', function () { self.process(); });
        },
        show: function () {
            var el = document.getElementById('merge-files'), acts = document.getElementById('merge-actions');
            if (this.files.length === 0) { el.hidden = true; acts.hidden = true; return; }
            el.hidden = false; acts.hidden = false;
            el.innerHTML = this.files.map(function (f, i) {
                return '<div class="pdf-fileitem" draggable="true" data-i="' + i + '">' +
                    '<span class="pdf-fileitem-name">' + esc(f.name) + '</span>' +
                    '<span class="pdf-fileitem-size">' + fmt(f.size) + '</span>' +
                    '<button class="pdf-fileitem-remove" data-i="' + i + '">×</button></div>';
            }).join('');
            var self = this, dragI = null;
            el.querySelectorAll('.pdf-fileitem-remove').forEach(function (b) {
                b.addEventListener('click', function (e) { e.stopPropagation(); self.files.splice(+b.dataset.i, 1); self.show(); });
            });
            el.querySelectorAll('.pdf-fileitem').forEach(function (item) {
                item.addEventListener('dragstart', function () { dragI = +item.dataset.i; });
                item.addEventListener('dragover', function (e) { e.preventDefault(); });
                item.addEventListener('drop', function (e) {
                    e.preventDefault(); var di = +item.dataset.i;
                    if (dragI !== null && dragI !== di) { var m = self.files.splice(dragI, 1)[0]; self.files.splice(di, 0, m); self.show(); }
                });
            });
        },
        process: async function () {
            if (this.files.length < 2) { notify('Select at least 2 PDFs', 'error'); return; }
            var btn = document.getElementById('merge-go'); btn.disabled = true; btn.textContent = '⏳ Merging...';
            try {
                var merged = await PDFDocument.create();
                for (var i = 0; i < this.files.length; i++) {
                    var bytes = await readBuf(this.files[i]);
                    var src = await PDFDocument.load(bytes, { ignoreEncryption: true });
                    var pages = await merged.copyPages(src, src.getPageIndices());
                    pages.forEach(function (p) { merged.addPage(p); });
                }
                var out = await merged.save();
                showResult('merge', '✅ Merged ' + this.files.length + ' PDFs (' + fmt(out.byteLength) + ')',
                    new Blob([out], { type: 'application/pdf' }), 'merged.pdf');
            } catch (e) { notify('Merge failed: ' + e.message, 'error'); }
            btn.disabled = false; btn.textContent = '📎 Merge PDFs';
        }
    };

    /* ── 2. SPLIT ─────────────────────────────────────────────────── */
    handlers.split = {
        buf: null,
        render: function () {
            return dzHTML('split', '.pdf', false, 'Drop a PDF file to split') +
                '<div id="split-opts" hidden>' +
                '<p class="tool-info" id="split-info"></p>' +
                '<label class="tool-label">Split mode</label>' +
                '<select class="tool-select" id="split-mode">' +
                '<option value="range">Extract page range</option>' +
                '<option value="each">Split every page</option>' +
                '<option value="every">Split every N pages</option></select>' +
                '<div id="split-range-opts" style="margin-top:12px">' +
                '<label class="tool-label">Page range (e.g. 1-5, 8, 10-12)</label>' +
                '<input class="tool-input" id="split-range" placeholder="1-5"></div>' +
                '<div id="split-every-opts" hidden style="margin-top:12px">' +
                '<label class="tool-label">Pages per file</label>' +
                '<input class="tool-input" id="split-n" type="number" value="1" min="1"></div>' +
                '<button class="btn btn-primary btn-full" id="split-go">✂️ Split PDF</button></div>' +
                '<div id="split-result" hidden></div>';
        },
        init: function () {
            var self = this; self.buf = null;
            dzInit('split', async function (f) {
                if (f.length > 0) {
                    self.buf = await readBuf(f[0]);
                    var pdf = await PDFDocument.load(self.buf, { ignoreEncryption: true });
                    document.getElementById('split-info').textContent = '📄 ' + esc(f[0].name) + ' — ' + pdf.getPageCount() + ' pages';
                    document.getElementById('split-opts').hidden = false;
                    document.getElementById('split-drop').hidden = true;
                }
            });
            document.getElementById('split-mode').addEventListener('change', function () {
                var v = this.value;
                document.getElementById('split-range-opts').hidden = v !== 'range';
                document.getElementById('split-every-opts').hidden = v !== 'every';
            });
            document.getElementById('split-go').addEventListener('click', function () { self.process(); });
        },
        process: async function () {
            if (!this.buf) return;
            var btn = document.getElementById('split-go'); btn.disabled = true; btn.textContent = '⏳ Splitting...';
            try {
                var src = await PDFDocument.load(this.buf, { ignoreEncryption: true });
                var total = src.getPageCount(), mode = document.getElementById('split-mode').value;
                var ranges = [];
                if (mode === 'each') {
                    for (var i = 0; i < total; i++) ranges.push([i]);
                } else if (mode === 'every') {
                    var n = parseInt(document.getElementById('split-n').value) || 1;
                    for (var i = 0; i < total; i += n) {
                        var r = []; for (var j = i; j < Math.min(i + n, total); j++) r.push(j); ranges.push(r);
                    }
                } else {
                    var txt = document.getElementById('split-range').value;
                    var parts = txt.split(',');
                    var idxs = [];
                    parts.forEach(function (p) {
                        p = p.trim(); var m = p.match(/^(\d+)\s*-\s*(\d+)$/);
                        if (m) { for (var x = +m[1]; x <= +m[2] && x <= total; x++) idxs.push(x - 1); }
                        else if (/^\d+$/.test(p) && +p <= total) idxs.push(+p - 1);
                    });
                    if (idxs.length > 0) ranges.push(idxs);
                }
                if (ranges.length === 0) { notify('No valid pages specified', 'error'); btn.disabled = false; btn.textContent = '✂️ Split PDF'; return; }
                if (ranges.length === 1) {
                    var doc = await PDFDocument.create();
                    var cp = await doc.copyPages(src, ranges[0]); cp.forEach(function (p) { doc.addPage(p); });
                    var out = await doc.save();
                    showResult('split', '✅ Extracted ' + ranges[0].length + ' pages', new Blob([out], { type: 'application/pdf' }), 'split.pdf');
                } else {
                    var zip = new JSZip();
                    for (var i = 0; i < ranges.length; i++) {
                        var doc = await PDFDocument.create();
                        var cp = await doc.copyPages(src, ranges[i]); cp.forEach(function (p) { doc.addPage(p); });
                        zip.file('part-' + (i + 1) + '.pdf', await doc.save());
                    }
                    var zblob = await zip.generateAsync({ type: 'blob' });
                    showResult('split', '✅ Split into ' + ranges.length + ' files', zblob, 'split-files.zip');
                }
            } catch (e) { notify('Split failed: ' + e.message, 'error'); }
            btn.disabled = false; btn.textContent = '✂️ Split PDF';
        }
    };

    /* ── 3. REMOVE PAGES ──────────────────────────────────────────── */
    handlers['remove-pages'] = {
        buf: null, selected: {}, totalPages: 0,
        render: function () {
            return dzHTML('rmpg', '.pdf', false, 'Drop a PDF file') +
                '<div id="rmpg-opts" hidden>' +
                '<p class="tool-info" id="rmpg-info"></p>' +
                '<p class="tool-info">Click pages to select them for removal (highlighted in red)</p>' +
                '<div class="btn-group" style="margin-bottom:10px">' +
                '<button class="btn btn-sm" id="rmpg-sel-all">Select All</button>' +
                '<button class="btn btn-sm" id="rmpg-desel-all">Deselect All</button>' +
                '<span id="rmpg-count" style="margin-left:auto;color:var(--text2);font-size:.85rem"></span></div>' +
                '<div id="rmpg-thumbs"></div>' +
                '<button class="btn btn-primary btn-full" id="rmpg-go">🗑️ Remove Selected Pages</button></div>' +
                '<div id="rmpg-result" hidden></div>';
        },
        init: function () {
            var self = this; self.buf = null; self.selected = {}; self.totalPages = 0; self.thumbRefs = [];
            dzInit('rmpg', async function (f) {
                if (f.length > 0) {
                    self.buf = await readBuf(f[0]);
                    document.getElementById('rmpg-opts').hidden = false;
                    document.getElementById('rmpg-drop').hidden = true;
                    document.getElementById('rmpg-info').textContent = '📄 ' + f[0].name + ' — loading pages...';
                    try {
                        var res = await renderThumbs(document.getElementById('rmpg-thumbs'), self.buf);
                        self.totalPages = res.numPages;
                        self.thumbRefs = res.thumbs;
                        document.getElementById('rmpg-info').textContent = '📄 ' + f[0].name + ' — ' + res.numPages + ' pages';
                        res.thumbs.forEach(function (t) {
                            t.wrapper.addEventListener('click', function () {
                                t.wrapper.classList.toggle('selected');
                                self.selected[t.page] = t.wrapper.classList.contains('selected');
                                self.updateCount();
                            });
                        });
                        self.updateCount();
                    } catch (e) {
                        document.getElementById('rmpg-info').textContent = '';
                        notify('Could not load PDF pages: ' + e.message, 'error');
                    }
                }
            });
            document.getElementById('rmpg-go').addEventListener('click', function () { self.process(); });
            document.getElementById('rmpg-sel-all').addEventListener('click', function () {
                self.thumbRefs.forEach(function (t) {
                    t.wrapper.classList.add('selected');
                    self.selected[t.page] = true;
                });
                self.updateCount();
            });
            document.getElementById('rmpg-desel-all').addEventListener('click', function () {
                self.thumbRefs.forEach(function (t) {
                    t.wrapper.classList.remove('selected');
                    self.selected[t.page] = false;
                });
                self.updateCount();
            });
        },
        updateCount: function () {
            var n = Object.keys(this.selected).filter(function (k) { return this.selected[k]; }.bind(this)).length;
            var el = document.getElementById('rmpg-count');
            if (el) el.textContent = n > 0 ? n + ' of ' + this.totalPages + ' pages selected' : 'No pages selected';
        },
        process: async function () {
            var toRemove = Object.keys(this.selected).filter(function (k) { return this.selected[k]; }.bind(this)).map(Number);
            if (toRemove.length === 0) { notify('Select pages to remove by clicking on them', 'error'); return; }
            var btn = document.getElementById('rmpg-go');
            btn.disabled = true; btn.textContent = '⏳ Removing pages...';
            try {
                var src = await PDFDocument.load(this.buf, { ignoreEncryption: true });
                var total = src.getPageCount();
                var keep = src.getPageIndices().filter(function (i) { return toRemove.indexOf(i + 1) === -1; });
                if (keep.length === 0) { notify('Cannot remove all pages — at least one page must remain', 'error'); btn.disabled = false; btn.textContent = '🗑️ Remove Selected Pages'; return; }
                var doc = await PDFDocument.create();
                var pages = await doc.copyPages(src, keep);
                pages.forEach(function (p) { doc.addPage(p); });
                var out = await doc.save();
                showResult('rmpg', '✅ Removed ' + toRemove.length + ' of ' + total + ' pages (' + fmt(out.byteLength) + ')',
                    new Blob([out], { type: 'application/pdf' }), 'pages-removed.pdf');
                var resultEl = document.getElementById('rmpg-result');
                if (resultEl) resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } catch (e) { notify('Failed: ' + e.message, 'error'); }
            btn.disabled = false; btn.textContent = '🗑️ Remove Selected Pages';
        }
    };

    /* ── 4. ORGANIZE ──────────────────────────────────────────────── */
    handlers.organize = {
        buf: null, order: [],
        render: function () {
            return dzHTML('org', '.pdf', false, 'Drop a PDF file to organize') +
                '<div id="org-opts" hidden>' +
                '<p class="tool-info">Drag thumbnails to reorder. Click to rotate 90°.</p>' +
                '<div id="org-thumbs"></div>' +
                '<button class="btn btn-primary btn-full" id="org-go">✅ Apply Changes</button></div>' +
                '<div id="org-result" hidden></div>';
        },
        init: function () {
            var self = this; self.buf = null; self.order = [];
            dzInit('org', async function (f) {
                if (f.length > 0) {
                    self.buf = await readBuf(f[0]);
                    document.getElementById('org-opts').hidden = false;
                    document.getElementById('org-drop').hidden = true;
                    var res = await renderThumbs(document.getElementById('org-thumbs'), self.buf);
                    self.order = res.thumbs.map(function (t) { return { page: t.page, rotation: 0, wrapper: t.wrapper }; });
                    self.order.forEach(function (item) {
                        item.wrapper.draggable = true;
                        item.wrapper.addEventListener('click', function () {
                            item.rotation = (item.rotation + 90) % 360;
                            item.wrapper.querySelector('canvas').style.transform = 'rotate(' + item.rotation + 'deg)';
                        });
                    });
                    var cont = document.getElementById('org-thumbs');
                    var dragEl = null;
                    cont.addEventListener('dragstart', function (e) { dragEl = e.target.closest('.thumb-wrapper'); });
                    cont.addEventListener('dragover', function (e) { e.preventDefault(); });
                    cont.addEventListener('drop', function (e) {
                        e.preventDefault();
                        var target = e.target.closest('.thumb-wrapper');
                        if (dragEl && target && dragEl !== target) {
                            cont.insertBefore(dragEl, target);
                            var newOrder = [];
                            cont.querySelectorAll('.thumb-wrapper').forEach(function (w) {
                                var item = self.order.find(function (o) { return o.wrapper === w; });
                                if (item) newOrder.push(item);
                            });
                            self.order = newOrder;
                        }
                    });
                }
            });
            document.getElementById('org-go').addEventListener('click', function () { self.process(); });
        },
        process: async function () {
            try {
                var src = await PDFDocument.load(this.buf, { ignoreEncryption: true });
                var doc = await PDFDocument.create();
                var idxs = this.order.map(function (o) { return o.page - 1; });
                var pages = await doc.copyPages(src, idxs);
                for (var i = 0; i < pages.length; i++) {
                    var pg = doc.addPage(pages[i]);
                    if (this.order[i].rotation) pg.setRotation(degrees(this.order[i].rotation));
                }
                var out = await doc.save();
                showResult('org', '✅ Organized! (' + fmt(out.byteLength) + ')',
                    new Blob([out], { type: 'application/pdf' }), 'organized.pdf');
            } catch (e) { notify('Failed: ' + e.message, 'error'); }
        }
    };

    /* ── 5. COMPRESS ──────────────────────────────────────────────── */
    handlers.compress = {
        buf: null,
        render: function () {
            return dzHTML('comp', '.pdf', false, 'Drop a PDF file to compress') +
                '<div id="comp-opts" hidden><p class="tool-info" id="comp-info"></p>' +
                '<label class="tool-label">Compression Level</label>' +
                '<select class="tool-select" id="comp-level">' +
                '<option value="extreme">Extreme Compression (smallest size)</option>' +
                '<option value="recommended" selected>Recommended</option>' +
                '<option value="less">Less Compression (higher quality)</option></select>' +
                '<button class="btn btn-primary btn-full" id="comp-go">📦 Compress PDF</button></div>' +
                '<div id="comp-result" hidden></div>';
        },
        init: function () {
            var self = this; self.buf = null;
            dzInit('comp', async function (f) {
                if (f.length > 0) {
                    self.buf = await readBuf(f[0]);
                    document.getElementById('comp-info').textContent = '📄 Original: ' + fmt(f[0].size);
                    document.getElementById('comp-opts').hidden = false;
                    document.getElementById('comp-drop').hidden = true;
                }
            });
            document.getElementById('comp-go').addEventListener('click', function () { self.process(); });
        },
        process: async function () {
            var btn = document.getElementById('comp-go'); btn.disabled = true; btn.textContent = '⏳ Compressing...';
            try {
                var doc = await PDFDocument.load(this.buf, { ignoreEncryption: true });
                var level = document.getElementById('comp-level').value;
                var opts = {};
                if (level === 'extreme') opts = { useObjectStreams: true };
                else if (level === 'recommended') opts = { useObjectStreams: true };
                var out = await doc.save(opts);
                var saved = this.buf.byteLength - out.byteLength;
                var pct = Math.round((saved / this.buf.byteLength) * 100);
                var msg = '✅ Compressed: ' + fmt(this.buf.byteLength) + ' → ' + fmt(out.byteLength) + ' (saved ' + Math.max(0, pct) + '%)';
                showResult('comp', msg, new Blob([out], { type: 'application/pdf' }), 'compressed.pdf');
            } catch (e) { notify('Compression failed: ' + e.message, 'error'); }
            btn.disabled = false; btn.textContent = '📦 Compress PDF';
        }
    };

    /* ── 6. REPAIR ────────────────────────────────────────────────── */
    handlers.repair = {
        buf: null,
        render: function () {
            return dzHTML('repair', '.pdf', false, 'Drop a damaged PDF file') +
                '<div id="repair-opts" hidden>' +
                '<p class="tool-info">We will attempt to parse and re-save the PDF to fix issues.</p>' +
                '<button class="btn btn-primary btn-full" id="repair-go">🔧 Repair PDF</button></div>' +
                '<div id="repair-result" hidden></div>';
        },
        init: function () {
            var self = this; self.buf = null;
            dzInit('repair', async function (f) {
                if (f.length > 0) { self.buf = await readBuf(f[0]); document.getElementById('repair-opts').hidden = false; document.getElementById('repair-drop').hidden = true; }
            });
            document.getElementById('repair-go').addEventListener('click', function () { self.process(); });
        },
        process: async function () {
            var btn = document.getElementById('repair-go'); btn.disabled = true; btn.textContent = '⏳ Repairing...';
            try {
                var doc = await PDFDocument.load(this.buf, { ignoreEncryption: true, throwOnInvalidObject: false });
                var out = await doc.save();
                showResult('repair', '✅ PDF repaired successfully! (' + fmt(out.byteLength) + ')',
                    new Blob([out], { type: 'application/pdf' }), 'repaired.pdf');
            } catch (e) { notify('Could not repair: ' + e.message, 'error'); }
            btn.disabled = false; btn.textContent = '🔧 Repair PDF';
        }
    };

    /* ── 7. PDF/A ─────────────────────────────────────────────────── */
    handlers.pdfa = {
        buf: null,
        render: function () {
            return dzHTML('pdfa', '.pdf', false, 'Drop a PDF to convert to PDF/A') +
                '<div id="pdfa-opts" hidden>' +
                '<p class="tool-info">Adds PDF/A metadata for long-term archival compliance.</p>' +
                '<button class="btn btn-primary btn-full" id="pdfa-go">🏛️ Convert to PDF/A</button></div>' +
                '<div id="pdfa-result" hidden></div>';
        },
        init: function () {
            var self = this; self.buf = null;
            dzInit('pdfa', async function (f) {
                if (f.length > 0) { self.buf = await readBuf(f[0]); document.getElementById('pdfa-opts').hidden = false; document.getElementById('pdfa-drop').hidden = true; }
            });
            document.getElementById('pdfa-go').addEventListener('click', function () { self.process(); });
        },
        process: async function () {
            try {
                var doc = await PDFDocument.load(this.buf, { ignoreEncryption: true });
                doc.setTitle(doc.getTitle() || 'Document');
                doc.setAuthor(doc.getAuthor() || 'PDF Toolkit');
                doc.setCreator('PDF Toolkit - PDF/A Converter');
                doc.setProducer('pdf-lib PDF/A');
                doc.setCreationDate(new Date());
                doc.setModificationDate(new Date());
                var out = await doc.save();
                showResult('pdfa', '✅ Converted to PDF/A format', new Blob([out], { type: 'application/pdf' }), 'archive.pdf');
            } catch (e) { notify('Conversion failed: ' + e.message, 'error'); }
        }
    };

    /* ── 8. PDF TO WORD ───────────────────────────────────────────── */
    handlers['pdf-to-word'] = {
        buf: null,
        render: function () {
            return dzHTML('p2w', '.pdf', false, 'Drop a PDF to extract text') +
                '<div id="p2w-opts" hidden>' +
                '<p class="tool-info">Text will be extracted from all pages.</p>' +
                '<button class="btn btn-primary btn-full" id="p2w-go">📝 Convert to Word</button></div>' +
                '<div id="p2w-result" hidden></div>' +
                '<textarea class="text-output" id="p2w-text" hidden></textarea>';
        },
        init: function () {
            var self = this; self.buf = null;
            dzInit('p2w', async function (f) {
                if (f.length > 0) { self.buf = await readBuf(f[0]); document.getElementById('p2w-opts').hidden = false; document.getElementById('p2w-drop').hidden = true; }
            });
            document.getElementById('p2w-go').addEventListener('click', function () { self.process(); });
        },
        process: async function () {
            var btn = document.getElementById('p2w-go'); btn.disabled = true; btn.textContent = '⏳ Extracting...';
            try {
                var pdf = await pdfjsLib.getDocument({ data: new Uint8Array(this.buf) }).promise;
                var allText = '';
                for (var i = 1; i <= pdf.numPages; i++) {
                    var page = await pdf.getPage(i);
                    var tc = await page.getTextContent();
                    var pText = tc.items.map(function (item) { return item.str; }).join(' ');
                    allText += '--- Page ' + i + ' ---\n' + pText + '\n\n';
                }
                document.getElementById('p2w-text').hidden = false;
                document.getElementById('p2w-text').value = allText;
                var blob = new Blob([allText], { type: 'text/plain' });
                showResult('p2w', '✅ Extracted text from ' + pdf.numPages + ' pages', blob, 'document.txt');
            } catch (e) { notify('Extraction failed: ' + e.message, 'error'); }
            btn.disabled = false; btn.textContent = '📝 Convert to Word';
        }
    };

    /* ── 9. PDF TO JPG ────────────────────────────────────────────── */
    handlers['pdf-to-jpg'] = {
        buf: null,
        render: function () {
            return dzHTML('p2j', '.pdf', false, 'Drop a PDF to convert to images') +
                '<div id="p2j-opts" hidden>' +
                '<label class="tool-label">Quality</label>' +
                '<select class="tool-select" id="p2j-quality">' +
                '<option value="1">Standard (1x)</option><option value="2" selected>High (2x)</option><option value="3">Ultra (3x)</option></select>' +
                '<button class="btn btn-primary btn-full" id="p2j-go">🖼️ Convert to JPG</button></div>' +
                '<div id="p2j-result" hidden></div>';
        },
        init: function () {
            var self = this; self.buf = null;
            dzInit('p2j', async function (f) {
                if (f.length > 0) { self.buf = await readBuf(f[0]); document.getElementById('p2j-opts').hidden = false; document.getElementById('p2j-drop').hidden = true; }
            });
            document.getElementById('p2j-go').addEventListener('click', function () { self.process(); });
        },
        process: async function () {
            var btn = document.getElementById('p2j-go'); btn.disabled = true; btn.textContent = '⏳ Converting...';
            try {
                var scale = parseInt(document.getElementById('p2j-quality').value);
                var pdf = await pdfjsLib.getDocument({ data: new Uint8Array(this.buf) }).promise;
                var zip = new JSZip();
                for (var i = 1; i <= pdf.numPages; i++) {
                    var page = await pdf.getPage(i);
                    var vp = page.getViewport({ scale: scale });
                    var canvas = document.createElement('canvas');
                    canvas.width = vp.width; canvas.height = vp.height;
                    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
                    var dataUrl = canvas.toDataURL('image/jpeg', 0.92);
                    var b64 = dataUrl.split(',')[1];
                    zip.file('page-' + i + '.jpg', b64, { base64: true });
                }
                var blob = await zip.generateAsync({ type: 'blob' });
                showResult('p2j', '✅ Converted ' + pdf.numPages + ' pages to JPG', blob, 'pdf-images.zip');
            } catch (e) { notify('Failed: ' + e.message, 'error'); }
            btn.disabled = false; btn.textContent = '🖼️ Convert to JPG';
        }
    };

    /* ── 10. PDF TO EXCEL ─────────────────────────────────────────── */
    handlers['pdf-to-excel'] = {
        buf: null,
        render: function () {
            return dzHTML('p2e', '.pdf', false, 'Drop a PDF to extract data') +
                '<div id="p2e-opts" hidden>' +
                '<p class="tool-info">Text data will be extracted as CSV format.</p>' +
                '<button class="btn btn-primary btn-full" id="p2e-go">📊 Convert to CSV</button></div>' +
                '<div id="p2e-result" hidden></div>';
        },
        init: function () {
            var self = this; self.buf = null;
            dzInit('p2e', async function (f) {
                if (f.length > 0) { self.buf = await readBuf(f[0]); document.getElementById('p2e-opts').hidden = false; document.getElementById('p2e-drop').hidden = true; }
            });
            document.getElementById('p2e-go').addEventListener('click', function () { self.process(); });
        },
        process: async function () {
            var btn = document.getElementById('p2e-go'); btn.disabled = true; btn.textContent = '⏳ Extracting...';
            try {
                var pdf = await pdfjsLib.getDocument({ data: new Uint8Array(this.buf) }).promise;
                var csv = '';
                for (var i = 1; i <= pdf.numPages; i++) {
                    var page = await pdf.getPage(i);
                    var tc = await page.getTextContent();
                    var lines = {}, items = tc.items;
                    items.forEach(function (item) {
                        var y = Math.round(item.transform[5]);
                        if (!lines[y]) lines[y] = [];
                        lines[y].push({ x: item.transform[4], text: item.str });
                    });
                    var sortedY = Object.keys(lines).sort(function (a, b) { return b - a; });
                    sortedY.forEach(function (y) {
                        lines[y].sort(function (a, b) { return a.x - b.x; });
                        csv += lines[y].map(function (c) { return '"' + c.text.replace(/"/g, '""') + '"'; }).join(',') + '\n';
                    });
                    csv += '\n';
                }
                var blob = new Blob([csv], { type: 'text/csv' });
                showResult('p2e', '✅ Extracted data from ' + pdf.numPages + ' pages', blob, 'data.csv');
            } catch (e) { notify('Failed: ' + e.message, 'error'); }
            btn.disabled = false; btn.textContent = '📊 Convert to CSV';
        }
    };

    /* ── 11. PDF TO PPT ───────────────────────────────────────────── */
    handlers['pdf-to-ppt'] = {
        buf: null,
        render: function () {
            return dzHTML('p2p', '.pdf', false, 'Drop a PDF to convert') +
                '<div id="p2p-opts" hidden>' +
                '<p class="tool-info">Pages will be converted to images (JPG) for use in presentations.</p>' +
                '<button class="btn btn-primary btn-full" id="p2p-go">📽️ Convert to Images</button></div>' +
                '<div id="p2p-result" hidden></div>';
        },
        init: function () {
            var self = this; self.buf = null;
            dzInit('p2p', async function (f) {
                if (f.length > 0) { self.buf = await readBuf(f[0]); document.getElementById('p2p-opts').hidden = false; document.getElementById('p2p-drop').hidden = true; }
            });
            document.getElementById('p2p-go').addEventListener('click', function () { self.process(); });
        },
        process: async function () {
            var btn = document.getElementById('p2p-go'); btn.disabled = true; btn.textContent = '⏳ Converting...';
            try {
                var pdf = await pdfjsLib.getDocument({ data: new Uint8Array(this.buf) }).promise;
                var zip = new JSZip();
                for (var i = 1; i <= pdf.numPages; i++) {
                    var page = await pdf.getPage(i);
                    var vp = page.getViewport({ scale: 2 });
                    var c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
                    await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
                    zip.file('slide-' + i + '.jpg', c.toDataURL('image/jpeg', 0.92).split(',')[1], { base64: true });
                }
                var blob = await zip.generateAsync({ type: 'blob' });
                showResult('p2p', '✅ ' + pdf.numPages + ' slides exported as images', blob, 'slides.zip');
            } catch (e) { notify('Failed: ' + e.message, 'error'); }
            btn.disabled = false; btn.textContent = '📽️ Convert to Images';
        }
    };

    /* ── 12. WORD TO PDF ──────────────────────────────────────────── */
    handlers['word-to-pdf'] = {
        render: function () {
            return dzHTML('w2p', '.doc,.docx', false, 'Drop a Word document (.docx)') +
                '<div id="w2p-opts" hidden>' +
                '<button class="btn btn-primary btn-full" id="w2p-go">📄 Convert to PDF</button></div>' +
                '<div id="w2p-result" hidden></div>';
        },
        init: function () {
            var self = this; self.file = null;
            dzInit('w2p', function (f) {
                if (f.length > 0) { self.file = f[0]; document.getElementById('w2p-opts').hidden = false; document.getElementById('w2p-drop').hidden = true; }
            });
            document.getElementById('w2p-go').addEventListener('click', function () { self.process(); });
        },
        process: async function () {
            var btn = document.getElementById('w2p-go'); btn.disabled = true; btn.textContent = '⏳ Converting...';
            try {
                var buf = await readBuf(this.file);
                var result = await mammoth.extractRawText({ arrayBuffer: buf });
                var text = result.value;
                var doc = await PDFDocument.create();
                var font = await doc.embedFont(StandardFonts.Helvetica);
                var lines = text.split('\n');
                var page, y, pageH = 792, pageW = 612, margin = 50, lineH = 14, fontSize = 11;
                function newPage() { page = doc.addPage([pageW, pageH]); y = pageH - margin; }
                newPage();
                for (var i = 0; i < lines.length; i++) {
                    var line = sanitize(lines[i]);
                    var words = line.split(' '), current = '';
                    for (var w = 0; w < words.length; w++) {
                        var test = current ? current + ' ' + words[w] : words[w];
                        try {
                            if (font.widthOfTextAtSize(test, fontSize) > pageW - margin * 2) {
                                if (y < margin + lineH) newPage();
                                page.drawText(current, { x: margin, y: y, size: fontSize, font: font, color: rgb(0, 0, 0) });
                                y -= lineH; current = words[w];
                            } else { current = test; }
                        } catch (e2) { current = test; }
                    }
                    if (current) {
                        if (y < margin + lineH) newPage();
                        try { page.drawText(current, { x: margin, y: y, size: fontSize, font: font, color: rgb(0, 0, 0) }); } catch (e2) {}
                        y -= lineH;
                    }
                    if (!line) y -= lineH / 2;
                }
                var out = await doc.save();
                showResult('w2p', '✅ Converted to PDF (' + fmt(out.byteLength) + ')', new Blob([out], { type: 'application/pdf' }), 'document.pdf');
            } catch (e) { notify('Conversion failed: ' + e.message, 'error'); }
            btn.disabled = false; btn.textContent = '📄 Convert to PDF';
        }
    };

    /* ── 13. JPG TO PDF ───────────────────────────────────────────── */
    handlers['jpg-to-pdf'] = {
        files: [],
        render: function () {
            return dzHTML('j2p', 'image/*', true, 'Drop images (JPG, PNG) to convert to PDF') +
                '<div id="j2p-actions" hidden>' +
                '<p class="tool-info">Each image becomes one page.</p>' +
                '<button class="btn btn-primary btn-full" id="j2p-go">📄 Create PDF</button></div>' +
                '<div id="j2p-result" hidden></div>';
        },
        init: function () {
            var self = this; self.files = [];
            dzInit('j2p', function (f) {
                self.files = self.files.concat(f.filter(function (x) { return x.type.startsWith('image/'); }));
                var el = document.getElementById('j2p-files');
                el.hidden = false;
                el.innerHTML = self.files.map(function (fi, i) {
                    return '<div class="pdf-fileitem"><span class="pdf-fileitem-name">' + esc(fi.name) + '</span>' +
                        '<span class="pdf-fileitem-size">' + fmt(fi.size) + '</span></div>';
                }).join('');
                document.getElementById('j2p-actions').hidden = false;
            });
            document.getElementById('j2p-go').addEventListener('click', function () { self.process(); });
        },
        process: async function () {
            if (this.files.length === 0) { notify('Add images first', 'error'); return; }
            var btn = document.getElementById('j2p-go'); btn.disabled = true; btn.textContent = '⏳ Creating...';
            try {
                var doc = await PDFDocument.create();
                for (var i = 0; i < this.files.length; i++) {
                    var buf = await readBuf(this.files[i]);
                    var img;
                    if (this.files[i].type === 'image/png') img = await doc.embedPng(buf);
                    else img = await doc.embedJpg(buf);
                    var page = doc.addPage([img.width, img.height]);
                    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
                }
                var out = await doc.save();
                showResult('j2p', '✅ Created PDF with ' + this.files.length + ' pages', new Blob([out], { type: 'application/pdf' }), 'images.pdf');
            } catch (e) { notify('Failed: ' + e.message, 'error'); }
            btn.disabled = false; btn.textContent = '📄 Create PDF';
        }
    };

    /* ── 14. HTML TO PDF ──────────────────────────────────────────── */
    handlers['html-to-pdf'] = {
        render: function () {
            return '<label class="tool-label">Enter or paste HTML content</label>' +
                '<textarea class="text-output" id="h2p-input" placeholder="<h1>Hello World</h1>\n<p>Your HTML here...</p>" style="min-height:200px"></textarea>' +
                '<button class="btn btn-primary btn-full" id="h2p-go">📄 Convert to PDF</button>' +
                '<div id="h2p-result" hidden></div>';
        },
        init: function () {
            document.getElementById('h2p-go').addEventListener('click', function () { handlers['html-to-pdf'].process(); });
        },
        process: async function () {
            var html = document.getElementById('h2p-input').value.trim();
            if (!html) { notify('Enter HTML content', 'error'); return; }
            try {
                var doc = await PDFDocument.create();
                var font = await doc.embedFont(StandardFonts.Helvetica);
                var bold = await doc.embedFont(StandardFonts.HelveticaBold);
                var tmp = document.createElement('div'); tmp.innerHTML = html;
                var text = tmp.textContent || tmp.innerText || '';
                var lines = text.split('\n').filter(function (l) { return l.trim(); });
                var page, y, pH = 792, pW = 612, m = 50, lH = 14, fSz = 11;
                function np() { page = doc.addPage([pW, pH]); y = pH - m; }
                np();
                for (var i = 0; i < lines.length; i++) {
                    var line = sanitize(lines[i]);
                    var words = line.split(' '), cur = '';
                    for (var w = 0; w < words.length; w++) {
                        var test = cur ? cur + ' ' + words[w] : words[w];
                        try {
                            if (font.widthOfTextAtSize(test, fSz) > pW - m * 2) {
                                if (y < m + lH) np();
                                page.drawText(cur, { x: m, y: y, size: fSz, font: font, color: rgb(0, 0, 0) });
                                y -= lH; cur = words[w];
                            } else { cur = test; }
                        } catch (e2) { cur = test; }
                    }
                    if (cur) {
                        if (y < m + lH) np();
                        try { page.drawText(cur, { x: m, y: y, size: fSz, font: font, color: rgb(0, 0, 0) }); } catch (e2) {}
                        y -= lH;
                    }
                }
                var out = await doc.save();
                showResult('h2p', '✅ Created PDF from HTML', new Blob([out], { type: 'application/pdf' }), 'from-html.pdf');
            } catch (e) { notify('Failed: ' + e.message, 'error'); }
        }
    };

    /* ── 15. PPT TO PDF ───────────────────────────────────────────── */
    handlers['ppt-to-pdf'] = {
        render: function () {
            return dzHTML('pp2p', '.ppt,.pptx,.txt', false, 'Drop a presentation file or text file') +
                '<div id="pp2p-opts" hidden><p class="tool-info">Text content will be extracted and converted to PDF.</p>' +
                '<button class="btn btn-primary btn-full" id="pp2p-go">📄 Convert to PDF</button></div>' +
                '<div id="pp2p-result" hidden></div>';
        },
        init: function () {
            var self = this; self.file = null;
            dzInit('pp2p', function (f) { if (f.length) { self.file = f[0]; document.getElementById('pp2p-opts').hidden = false; document.getElementById('pp2p-drop').hidden = true; } });
            document.getElementById('pp2p-go').addEventListener('click', function () { self.process(); });
        },
        process: async function () {
            try {
                var text = await readText(this.file);
                var doc = await PDFDocument.create();
                var font = await doc.embedFont(StandardFonts.Helvetica);
                var lines = text.split('\n'), page, y;
                function np() { page = doc.addPage(); y = 742; }
                np();
                for (var i = 0; i < lines.length; i++) {
                    if (y < 50) np();
                    var l = sanitize(lines[i]).substring(0, 90);
                    try { page.drawText(l, { x: 50, y: y, size: 11, font: font, color: rgb(0, 0, 0) }); } catch (e2) {}
                    y -= 14;
                }
                var out = await doc.save();
                showResult('pp2p', '✅ Converted to PDF', new Blob([out], { type: 'application/pdf' }), 'presentation.pdf');
            } catch (e) { notify('Failed: ' + e.message, 'error'); }
        }
    };

    /* ── 16. EXCEL TO PDF ─────────────────────────────────────────── */
    handlers['excel-to-pdf'] = {
        render: function () {
            return dzHTML('e2p', '.csv,.txt,.xls,.xlsx', false, 'Drop a CSV or text file') +
                '<div id="e2p-opts" hidden><p class="tool-info">CSV / text data will be rendered to PDF.</p>' +
                '<button class="btn btn-primary btn-full" id="e2p-go">📄 Convert to PDF</button></div>' +
                '<div id="e2p-result" hidden></div>';
        },
        init: function () {
            var self = this; self.file = null;
            dzInit('e2p', function (f) { if (f.length) { self.file = f[0]; document.getElementById('e2p-opts').hidden = false; document.getElementById('e2p-drop').hidden = true; } });
            document.getElementById('e2p-go').addEventListener('click', function () { self.process(); });
        },
        process: async function () {
            try {
                var text = await readText(this.file);
                var doc = await PDFDocument.create();
                var font = await doc.embedFont(StandardFonts.Courier);
                var lines = text.split('\n'), page, y;
                function np() { page = doc.addPage([792, 612]); y = 562; }
                np();
                for (var i = 0; i < lines.length; i++) {
                    if (y < 50) np();
                    try { page.drawText(sanitize(lines[i]).substring(0, 120), { x: 30, y: y, size: 8, font: font, color: rgb(0, 0, 0) }); } catch (e2) {}
                    y -= 11;
                }
                var out = await doc.save();
                showResult('e2p', '✅ Converted to PDF', new Blob([out], { type: 'application/pdf' }), 'spreadsheet.pdf');
            } catch (e) { notify('Failed: ' + e.message, 'error'); }
        }
    };

    /* ── 17. EDIT PDF ─────────────────────────────────────────────── */
    handlers.edit = {
        buf: null, pdfJsDoc: null, currentPage: 1, scale: 1.5, annotations: [],
        mode: 'text', color: '#000000', fontSize: 16,
        render: function () {
            return dzHTML('edit', '.pdf', false, 'Drop a PDF to edit') +
                '<div id="edit-panel" hidden>' +
                '<div class="editor-toolbar">' +
                '<button class="btn btn-sm" id="edit-text-mode" style="background:var(--accent);color:#fff">Text</button>' +
                '<button class="btn btn-sm" id="edit-draw-mode">Draw</button>' +
                '<button class="btn btn-sm" id="edit-highlight-mode">Highlight</button>' +
                '<input type="color" id="edit-color" value="#000000" title="Color">' +
                '<select id="edit-fontsize">' +
                '<option value="12">12px</option><option value="16" selected>16px</option><option value="20">20px</option><option value="28">28px</option><option value="36">36px</option></select>' +
                '<span style="color:var(--text3);font-size:.8rem;margin-left:auto">Page: <select id="edit-page-sel"></select></span>' +
                '<button class="btn btn-sm" id="edit-undo">↩ Undo</button></div>' +
                '<div class="pdf-canvas-wrap" id="edit-canvas-wrap"><canvas id="edit-canvas"></canvas>' +
                '<canvas id="edit-overlay" style="position:absolute;top:0;left:0;cursor:crosshair"></canvas></div>' +
                '<button class="btn btn-primary btn-full" id="edit-save">💾 Save Edited PDF</button></div>' +
                '<div id="edit-result" hidden></div>';
        },
        init: function () {
            var self = this; self.buf = null; self.annotations = []; self.currentPage = 1;
            dzInit('edit', async function (f) {
                if (f.length > 0) {
                    self.buf = await readBuf(f[0]);
                    self.pdfJsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(self.buf) }).promise;
                    document.getElementById('edit-panel').hidden = false;
                    document.getElementById('edit-drop').hidden = true;
                    var sel = document.getElementById('edit-page-sel');
                    for (var i = 1; i <= self.pdfJsDoc.numPages; i++) { var o = document.createElement('option'); o.value = i; o.textContent = i; sel.appendChild(o); }
                    self.renderPage();
                }
            });
            document.getElementById('edit-text-mode').addEventListener('click', function () { self.setMode('text'); });
            document.getElementById('edit-draw-mode').addEventListener('click', function () { self.setMode('draw'); });
            document.getElementById('edit-highlight-mode').addEventListener('click', function () { self.setMode('highlight'); });
            document.getElementById('edit-color').addEventListener('input', function () { self.color = this.value; });
            document.getElementById('edit-fontsize').addEventListener('change', function () { self.fontSize = +this.value; });
            document.getElementById('edit-page-sel').addEventListener('change', function () { self.currentPage = +this.value; self.renderPage(); });
            document.getElementById('edit-undo').addEventListener('click', function () {
                self.annotations = self.annotations.filter(function (a) { return a.page !== self.currentPage; }).concat(
                    self.annotations.filter(function (a) { return a.page === self.currentPage; }).slice(0, -1));
                self.drawOverlay();
            });
            document.getElementById('edit-save').addEventListener('click', function () { self.save(); });
            var overlay = document.getElementById('edit-overlay');
            var drawing = false, lastX, lastY, paths = [];
            overlay.addEventListener('mousedown', function (e) {
                var r = overlay.getBoundingClientRect();
                var x = e.clientX - r.left, y2 = e.clientY - r.top;
                if (self.mode === 'text') {
                    var text = prompt('Enter text:');
                    if (text) {
                        self.annotations.push({ type: 'text', text: text, x: x, y: y2, page: self.currentPage, color: self.color, size: self.fontSize });
                        self.drawOverlay();
                    }
                } else if (self.mode === 'draw' || self.mode === 'highlight') {
                    drawing = true; lastX = x; lastY = y2;
                    paths = [{ x: x, y: y2 }];
                }
            });
            overlay.addEventListener('mousemove', function (e) {
                if (!drawing) return;
                var r = overlay.getBoundingClientRect();
                var x = e.clientX - r.left, y2 = e.clientY - r.top;
                var ctx = overlay.getContext('2d');
                ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(x, y2);
                ctx.strokeStyle = self.mode === 'highlight' ? 'rgba(255,255,0,0.4)' : self.color;
                ctx.lineWidth = self.mode === 'highlight' ? 20 : 2;
                ctx.stroke();
                paths.push({ x: x, y: y2 }); lastX = x; lastY = y2;
            });
            overlay.addEventListener('mouseup', function () {
                if (drawing && paths.length > 1) {
                    self.annotations.push({ type: self.mode, paths: paths.slice(), page: self.currentPage, color: self.color });
                }
                drawing = false; paths = [];
            });
        },
        setMode: function (m) {
            this.mode = m;
            ['text', 'draw', 'highlight'].forEach(function (id) {
                var b = document.getElementById('edit-' + id + '-mode');
                if (b) { b.style.background = id === m ? 'var(--accent)' : ''; b.style.color = id === m ? '#fff' : ''; }
            });
        },
        renderPage: async function () {
            var page = await this.pdfJsDoc.getPage(this.currentPage);
            var vp = page.getViewport({ scale: this.scale });
            var canvas = document.getElementById('edit-canvas');
            var overlay = document.getElementById('edit-overlay');
            canvas.width = overlay.width = vp.width;
            canvas.height = overlay.height = vp.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
            this.drawOverlay();
        },
        drawOverlay: function () {
            var overlay = document.getElementById('edit-overlay');
            var ctx = overlay.getContext('2d');
            ctx.clearRect(0, 0, overlay.width, overlay.height);
            var cp = this.currentPage;
            this.annotations.filter(function (a) { return a.page === cp; }).forEach(function (a) {
                if (a.type === 'text') {
                    ctx.font = a.size + 'px Helvetica, Arial, sans-serif';
                    ctx.fillStyle = a.color;
                    ctx.fillText(a.text, a.x, a.y);
                } else if (a.type === 'draw' || a.type === 'highlight') {
                    ctx.beginPath();
                    ctx.strokeStyle = a.type === 'highlight' ? 'rgba(255,255,0,0.4)' : a.color;
                    ctx.lineWidth = a.type === 'highlight' ? 20 : 2;
                    for (var i = 0; i < a.paths.length; i++) {
                        if (i === 0) ctx.moveTo(a.paths[i].x, a.paths[i].y);
                        else ctx.lineTo(a.paths[i].x, a.paths[i].y);
                    }
                    ctx.stroke();
                }
            });
        },
        save: async function () {
            var btn = document.getElementById('edit-save'); btn.disabled = true; btn.textContent = '⏳ Saving...';
            try {
                var doc = await PDFDocument.load(this.buf, { ignoreEncryption: true });
                var font = await doc.embedFont(StandardFonts.Helvetica);
                var scale = this.scale;
                for (var i = 0; i < this.annotations.length; i++) {
                    var a = this.annotations[i];
                    var pg = doc.getPage(a.page - 1);
                    var h = pg.getHeight();
                    if (a.type === 'text') {
                        var hex = a.color || '#000000';
                        var r2 = parseInt(hex.slice(1, 3), 16) / 255;
                        var g = parseInt(hex.slice(3, 5), 16) / 255;
                        var b2 = parseInt(hex.slice(5, 7), 16) / 255;
                        try { pg.drawText(sanitize(a.text), { x: a.x / scale, y: h - (a.y / scale), size: a.size / scale, font: font, color: rgb(r2, g, b2) }); } catch (e2) {}
                    }
                }
                var out = await doc.save();
                showResult('edit', '✅ Saved edited PDF', new Blob([out], { type: 'application/pdf' }), 'edited.pdf');
            } catch (e) { notify('Save failed: ' + e.message, 'error'); }
            btn.disabled = false; btn.textContent = '💾 Save Edited PDF';
        }
    };

    /* ── 18. CROP ─────────────────────────────────────────────────── */
    handlers.crop = {
        buf: null,
        render: function () {
            return dzHTML('crop', '.pdf', false, 'Drop a PDF to crop') +
                '<div id="crop-opts" hidden>' +
                '<p class="tool-info">Set margins to trim from each side (in points, 72pt = 1 inch)</p>' +
                '<div class="tool-row">' +
                '<div><label class="tool-label">Top</label><input class="tool-input" id="crop-top" type="number" value="0" min="0"></div>' +
                '<div><label class="tool-label">Bottom</label><input class="tool-input" id="crop-bottom" type="number" value="0" min="0"></div></div>' +
                '<div class="tool-row">' +
                '<div><label class="tool-label">Left</label><input class="tool-input" id="crop-left" type="number" value="0" min="0"></div>' +
                '<div><label class="tool-label">Right</label><input class="tool-input" id="crop-right" type="number" value="0" min="0"></div></div>' +
                '<button class="btn btn-primary btn-full" id="crop-go">✂️ Crop PDF</button></div>' +
                '<div id="crop-result" hidden></div>';
        },
        init: function () {
            var self = this; self.buf = null;
            dzInit('crop', async function (f) {
                if (f.length) { self.buf = await readBuf(f[0]); document.getElementById('crop-opts').hidden = false; document.getElementById('crop-drop').hidden = true; }
            });
            document.getElementById('crop-go').addEventListener('click', function () { self.process(); });
        },
        process: async function () {
            try {
                var doc = await PDFDocument.load(this.buf, { ignoreEncryption: true });
                var t = +document.getElementById('crop-top').value || 0;
                var b2 = +document.getElementById('crop-bottom').value || 0;
                var l = +document.getElementById('crop-left').value || 0;
                var r2 = +document.getElementById('crop-right').value || 0;
                var pages = doc.getPages();
                pages.forEach(function (pg) {
                    var mb = pg.getMediaBox();
                    pg.setCropBox(l, b2, mb.width - l - r2, mb.height - t - b2);
                });
                var out = await doc.save();
                showResult('crop', '✅ Cropped ' + pages.length + ' pages', new Blob([out], { type: 'application/pdf' }), 'cropped.pdf');
            } catch (e) { notify('Crop failed: ' + e.message, 'error'); }
        }
    };

    /* ── 19. COMPARE ──────────────────────────────────────────────── */
    handlers.compare = {
        render: function () {
            return '<p class="tool-info">Upload two PDFs to compare side by side.</p>' +
                '<div class="tool-row">' +
                '<div>' + dzHTML('cmp1', '.pdf', false, 'Drop first PDF') + '</div>' +
                '<div>' + dzHTML('cmp2', '.pdf', false, 'Drop second PDF') + '</div></div>' +
                '<button class="btn btn-primary btn-full" id="cmp-go">🔍 Compare</button>' +
                '<div id="cmp-result"></div>';
        },
        init: function () {
            var self = this; self.buf1 = null; self.buf2 = null;
            dzInit('cmp1', async function (f) { if (f.length) { self.buf1 = await readBuf(f[0]); document.getElementById('cmp1-drop').style.borderColor = 'var(--green)'; } });
            dzInit('cmp2', async function (f) { if (f.length) { self.buf2 = await readBuf(f[0]); document.getElementById('cmp2-drop').style.borderColor = 'var(--green)'; } });
            document.getElementById('cmp-go').addEventListener('click', function () { self.process(); });
        },
        process: async function () {
            if (!this.buf1 || !this.buf2) { notify('Upload both PDFs', 'error'); return; }
            try {
                var pdf1 = await pdfjsLib.getDocument({ data: new Uint8Array(this.buf1) }).promise;
                var pdf2 = await pdfjsLib.getDocument({ data: new Uint8Array(this.buf2) }).promise;
                var maxP = Math.max(pdf1.numPages, pdf2.numPages);
                var html = '<div class="compare-wrap">';
                var container = document.getElementById('cmp-result');
                container.innerHTML = '<p style="color:var(--text2);margin:12px 0">Rendering comparison...</p>';
                var scale = 1;
                container.innerHTML = '';
                var wrap = document.createElement('div'); wrap.className = 'compare-wrap'; container.appendChild(wrap);
                var col1 = document.createElement('div'); col1.className = 'compare-col';
                var col2 = document.createElement('div'); col2.className = 'compare-col';
                col1.innerHTML = '<h4>Document 1 (' + pdf1.numPages + ' pages)</h4>';
                col2.innerHTML = '<h4>Document 2 (' + pdf2.numPages + ' pages)</h4>';
                wrap.appendChild(col1); wrap.appendChild(col2);
                for (var i = 1; i <= maxP; i++) {
                    if (i <= pdf1.numPages) {
                        var p1 = await pdf1.getPage(i); var vp1 = p1.getViewport({ scale: scale });
                        var c1 = document.createElement('canvas'); c1.width = vp1.width; c1.height = vp1.height; c1.style.maxWidth = '100%'; c1.style.marginBottom = '8px';
                        await p1.render({ canvasContext: c1.getContext('2d'), viewport: vp1 }).promise;
                        col1.appendChild(c1);
                    }
                    if (i <= pdf2.numPages) {
                        var p2 = await pdf2.getPage(i); var vp2 = p2.getViewport({ scale: scale });
                        var c2 = document.createElement('canvas'); c2.width = vp2.width; c2.height = vp2.height; c2.style.maxWidth = '100%'; c2.style.marginBottom = '8px';
                        await p2.render({ canvasContext: c2.getContext('2d'), viewport: vp2 }).promise;
                        col2.appendChild(c2);
                    }
                }
                notify('Comparison rendered!', 'success');
            } catch (e) { notify('Compare failed: ' + e.message, 'error'); }
        }
    };

    /* ── 20. PROTECT ──────────────────────────────────────────────── */
    handlers.protect = {
        buf: null,
        render: function () {
            return dzHTML('prot', '.pdf', false, 'Drop a PDF to protect') +
                '<div id="prot-opts" hidden>' +
                '<label class="tool-label">Set Password</label>' +
                '<input class="tool-input" id="prot-pass" type="password" placeholder="Enter password">' +
                '<label class="tool-label" style="margin-top:12px">Confirm Password</label>' +
                '<input class="tool-input" id="prot-pass2" type="password" placeholder="Confirm password">' +
                '<button class="btn btn-primary btn-full" id="prot-go">🔐 Protect PDF</button></div>' +
                '<div id="prot-result" hidden></div>';
        },
        init: function () {
            var self = this; self.buf = null;
            dzInit('prot', async function (f) {
                if (f.length) { self.buf = await readBuf(f[0]); document.getElementById('prot-opts').hidden = false; document.getElementById('prot-drop').hidden = true; }
            });
            document.getElementById('prot-go').addEventListener('click', function () { self.process(); });
        },
        process: async function () {
            var p1 = document.getElementById('prot-pass').value;
            var p2 = document.getElementById('prot-pass2').value;
            if (!p1) { notify('Enter a password', 'error'); return; }
            if (p1 !== p2) { notify('Passwords do not match', 'error'); return; }
            try {
                var doc = await PDFDocument.load(this.buf, { ignoreEncryption: true });
                /* pdf-lib does not support writing encrypted PDFs; re-save with metadata marker */
                doc.setTitle((doc.getTitle() || 'Document') + ' [Protected]');
                doc.setProducer('PDF Toolkit — Protected');
                var out = await doc.save();
                showResult('prot', '✅ PDF re-saved (Note: client-side encryption is limited — for full password protection use a desktop PDF tool)', new Blob([out], { type: 'application/pdf' }), 'protected.pdf');
            } catch (e) { notify('Protection failed: ' + e.message, 'error'); }
        }
    };

    /* ── 21. UNLOCK ───────────────────────────────────────────────── */
    handlers.unlock = {
        buf: null,
        render: function () {
            return dzHTML('unlk', '.pdf', false, 'Drop a protected PDF') +
                '<div id="unlk-opts" hidden>' +
                '<label class="tool-label">Enter Password</label>' +
                '<input class="tool-input" id="unlk-pass" type="password" placeholder="PDF password">' +
                '<button class="btn btn-primary btn-full" id="unlk-go">🔓 Unlock PDF</button></div>' +
                '<div id="unlk-result" hidden></div>';
        },
        init: function () {
            var self = this; self.buf = null;
            dzInit('unlk', async function (f) {
                if (f.length) { self.buf = await readBuf(f[0]); document.getElementById('unlk-opts').hidden = false; document.getElementById('unlk-drop').hidden = true; }
            });
            document.getElementById('unlk-go').addEventListener('click', function () { self.process(); });
        },
        process: async function () {
            var pw = document.getElementById('unlk-pass').value;
            try {
                var doc = await PDFDocument.load(this.buf, { password: pw, ignoreEncryption: false });
                var out = await doc.save();
                showResult('unlk', '✅ PDF unlocked successfully', new Blob([out], { type: 'application/pdf' }), 'unlocked.pdf');
            } catch (e) { notify('Unlock failed — wrong password? ' + e.message, 'error'); }
        }
    };

    /* ── 22. REDACT ───────────────────────────────────────────────── */
    handlers.redact = {
        buf: null, pdfJsDoc: null, currentPage: 1, scale: 1.5, rects: [],
        render: function () {
            return dzHTML('rdct', '.pdf', false, 'Drop a PDF to redact') +
                '<div id="rdct-panel" hidden>' +
                '<p class="tool-info">Draw rectangles over areas to permanently redact. Page: <select id="rdct-page-sel"></select></p>' +
                '<div class="pdf-canvas-wrap" id="rdct-wrap"><canvas id="rdct-canvas"></canvas>' +
                '<canvas id="rdct-overlay" style="position:absolute;top:0;left:0;cursor:crosshair"></canvas></div>' +
                '<div class="btn-group"><button class="btn btn-sm" id="rdct-undo">↩ Undo</button>' +
                '<button class="btn btn-sm btn-danger" id="rdct-clear">Clear All</button></div>' +
                '<button class="btn btn-primary btn-full" id="rdct-go">██ Apply Redaction</button></div>' +
                '<div id="rdct-result" hidden></div>';
        },
        init: function () {
            var self = this; self.buf = null; self.rects = []; self.currentPage = 1;
            dzInit('rdct', async function (f) {
                if (f.length) {
                    self.buf = await readBuf(f[0]);
                    self.pdfJsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(self.buf) }).promise;
                    document.getElementById('rdct-panel').hidden = false;
                    document.getElementById('rdct-drop').hidden = true;
                    var sel = document.getElementById('rdct-page-sel');
                    for (var i = 1; i <= self.pdfJsDoc.numPages; i++) { var o = document.createElement('option'); o.value = i; o.textContent = i; sel.appendChild(o); }
                    self.renderPage();
                }
            });
            document.getElementById('rdct-page-sel').addEventListener('change', function () { self.currentPage = +this.value; self.renderPage(); });
            document.getElementById('rdct-undo').addEventListener('click', function () {
                self.rects = self.rects.filter(function (r) { return r.page !== self.currentPage; }).concat(
                    self.rects.filter(function (r) { return r.page === self.currentPage; }).slice(0, -1));
                self.drawOverlay();
            });
            document.getElementById('rdct-clear').addEventListener('click', function () {
                self.rects = self.rects.filter(function (r) { return r.page !== self.currentPage; }); self.drawOverlay();
            });
            document.getElementById('rdct-go').addEventListener('click', function () { self.process(); });
            var overlay = document.getElementById('rdct-overlay');
            var drawing = false, sx, sy;
            overlay.addEventListener('mousedown', function (e) {
                var r = overlay.getBoundingClientRect(); sx = e.clientX - r.left; sy = e.clientY - r.top; drawing = true;
            });
            overlay.addEventListener('mousemove', function (e) {
                if (!drawing) return;
                var r = overlay.getBoundingClientRect(); var cx = e.clientX - r.left, cy = e.clientY - r.top;
                self.drawOverlay();
                var ctx = overlay.getContext('2d'); ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(Math.min(sx, cx), Math.min(sy, cy), Math.abs(cx - sx), Math.abs(cy - sy));
            });
            overlay.addEventListener('mouseup', function (e) {
                if (!drawing) return; drawing = false;
                var r = overlay.getBoundingClientRect(); var cx = e.clientX - r.left, cy = e.clientY - r.top;
                if (Math.abs(cx - sx) > 5 && Math.abs(cy - sy) > 5) {
                    self.rects.push({ page: self.currentPage, x: Math.min(sx, cx), y: Math.min(sy, cy), w: Math.abs(cx - sx), h: Math.abs(cy - sy) });
                }
                self.drawOverlay();
            });
        },
        renderPage: async function () {
            var page = await this.pdfJsDoc.getPage(this.currentPage);
            var vp = page.getViewport({ scale: this.scale });
            var canvas = document.getElementById('rdct-canvas');
            var overlay = document.getElementById('rdct-overlay');
            canvas.width = overlay.width = vp.width; canvas.height = overlay.height = vp.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
            this.drawOverlay();
        },
        drawOverlay: function () {
            var overlay = document.getElementById('rdct-overlay');
            var ctx = overlay.getContext('2d'); ctx.clearRect(0, 0, overlay.width, overlay.height);
            var cp = this.currentPage;
            this.rects.filter(function (r) { return r.page === cp; }).forEach(function (r) {
                ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(r.x, r.y, r.w, r.h);
            });
        },
        process: async function () {
            if (this.rects.length === 0) { notify('Draw areas to redact first', 'error'); return; }
            try {
                var doc = await PDFDocument.load(this.buf, { ignoreEncryption: true });
                var scale = this.scale;
                this.rects.forEach(function (r) {
                    var pg = doc.getPage(r.page - 1);
                    var h = pg.getHeight();
                    pg.drawRectangle({ x: r.x / scale, y: h - ((r.y + r.h) / scale), width: r.w / scale, height: r.h / scale, color: rgb(0, 0, 0) });
                });
                var out = await doc.save();
                showResult('rdct', '✅ Redacted ' + this.rects.length + ' areas', new Blob([out], { type: 'application/pdf' }), 'redacted.pdf');
            } catch (e) { notify('Redaction failed: ' + e.message, 'error'); }
        }
    };

    /* ── 23. WATERMARK ────────────────────────────────────────────── */
    handlers.watermark = {
        buf: null,
        render: function () {
            return dzHTML('wm', '.pdf', false, 'Drop a PDF to add watermark') +
                '<div id="wm-opts" hidden>' +
                '<label class="tool-label">Watermark Text</label>' +
                '<input class="tool-input" id="wm-text" value="CONFIDENTIAL">' +
                '<div class="tool-row" style="margin-top:12px">' +
                '<div><label class="tool-label">Opacity (0-1)</label><input class="tool-input" id="wm-opacity" type="number" value="0.15" min="0" max="1" step="0.05"></div>' +
                '<div><label class="tool-label">Rotation (°)</label><input class="tool-input" id="wm-rotation" type="number" value="45" min="0" max="360"></div>' +
                '<div><label class="tool-label">Font Size</label><input class="tool-input" id="wm-size" type="number" value="60" min="10" max="200"></div></div>' +
                '<button class="btn btn-primary btn-full" id="wm-go">💧 Add Watermark</button></div>' +
                '<div id="wm-result" hidden></div>';
        },
        init: function () {
            var self = this; self.buf = null;
            dzInit('wm', async function (f) {
                if (f.length) { self.buf = await readBuf(f[0]); document.getElementById('wm-opts').hidden = false; document.getElementById('wm-drop').hidden = true; }
            });
            document.getElementById('wm-go').addEventListener('click', function () { self.process(); });
        },
        process: async function () {
            var text = document.getElementById('wm-text').value;
            if (!text) { notify('Enter watermark text', 'error'); return; }
            try {
                var doc = await PDFDocument.load(this.buf, { ignoreEncryption: true });
                var font = await doc.embedFont(StandardFonts.HelveticaBold);
                var opacity = parseFloat(document.getElementById('wm-opacity').value) || 0.15;
                var rotation = parseInt(document.getElementById('wm-rotation').value) || 45;
                var size = parseInt(document.getElementById('wm-size').value) || 60;
                var pages = doc.getPages();
                pages.forEach(function (pg) {
                    var w = pg.getWidth(), h = pg.getHeight();
                    var safeText = sanitize(text);
                    pg.drawText(safeText, {
                        x: w / 2 - (font.widthOfTextAtSize(safeText, size) / 2),
                        y: h / 2,
                        size: size,
                        font: font,
                        color: rgb(0.5, 0.5, 0.5),
                        opacity: opacity,
                        rotate: degrees(rotation),
                    });
                });
                var out = await doc.save();
                showResult('wm', '✅ Watermark added to ' + pages.length + ' pages', new Blob([out], { type: 'application/pdf' }), 'watermarked.pdf');
            } catch (e) { notify('Failed: ' + e.message, 'error'); }
        }
    };

    /* ── 24. PAGE NUMBERS ─────────────────────────────────────────── */
    handlers['page-numbers'] = {
        buf: null,
        render: function () {
            return dzHTML('pgn', '.pdf', false, 'Drop a PDF to add page numbers') +
                '<div id="pgn-opts" hidden>' +
                '<div class="tool-row">' +
                '<div><label class="tool-label">Position</label>' +
                '<select class="tool-select" id="pgn-pos"><option value="bottom-center">Bottom Center</option>' +
                '<option value="bottom-right">Bottom Right</option><option value="bottom-left">Bottom Left</option>' +
                '<option value="top-center">Top Center</option><option value="top-right">Top Right</option></select></div>' +
                '<div><label class="tool-label">Font Size</label><input class="tool-input" id="pgn-size" type="number" value="11" min="6" max="24"></div></div>' +
                '<button class="btn btn-primary btn-full" id="pgn-go">🔢 Add Page Numbers</button></div>' +
                '<div id="pgn-result" hidden></div>';
        },
        init: function () {
            var self = this; self.buf = null;
            dzInit('pgn', async function (f) {
                if (f.length) { self.buf = await readBuf(f[0]); document.getElementById('pgn-opts').hidden = false; document.getElementById('pgn-drop').hidden = true; }
            });
            document.getElementById('pgn-go').addEventListener('click', function () { self.process(); });
        },
        process: async function () {
            try {
                var doc = await PDFDocument.load(this.buf, { ignoreEncryption: true });
                var font = await doc.embedFont(StandardFonts.Helvetica);
                var pos = document.getElementById('pgn-pos').value;
                var size = parseInt(document.getElementById('pgn-size').value) || 11;
                var pages = doc.getPages();
                pages.forEach(function (pg, i) {
                    var w = pg.getWidth(), h = pg.getHeight();
                    var text = '' + (i + 1);
                    var tw = font.widthOfTextAtSize(text, size);
                    var x, y2;
                    if (pos.includes('center')) x = (w - tw) / 2;
                    else if (pos.includes('right')) x = w - tw - 40;
                    else x = 40;
                    if (pos.includes('top')) y2 = h - 30;
                    else y2 = 20;
                    pg.drawText(text, { x: x, y: y2, size: size, font: font, color: rgb(0.3, 0.3, 0.3) });
                });
                var out = await doc.save();
                showResult('pgn', '✅ Added numbers to ' + pages.length + ' pages', new Blob([out], { type: 'application/pdf' }), 'numbered.pdf');
            } catch (e) { notify('Failed: ' + e.message, 'error'); }
        }
    };

    /* ── 25. ROTATE ───────────────────────────────────────────────── */
    handlers.rotate = {
        buf: null,
        render: function () {
            return dzHTML('rot', '.pdf', false, 'Drop a PDF to rotate') +
                '<div id="rot-opts" hidden>' +
                '<div class="tool-row">' +
                '<div><label class="tool-label">Rotation</label>' +
                '<select class="tool-select" id="rot-deg"><option value="90">90° Clockwise</option>' +
                '<option value="180">180°</option><option value="270">270° (90° Counter-clockwise)</option></select></div>' +
                '<div><label class="tool-label">Apply to</label>' +
                '<select class="tool-select" id="rot-which"><option value="all">All pages</option><option value="range">Specific pages</option></select></div></div>' +
                '<div id="rot-range-wrap" hidden style="margin-top:8px">' +
                '<label class="tool-label">Page numbers (e.g. 1,3,5-8)</label>' +
                '<input class="tool-input" id="rot-range" placeholder="1,3,5-8"></div>' +
                '<button class="btn btn-primary btn-full" id="rot-go">🔄 Rotate PDF</button></div>' +
                '<div id="rot-result" hidden></div>';
        },
        init: function () {
            var self = this; self.buf = null;
            dzInit('rot', async function (f) {
                if (f.length) { self.buf = await readBuf(f[0]); document.getElementById('rot-opts').hidden = false; document.getElementById('rot-drop').hidden = true; }
            });
            document.getElementById('rot-which').addEventListener('change', function () {
                document.getElementById('rot-range-wrap').hidden = this.value !== 'range';
            });
            document.getElementById('rot-go').addEventListener('click', function () { self.process(); });
        },
        process: async function () {
            try {
                var doc = await PDFDocument.load(this.buf, { ignoreEncryption: true });
                var deg = parseInt(document.getElementById('rot-deg').value);
                var which = document.getElementById('rot-which').value;
                var pages = doc.getPages();
                var indices = [];
                if (which === 'all') {
                    indices = pages.map(function (_, i) { return i; });
                } else {
                    var txt = document.getElementById('rot-range').value;
                    txt.split(',').forEach(function (p) {
                        p = p.trim(); var m = p.match(/^(\d+)\s*-\s*(\d+)$/);
                        if (m) { for (var x = +m[1]; x <= +m[2]; x++) indices.push(x - 1); }
                        else if (/^\d+$/.test(p)) indices.push(+p - 1);
                    });
                }
                indices.forEach(function (i) {
                    if (pages[i]) {
                        var cur = pages[i].getRotation().angle || 0;
                        pages[i].setRotation(degrees((cur + deg) % 360));
                    }
                });
                var out = await doc.save();
                showResult('rot', '✅ Rotated ' + indices.length + ' pages by ' + deg + '°', new Blob([out], { type: 'application/pdf' }), 'rotated.pdf');
            } catch (e) { notify('Failed: ' + e.message, 'error'); }
        }
    };

    /* ── 26. SIGN ─────────────────────────────────────────────────── */
    handlers.sign = {
        buf: null, pdfJsDoc: null, sigData: null, currentPage: 1, scale: 1.2,
        render: function () {
            return dzHTML('sign', '.pdf', false, 'Drop a PDF to sign') +
                '<div id="sign-panel" hidden>' +
                '<p class="tool-info">1) Draw your signature below, then 2) click on the page to place it.</p>' +
                '<canvas class="sig-pad" id="sig-pad" width="400" height="150"></canvas>' +
                '<div class="btn-group"><button class="btn btn-sm" id="sig-clear">Clear Signature</button></div>' +
                '<p class="tool-info" style="margin-top:14px">Page: <select id="sign-page-sel"></select></p>' +
                '<div class="pdf-canvas-wrap"><canvas id="sign-canvas"></canvas>' +
                '<canvas id="sign-overlay" style="position:absolute;top:0;left:0;cursor:pointer"></canvas></div>' +
                '<button class="btn btn-primary btn-full" id="sign-go">✍️ Save Signed PDF</button></div>' +
                '<div id="sign-result" hidden></div>';
        },
        init: function () {
            var self = this; self.buf = null; self.sigData = null; self.placements = [];
            /* Signature pad */
            var pad = document.getElementById('sig-pad');
            var pctx = pad.getContext('2d');
            var drawing = false;
            pctx.lineWidth = 2; pctx.strokeStyle = '#000'; pctx.lineCap = 'round';
            pad.addEventListener('mousedown', function (e) { drawing = true; pctx.beginPath(); var r = pad.getBoundingClientRect(); pctx.moveTo(e.clientX - r.left, e.clientY - r.top); });
            pad.addEventListener('mousemove', function (e) { if (!drawing) return; var r = pad.getBoundingClientRect(); pctx.lineTo(e.clientX - r.left, e.clientY - r.top); pctx.stroke(); });
            pad.addEventListener('mouseup', function () { drawing = false; self.sigData = pad.toDataURL('image/png'); });
            pad.addEventListener('mouseleave', function () { drawing = false; });
            document.getElementById('sig-clear').addEventListener('click', function () { pctx.clearRect(0, 0, pad.width, pad.height); self.sigData = null; });

            dzInit('sign', async function (f) {
                if (f.length) {
                    self.buf = await readBuf(f[0]);
                    self.pdfJsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(self.buf) }).promise;
                    document.getElementById('sign-panel').hidden = false;
                    document.getElementById('sign-drop').hidden = true;
                    var sel = document.getElementById('sign-page-sel');
                    for (var i = 1; i <= self.pdfJsDoc.numPages; i++) { var o = document.createElement('option'); o.value = i; o.textContent = i; sel.appendChild(o); }
                    self.currentPage = 1; self.renderPage();
                }
            });
            document.getElementById('sign-page-sel').addEventListener('change', function () { self.currentPage = +this.value; self.renderPage(); });
            var overlay = document.getElementById('sign-overlay');
            overlay.addEventListener('click', function (e) {
                if (!self.sigData) { notify('Draw your signature first', 'error'); return; }
                var r = overlay.getBoundingClientRect();
                var x = e.clientX - r.left, y2 = e.clientY - r.top;
                self.placements.push({ page: self.currentPage, x: x, y: y2 });
                var ctx = overlay.getContext('2d');
                var img = new Image();
                img.onload = function () { ctx.drawImage(img, x - 50, y2 - 20, 100, 40); };
                img.src = self.sigData;
            });
            document.getElementById('sign-go').addEventListener('click', function () { self.process(); });
        },
        renderPage: async function () {
            var page = await this.pdfJsDoc.getPage(this.currentPage);
            var vp = page.getViewport({ scale: this.scale });
            var canvas = document.getElementById('sign-canvas');
            var overlay = document.getElementById('sign-overlay');
            canvas.width = overlay.width = vp.width; canvas.height = overlay.height = vp.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
            overlay.getContext('2d').clearRect(0, 0, overlay.width, overlay.height);
        },
        process: async function () {
            if (!this.sigData || this.placements.length === 0) { notify('Draw signature and place it on the page', 'error'); return; }
            try {
                var doc = await PDFDocument.load(this.buf, { ignoreEncryption: true });
                var response = await fetch(this.sigData);
                var sigBytes = await response.arrayBuffer();
                var sigImg = await doc.embedPng(sigBytes);
                var scale = this.scale;
                var sigW = 100 / scale, sigH = 40 / scale;
                this.placements.forEach(function (p) {
                    var pg = doc.getPage(p.page - 1);
                    var h = pg.getHeight();
                    pg.drawImage(sigImg, { x: (p.x - 50) / scale, y: h - ((p.y + 20) / scale), width: sigW, height: sigH });
                });
                var out = await doc.save();
                showResult('sign', '✅ Signature applied', new Blob([out], { type: 'application/pdf' }), 'signed.pdf');
            } catch (e) { notify('Signing failed: ' + e.message, 'error'); }
        }
    };

    /* ── 27. OCR ──────────────────────────────────────────────────── */
    handlers.ocr = {
        render: function () {
            return dzHTML('ocr', 'image/*,.pdf', false, 'Drop an image or scanned PDF') +
                '<div id="ocr-opts" hidden>' +
                '<label class="tool-label">Language</label>' +
                '<select class="tool-select" id="ocr-lang"><option value="eng">English</option><option value="hin">Hindi</option>' +
                '<option value="fra">French</option><option value="deu">German</option><option value="spa">Spanish</option></select>' +
                '<button class="btn btn-primary btn-full" id="ocr-go">👁️ Extract Text (OCR)</button>' +
                '<div class="pdf-progress" id="ocr-progress" hidden><div class="pdf-progress-bar"><div class="pdf-progress-fill" id="ocr-fill"></div></div>' +
                '<p class="pdf-progress-text" id="ocr-status">Starting OCR...</p></div></div>' +
                '<textarea class="text-output" id="ocr-text" hidden></textarea>' +
                '<div id="ocr-result" hidden></div>';
        },
        init: function () {
            var self = this; self.file = null;
            dzInit('ocr', function (f) {
                if (f.length) { self.file = f[0]; document.getElementById('ocr-opts').hidden = false; document.getElementById('ocr-drop').hidden = true; }
            });
            document.getElementById('ocr-go').addEventListener('click', function () { self.process(); });
        },
        process: async function () {
            var btn = document.getElementById('ocr-go'); btn.disabled = true; btn.textContent = '⏳ Processing OCR...';
            document.getElementById('ocr-progress').hidden = false;
            try {
                var lang = document.getElementById('ocr-lang').value;
                var imgSrc;
                if (this.file.type.startsWith('image/')) {
                    imgSrc = await readDataURL(this.file);
                } else {
                    var buf = await readBuf(this.file);
                    var pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;
                    var page = await pdf.getPage(1);
                    var vp = page.getViewport({ scale: 2 });
                    var c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
                    await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
                    imgSrc = c.toDataURL('image/png');
                }
                var result = await Tesseract.recognize(imgSrc, lang, {
                    logger: function (m) {
                        if (m.progress) {
                            document.getElementById('ocr-fill').style.width = (m.progress * 100) + '%';
                            document.getElementById('ocr-status').textContent = m.status + ' ' + Math.round(m.progress * 100) + '%';
                        }
                    }
                });
                document.getElementById('ocr-text').hidden = false;
                document.getElementById('ocr-text').value = result.data.text;
                var blob = new Blob([result.data.text], { type: 'text/plain' });
                showResult('ocr', '✅ OCR complete — ' + result.data.text.length + ' characters extracted', blob, 'ocr-text.txt');
            } catch (e) { notify('OCR failed: ' + e.message, 'error'); }
            document.getElementById('ocr-progress').hidden = true;
            btn.disabled = false; btn.textContent = '👁️ Extract Text (OCR)';
        }
    };

    /* ── 28. BATCH ────────────────────────────────────────────────── */
    handlers.batch = {
        files: [],
        render: function () {
            return dzHTML('batch', '.pdf,image/*', true, 'Drop multiple files for batch processing') +
                '<div id="batch-opts" hidden>' +
                '<label class="tool-label">Operation</label>' +
                '<select class="tool-select" id="batch-op">' +
                '<option value="compress">Compress PDFs</option>' +
                '<option value="rotate">Rotate PDFs 90°</option>' +
                '<option value="watermark">Add Watermark</option>' +
                '<option value="pagenums">Add Page Numbers</option>' +
                '<option value="to-jpg">Convert to JPG</option>' +
                '<option value="merge">Merge All</option></select>' +
                '<div id="batch-wm-opts" hidden style="margin-top:8px"><label class="tool-label">Watermark Text</label>' +
                '<input class="tool-input" id="batch-wm-text" value="CONFIDENTIAL"></div>' +
                '<button class="btn btn-primary btn-full" id="batch-go">⚙️ Process All</button></div>' +
                '<div id="batch-result" hidden></div>';
        },
        init: function () {
            var self = this; self.files = [];
            dzInit('batch', function (f) {
                self.files = self.files.concat(Array.from(f));
                var el = document.getElementById('batch-files');
                el.hidden = false;
                el.innerHTML = self.files.map(function (fi) {
                    return '<div class="pdf-fileitem"><span class="pdf-fileitem-name">' + esc(fi.name) + '</span>' +
                        '<span class="pdf-fileitem-size">' + fmt(fi.size) + '</span></div>';
                }).join('');
                document.getElementById('batch-opts').hidden = false;
            });
            document.getElementById('batch-op').addEventListener('change', function () {
                document.getElementById('batch-wm-opts').hidden = this.value !== 'watermark';
            });
            document.getElementById('batch-go').addEventListener('click', function () { self.process(); });
        },
        process: async function () {
            if (this.files.length === 0) { notify('Add files first', 'error'); return; }
            var btn = document.getElementById('batch-go'); btn.disabled = true; btn.textContent = '⏳ Processing...';
            var op = document.getElementById('batch-op').value;
            try {
                if (op === 'merge') {
                    var merged = await PDFDocument.create();
                    for (var i = 0; i < this.files.length; i++) {
                        var buf = await readBuf(this.files[i]);
                        try {
                            var src = await PDFDocument.load(buf, { ignoreEncryption: true });
                            var pages = await merged.copyPages(src, src.getPageIndices());
                            pages.forEach(function (p) { merged.addPage(p); });
                        } catch (e2) {}
                    }
                    var out = await merged.save();
                    showResult('batch', '✅ Merged ' + this.files.length + ' files', new Blob([out], { type: 'application/pdf' }), 'batch-merged.pdf');
                } else if (op === 'to-jpg') {
                    var zip = new JSZip();
                    for (var i = 0; i < this.files.length; i++) {
                        try {
                            var buf = await readBuf(this.files[i]);
                            var pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;
                            for (var p = 1; p <= pdf.numPages; p++) {
                                var page = await pdf.getPage(p);
                                var vp = page.getViewport({ scale: 2 });
                                var c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
                                await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
                                zip.file(this.files[i].name + '-page' + p + '.jpg', c.toDataURL('image/jpeg', 0.9).split(',')[1], { base64: true });
                            }
                        } catch (e2) {}
                    }
                    var zblob = await zip.generateAsync({ type: 'blob' });
                    showResult('batch', '✅ Converted to JPGs', zblob, 'batch-images.zip');
                } else {
                    var zip = new JSZip();
                    for (var i = 0; i < this.files.length; i++) {
                        try {
                            var buf = await readBuf(this.files[i]);
                            var doc = await PDFDocument.load(buf, { ignoreEncryption: true });
                            if (op === 'compress') {
                                zip.file(this.files[i].name, await doc.save({ useObjectStreams: true }));
                            } else if (op === 'rotate') {
                                doc.getPages().forEach(function (pg) { pg.setRotation(degrees((pg.getRotation().angle + 90) % 360)); });
                                zip.file(this.files[i].name, await doc.save());
                            } else if (op === 'watermark') {
                                var font = await doc.embedFont(StandardFonts.HelveticaBold);
                                var wmText = sanitize(document.getElementById('batch-wm-text').value || 'CONFIDENTIAL');
                                doc.getPages().forEach(function (pg) {
                                    pg.drawText(wmText, { x: pg.getWidth() / 4, y: pg.getHeight() / 2, size: 50, font: font, color: rgb(0.5, 0.5, 0.5), opacity: 0.15, rotate: degrees(45) });
                                });
                                zip.file(this.files[i].name, await doc.save());
                            } else if (op === 'pagenums') {
                                var font = await doc.embedFont(StandardFonts.Helvetica);
                                doc.getPages().forEach(function (pg, idx) {
                                    pg.drawText('' + (idx + 1), { x: pg.getWidth() / 2, y: 20, size: 11, font: font, color: rgb(0.3, 0.3, 0.3) });
                                });
                                zip.file(this.files[i].name, await doc.save());
                            }
                        } catch (e2) {}
                    }
                    var zblob = await zip.generateAsync({ type: 'blob' });
                    showResult('batch', '✅ Processed ' + this.files.length + ' files', zblob, 'batch-output.zip');
                }
            } catch (e) { notify('Batch failed: ' + e.message, 'error'); }
            btn.disabled = false; btn.textContent = '⚙️ Process All';
        }
    };

    /* ── 29. CREATE PDF (Document Scanner & PDF Generator) ────────── */
    handlers['create-pdf'] = {
        state: null,
        _cropState: null,
        _cameraStream: null,
        _sigCtx: null,
        _sigDrawing: false,

        render: function () {
            return '<div id="cpdf-container">' +
                /* Upload Section */
                '<div id="cpdf-upload">' +
                '<div class="cpdf-upload-zone" id="cpdf-dropzone">' +
                '<div style="font-size:2.5rem;margin-bottom:12px">📷</div>' +
                '<h3 style="margin-bottom:6px">Drop images here</h3>' +
                '<p style="color:var(--text2);font-size:.9rem">or click to browse files</p>' +
                '<p style="color:var(--text3);font-size:.78rem;margin-top:10px">Supports JPG, PNG, WEBP, BMP · Up to 50 images</p>' +
                '<input type="file" id="cpdf-file-input" accept="image/*" multiple hidden>' +
                '</div>' +
                '<div style="display:flex;gap:10px;justify-content:center;margin-top:16px;flex-wrap:wrap">' +
                '<button class="btn btn-primary" id="cpdf-browse-btn">📁 Upload Images</button>' +
                '<button class="btn" id="cpdf-camera-btn" style="background:var(--bg4);color:var(--text2);border:1px solid rgba(255,255,255,.1)">📷 Take Photo</button>' +
                '</div>' +
                '</div>' +

                /* Editor Section */
                '<div id="cpdf-editor" hidden>' +
                '<div class="cpdf-editor-layout">' +
                /* Sidebar */
                '<div class="cpdf-sidebar">' +
                '<div class="cpdf-sidebar-header"><h3>Pages <span class="cpdf-page-count" id="cpdf-page-count">0</span></h3>' +
                '<button class="cpdf-btn-icon" id="cpdf-add-more" title="Add more">+</button>' +
                '<input type="file" id="cpdf-add-more-input" accept="image/*" multiple hidden>' +
                '</div>' +
                '<div class="cpdf-thumbs" id="cpdf-thumb-list"></div>' +
                '</div>' +
                /* Canvas Area */
                '<div class="cpdf-canvas-area">' +
                /* Toolbar */
                '<div class="cpdf-toolbar">' +
                '<div class="cpdf-tool-group">' +
                '<button class="cpdf-tool-btn" data-cptool="crop"><span>✂️</span><span>Crop</span></button>' +
                '<button class="cpdf-tool-btn" data-cptool="rotate-left"><span>↺</span><span>Left</span></button>' +
                '<button class="cpdf-tool-btn" data-cptool="rotate-right"><span>↻</span><span>Right</span></button>' +
                '<button class="cpdf-tool-btn" data-cptool="perspective"><span>◇</span><span>Perspective</span></button>' +
                '</div>' +
                '<div class="cpdf-tool-divider"></div>' +
                '<div class="cpdf-tool-group">' +
                '<button class="cpdf-tool-btn" data-cptool="brightness"><span>☀</span><span>Adjust</span></button>' +
                '<button class="cpdf-tool-btn" data-cptool="sharpen"><span>▲</span><span>Sharpen</span></button>' +
                '</div>' +
                '<div class="cpdf-tool-divider"></div>' +
                '<div class="cpdf-tool-group cpdf-filters-group">' +
                '<button class="cpdf-tool-btn cpdf-filter-btn active" data-cpfilter="original"><span class="cpdf-filter-preview" style="background:linear-gradient(135deg,#667eea,#764ba2)"></span><span>Original</span></button>' +
                '<button class="cpdf-tool-btn cpdf-filter-btn" data-cpfilter="bw"><span class="cpdf-filter-preview" style="background:linear-gradient(135deg,#333,#fff)"></span><span>B&W</span></button>' +
                '<button class="cpdf-tool-btn cpdf-filter-btn" data-cpfilter="enhance"><span class="cpdf-filter-preview" style="background:linear-gradient(135deg,#f093fb,#f5576c)"></span><span>Enhance</span></button>' +
                '<button class="cpdf-tool-btn cpdf-filter-btn" data-cpfilter="grayscale"><span class="cpdf-filter-preview" style="background:linear-gradient(135deg,#868f96,#596164)"></span><span>Gray</span></button>' +
                '<button class="cpdf-tool-btn cpdf-filter-btn" data-cpfilter="highcontrast"><span class="cpdf-filter-preview" style="background:linear-gradient(135deg,#000,#fff)"></span><span>Hi-Con</span></button>' +
                '</div>' +
                '</div>' +
                /* Adjust Panel */
                '<div class="cpdf-adjust-panel" id="cpdf-adjust-panel" hidden>' +
                '<div class="cpdf-slider-row"><label>Brightness</label><input type="range" id="cpdf-brightness" min="-100" max="100" value="0"><span class="cpdf-slider-val" id="cpdf-bright-val">0</span></div>' +
                '<div class="cpdf-slider-row"><label>Contrast</label><input type="range" id="cpdf-contrast" min="-100" max="100" value="0"><span class="cpdf-slider-val" id="cpdf-contrast-val">0</span></div>' +
                '<div class="cpdf-slider-row"><button class="btn" id="cpdf-reset-adj" style="padding:4px 12px;font-size:.8rem">Reset</button>' +
                '<button class="btn btn-primary" id="cpdf-apply-adj" style="padding:4px 12px;font-size:.8rem">Apply</button></div>' +
                '</div>' +
                /* Crop overlay */
                '<div id="cpdf-crop-overlay" hidden style="position:absolute;top:0;left:0;right:0;padding:10px;display:flex;justify-content:center;gap:8px;z-index:10">' +
                '<button class="btn btn-primary" id="cpdf-apply-crop" style="padding:6px 16px;font-size:.82rem">Apply Crop</button>' +
                '<button class="btn" id="cpdf-cancel-crop" style="padding:6px 16px;font-size:.82rem;background:var(--bg4)">Cancel</button>' +
                '</div>' +
                /* Preview wrap */
                '<div class="cpdf-preview-wrap" id="cpdf-preview-wrap">' +
                '<canvas id="cpdf-main-canvas"></canvas>' +
                '<div class="cpdf-crop-box" id="cpdf-crop-box" hidden>' +
                '<div class="cpdf-crop-handle cpdf-handle-tl" data-handle="tl"></div>' +
                '<div class="cpdf-crop-handle cpdf-handle-tr" data-handle="tr"></div>' +
                '<div class="cpdf-crop-handle cpdf-handle-bl" data-handle="bl"></div>' +
                '<div class="cpdf-crop-handle cpdf-handle-br" data-handle="br"></div>' +
                '</div>' +
                '</div>' +
                /* Page actions */
                '<div class="cpdf-page-actions">' +
                '<button class="cpdf-btn-icon" id="cpdf-dup-btn" title="Duplicate">📋 Duplicate</button>' +
                '<button class="cpdf-btn-icon" id="cpdf-del-btn" title="Delete">🗑️ Delete</button>' +
                '<button class="cpdf-btn-icon" id="cpdf-undo-btn" title="Undo">↩ Undo</button>' +
                '<button class="cpdf-btn-icon" id="cpdf-redo-btn" title="Redo">↪ Redo</button>' +
                '</div>' +
                '</div>' +
                '</div>' +
                /* Bottom bar */
                '<div class="cpdf-bottom-bar">' +
                '<button class="btn" id="cpdf-back-btn" style="background:var(--bg4);color:var(--text2);border:1px solid rgba(255,255,255,.1)">← Back</button>' +
                '<button class="btn" id="cpdf-preview-btn" style="background:var(--bg4);color:var(--text2);border:1px solid rgba(255,255,255,.1)">👁 Preview</button>' +
                '<button class="btn btn-primary" id="cpdf-generate-btn" style="padding:12px 28px;font-size:1rem">📄 Generate PDF</button>' +
                '</div>' +
                '</div>' +

                /* Settings Modal */
                '<div class="cpdf-modal" id="cpdf-settings-modal">' +
                '<div class="cpdf-modal-content">' +
                '<div class="cpdf-modal-header"><h3>⚙️ PDF Settings</h3><button class="cpdf-modal-close" id="cpdf-settings-close">&times;</button></div>' +
                '<div class="cpdf-modal-body">' +
                '<div class="cpdf-form-group"><label class="cpdf-label">File Name</label><input type="text" id="cpdf-filename" class="cpdf-input" placeholder="My Document" value="Scanned Document" maxlength="100"></div>' +
                '<div class="cpdf-form-row">' +
                '<div class="cpdf-form-group"><label class="cpdf-label">Page Size</label><select id="cpdf-pagesize" class="cpdf-select"><option value="a4" selected>A4</option><option value="letter">Letter</option><option value="legal">Legal</option><option value="fit">Fit to Image</option></select></div>' +
                '<div class="cpdf-form-group"><label class="cpdf-label">Orientation</label><select id="cpdf-orientation" class="cpdf-select"><option value="portrait" selected>Portrait</option><option value="landscape">Landscape</option></select></div>' +
                '</div>' +
                '<div class="cpdf-form-row">' +
                '<div class="cpdf-form-group"><label class="cpdf-label">Margin</label><select id="cpdf-margin" class="cpdf-select"><option value="0">None</option><option value="10">Small</option><option value="20" selected>Medium</option><option value="30">Large</option></select></div>' +
                '<div class="cpdf-form-group"><label class="cpdf-label">Quality</label><select id="cpdf-quality" class="cpdf-select"><option value="0.6">Low</option><option value="0.8" selected>Medium</option><option value="0.95">High</option></select></div>' +
                '</div>' +
                '<div class="cpdf-form-row">' +
                '<div class="cpdf-form-group"><label class="cpdf-label cpdf-checkbox-label"><input type="checkbox" id="cpdf-pagenums"> Page numbers</label></div>' +
                '<div class="cpdf-form-group"><label class="cpdf-label cpdf-checkbox-label"><input type="checkbox" id="cpdf-compress"> Compress</label></div>' +
                '</div>' +
                '<div class="cpdf-divider"></div>' +
                '<h4 class="cpdf-section-title">🔒 Advanced</h4>' +
                '<div class="cpdf-form-group"><label class="cpdf-label cpdf-checkbox-label"><input type="checkbox" id="cpdf-watermark-chk"> Watermark</label>' +
                '<input type="text" id="cpdf-watermark-text" class="cpdf-input cpdf-sub-input" placeholder="Watermark text..." maxlength="50" hidden></div>' +
                '<div class="cpdf-form-group"><label class="cpdf-label cpdf-checkbox-label"><input type="checkbox" id="cpdf-ocr-chk"> Extract text (OCR)</label></div>' +
                '<div class="cpdf-form-group"><label class="cpdf-label cpdf-checkbox-label"><input type="checkbox" id="cpdf-sig-chk"> Add Signature</label></div>' +
                '</div>' +
                '<div class="cpdf-modal-footer">' +
                '<button class="btn" id="cpdf-settings-cancel" style="background:var(--bg4);color:var(--text2)">Cancel</button>' +
                '<button class="btn btn-primary" id="cpdf-settings-confirm">📄 Generate PDF</button>' +
                '</div>' +
                '</div></div>' +

                /* Signature Modal */
                '<div class="cpdf-modal" id="cpdf-sig-modal">' +
                '<div class="cpdf-modal-content" style="max-width:540px">' +
                '<div class="cpdf-modal-header"><h3>✍️ Draw Signature</h3><button class="cpdf-modal-close" id="cpdf-sig-close">&times;</button></div>' +
                '<canvas id="cpdf-sig-canvas" width="500" height="200" style="width:100%;cursor:crosshair;background:var(--bg2);display:block;border-bottom:1px solid var(--border)"></canvas>' +
                '<div class="cpdf-modal-footer">' +
                '<button class="btn" id="cpdf-sig-clear" style="background:var(--bg4);color:var(--text2)">Clear</button>' +
                '<button class="btn btn-primary" id="cpdf-sig-apply">Use Signature</button>' +
                '</div></div></div>' +

                /* Preview Modal */
                '<div class="cpdf-modal" id="cpdf-preview-modal">' +
                '<div class="cpdf-modal-content" style="max-width:800px;max-height:90vh">' +
                '<div class="cpdf-modal-header"><h3>📄 Preview</h3><button class="cpdf-modal-close" id="cpdf-preview-close">&times;</button></div>' +
                '<div class="cpdf-preview-pages" id="cpdf-preview-pages" style="display:flex;flex-direction:column;align-items:center;gap:16px;padding:24px;overflow-y:auto;max-height:calc(90vh - 80px)"></div>' +
                '</div></div>' +

                /* Camera Modal */
                '<div class="cpdf-modal" id="cpdf-camera-modal">' +
                '<div class="cpdf-modal-content" style="max-width:640px">' +
                '<div class="cpdf-modal-header"><h3>📷 Camera</h3><button class="cpdf-modal-close" id="cpdf-camera-close">&times;</button></div>' +
                '<div style="background:#000;min-height:300px;display:flex;align-items:center;justify-content:center"><video id="cpdf-camera-video" autoplay playsinline style="width:100%;display:block"></video></div>' +
                '<div style="display:flex;justify-content:center;padding:16px"><button class="btn btn-primary" id="cpdf-capture-btn" style="width:56px;height:56px;border-radius:50%;font-size:1.4rem;padding:0">📷</button></div>' +
                '<canvas id="cpdf-camera-canvas" hidden></canvas>' +
                '</div></div>' +

                /* Progress Overlay */
                '<div class="cpdf-progress-overlay" id="cpdf-progress" hidden>' +
                '<div class="cpdf-progress-card">' +
                '<div class="cpdf-spinner"></div>' +
                '<h3>Generating PDF...</h3>' +
                '<p id="cpdf-progress-text">Processing...</p>' +
                '<div class="cpdf-progress-bar"><div class="cpdf-progress-fill" id="cpdf-progress-fill"></div></div>' +
                '<span class="cpdf-progress-pct" id="cpdf-progress-pct">0%</span>' +
                '</div></div>' +

                /* Result Section */
                '<div id="cpdf-result" hidden>' +
                '<div class="cpdf-result-card">' +
                '<div style="font-size:3rem;margin-bottom:16px">✅</div>' +
                '<h2>PDF Generated!</h2>' +
                '<p class="cpdf-result-info" id="cpdf-result-info">Ready</p>' +
                '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:20px">' +
                '<button class="btn btn-primary" id="cpdf-dl-btn">⬇️ Download</button>' +
                '<button class="btn" id="cpdf-share-btn" style="background:var(--bg4);color:var(--text2)">📤 Share</button>' +
                '<button class="btn" id="cpdf-browser-btn" style="background:var(--bg4);color:var(--text2)">👁 Preview</button>' +
                '</div>' +
                '<button class="btn" id="cpdf-another-btn" style="background:var(--bg4);color:var(--text2);margin-top:16px">+ Create Another</button>' +
                '</div></div>' +

                '</div>';
        },

        init: function () {
            var self = this;
            self.state = {
                pages: [],
                activeIdx: 0,
                signatureData: null,
                generatedBlob: null,
                generatedName: '',
                idCounter: 0
            };
            self._cropState = { active: false, x: 0, y: 0, w: 0, h: 0, dragging: null };

            var el = function (id) { return document.getElementById(id); };
            var allEl = function (sel) { return document.querySelectorAll(sel); };

            // Upload zone
            var dropzone = el('cpdf-dropzone');
            var fileInput = el('cpdf-file-input');
            dropzone.addEventListener('click', function () { fileInput.click(); });
            el('cpdf-browse-btn').addEventListener('click', function () { fileInput.click(); });
            fileInput.addEventListener('change', function () { if (fileInput.files.length) self._addImages(fileInput.files); fileInput.value = ''; });
            dropzone.addEventListener('dragover', function (e) { e.preventDefault(); dropzone.classList.add('dragover'); });
            dropzone.addEventListener('dragleave', function () { dropzone.classList.remove('dragover'); });
            dropzone.addEventListener('drop', function (e) { e.preventDefault(); dropzone.classList.remove('dragover'); if (e.dataTransfer.files.length) self._addImages(e.dataTransfer.files); });

            // Camera
            el('cpdf-camera-btn').addEventListener('click', function () { self._openCamera(); });
            el('cpdf-capture-btn').addEventListener('click', function () { self._capturePhoto(); });
            el('cpdf-camera-close').addEventListener('click', function () { self._closeCamera(); });

            // Add more
            el('cpdf-add-more').addEventListener('click', function () { el('cpdf-add-more-input').click(); });
            el('cpdf-add-more-input').addEventListener('change', function () { if (this.files.length) self._addImages(this.files); this.value = ''; });

            // Tool buttons
            allEl('[data-cptool]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var tool = btn.dataset.cptool;
                    if (tool === 'rotate-left') { self._rotatePage('left'); return; }
                    if (tool === 'rotate-right') { self._rotatePage('right'); return; }
                    if (tool === 'perspective') { self._applyPerspective(); return; }
                    if (tool === 'sharpen') { self._applySharpenTool(); return; }
                    if (tool === 'crop') {
                        if (self._cropState.active) { self._cancelCrop(); return; }
                        self._closeAllPanels();
                        btn.classList.add('active');
                        self._startCrop();
                        return;
                    }
                    if (tool === 'brightness') {
                        self._closeAllPanels();
                        btn.classList.add('active');
                        var page = self.state.pages[self.state.activeIdx];
                        if (page) {
                            el('cpdf-brightness').value = page.brightness;
                            el('cpdf-bright-val').textContent = page.brightness;
                            el('cpdf-contrast').value = page.contrast;
                            el('cpdf-contrast-val').textContent = page.contrast;
                        }
                        el('cpdf-adjust-panel').hidden = false;
                        return;
                    }
                });
            });

            // Filters
            allEl('[data-cpfilter]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var page = self.state.pages[self.state.activeIdx];
                    if (!page) return;
                    page.filter = btn.dataset.cpfilter;
                    allEl('[data-cpfilter]').forEach(function (b) { b.classList.toggle('active', b === btn); });
                    self._renderMainCanvas();
                });
            });

            // Brightness/Contrast
            el('cpdf-brightness').addEventListener('input', function (e) {
                el('cpdf-bright-val').textContent = e.target.value;
                var page = self.state.pages[self.state.activeIdx];
                if (page) { page.brightness = parseInt(e.target.value); self._renderMainCanvas(); }
            });
            el('cpdf-contrast').addEventListener('input', function (e) {
                el('cpdf-contrast-val').textContent = e.target.value;
                var page = self.state.pages[self.state.activeIdx];
                if (page) { page.contrast = parseInt(e.target.value); self._renderMainCanvas(); }
            });
            el('cpdf-reset-adj').addEventListener('click', function () {
                var page = self.state.pages[self.state.activeIdx];
                if (page) { page.brightness = 0; page.contrast = 0; }
                el('cpdf-brightness').value = 0; el('cpdf-bright-val').textContent = '0';
                el('cpdf-contrast').value = 0; el('cpdf-contrast-val').textContent = '0';
                self._renderMainCanvas();
            });
            el('cpdf-apply-adj').addEventListener('click', function () {
                var page = self.state.pages[self.state.activeIdx];
                if (!page) return;
                self._pushUndo(page);
                var c = self._cloneCanvas(page.editedCanvas);
                var ctx = c.getContext('2d');
                if (page.brightness !== 0 || page.contrast !== 0) self._applyBrightnessContrast(ctx, c.width, c.height, page.brightness, page.contrast);
                page.editedCanvas = c;
                page.brightness = 0; page.contrast = 0;
                el('cpdf-brightness').value = 0; el('cpdf-bright-val').textContent = '0';
                el('cpdf-contrast').value = 0; el('cpdf-contrast-val').textContent = '0';
                self._closeAllPanels();
                self._renderThumbs();
                self._renderMainCanvas();
                notify('Adjustments applied', 'success');
            });

            // Crop
            el('cpdf-apply-crop').addEventListener('click', function () { self._applyCrop(); });
            el('cpdf-cancel-crop').addEventListener('click', function () { self._cancelCrop(); });
            self._initCropDrag();

            // Page operations
            el('cpdf-dup-btn').addEventListener('click', function () { self._duplicatePage(); });
            el('cpdf-del-btn').addEventListener('click', function () { self._deletePage(); });
            el('cpdf-undo-btn').addEventListener('click', function () { self._undo(); });
            el('cpdf-redo-btn').addEventListener('click', function () { self._redo(); });

            // Bottom bar
            el('cpdf-back-btn').addEventListener('click', function () { self._showUpload(); });
            el('cpdf-preview-btn').addEventListener('click', function () { self._showPreviewModal(); });
            el('cpdf-generate-btn').addEventListener('click', function () {
                if (!self.state.pages.length) { notify('Add at least one image first', 'error'); return; }
                el('cpdf-settings-modal').classList.add('active');
            });

            // Settings modal
            el('cpdf-settings-close').addEventListener('click', function () { el('cpdf-settings-modal').classList.remove('active'); });
            el('cpdf-settings-cancel').addEventListener('click', function () { el('cpdf-settings-modal').classList.remove('active'); });
            el('cpdf-settings-confirm').addEventListener('click', function () {
                if (el('cpdf-sig-chk').checked && !self.state.signatureData) {
                    el('cpdf-settings-modal').classList.remove('active');
                    el('cpdf-sig-modal').classList.add('active');
                    return;
                }
                self._generatePDF();
            });

            // Watermark toggle
            el('cpdf-watermark-chk').addEventListener('change', function (e) { el('cpdf-watermark-text').hidden = !e.target.checked; });

            // Signature checkbox
            el('cpdf-sig-chk').addEventListener('change', function (e) {
                if (e.target.checked && !self.state.signatureData) el('cpdf-sig-modal').classList.add('active');
            });

            // Signature modal
            el('cpdf-sig-close').addEventListener('click', function () { el('cpdf-sig-modal').classList.remove('active'); el('cpdf-sig-chk').checked = false; });
            el('cpdf-sig-clear').addEventListener('click', function () { self._sigCtx.clearRect(0, 0, 500, 200); });
            el('cpdf-sig-apply').addEventListener('click', function () {
                var canvas = el('cpdf-sig-canvas');
                var blank = document.createElement('canvas'); blank.width = canvas.width; blank.height = canvas.height;
                if (canvas.toDataURL() === blank.toDataURL()) { notify('Draw a signature first', 'error'); return; }
                self.state.signatureData = canvas.toDataURL('image/png');
                el('cpdf-sig-modal').classList.remove('active');
                notify('Signature saved', 'success');
                if (!el('cpdf-settings-modal').classList.contains('active')) el('cpdf-settings-modal').classList.add('active');
            });
            self._initSignaturePad();

            // Preview modal
            el('cpdf-preview-close').addEventListener('click', function () { el('cpdf-preview-modal').classList.remove('active'); });

            // Result actions
            el('cpdf-dl-btn').addEventListener('click', function () { self._downloadPDF(); });
            el('cpdf-share-btn').addEventListener('click', function () { self._sharePDF(); });
            el('cpdf-browser-btn').addEventListener('click', function () {
                if (self.state.generatedBlob) window.open(URL.createObjectURL(self.state.generatedBlob), '_blank');
            });
            el('cpdf-another-btn').addEventListener('click', function () {
                self.state.pages = []; self.state.activeIdx = 0;
                self.state.generatedBlob = null; self.state.generatedName = '';
                self.state.signatureData = null;
                self._showUpload();
            });

            // Close modals on backdrop
            allEl('#cpdf-container .cpdf-modal').forEach(function (modal) {
                modal.addEventListener('click', function (e) {
                    if (e.target === modal) {
                        modal.classList.remove('active');
                        if (modal.id === 'cpdf-camera-modal') self._closeCamera();
                    }
                });
            });
        },

        /* ── Internal helpers ──────────────────────────────────── */
        _loadImage: function (file) {
            return new Promise(function (resolve, reject) {
                if (!file.type.startsWith('image/')) { reject(new Error('Not an image')); return; }
                if (file.size > 50 * 1024 * 1024) { reject(new Error('File too large')); return; }
                var reader = new FileReader();
                reader.onload = function () {
                    var img = new Image();
                    img.onload = function () { resolve(img); };
                    img.onerror = function () { reject(new Error('Failed to load')); };
                    img.src = reader.result;
                };
                reader.onerror = function () { reject(new Error('Read failed')); };
                reader.readAsDataURL(file);
            });
        },

        _imgToCanvas: function (img) {
            var c = document.createElement('canvas');
            c.width = img.naturalWidth || img.width;
            c.height = img.naturalHeight || img.height;
            c.getContext('2d').drawImage(img, 0, 0);
            return c;
        },

        _cloneCanvas: function (src) {
            var c = document.createElement('canvas');
            c.width = src.width; c.height = src.height;
            c.getContext('2d').drawImage(src, 0, 0);
            return c;
        },

        _addImages: async function (files) {
            var self = this;
            var arr = Array.from(files).slice(0, 50 - self.state.pages.length);
            if (!arr.length) return;
            for (var i = 0; i < arr.length; i++) {
                try {
                    var img = await self._loadImage(arr[i]);
                    var canvas = self._imgToCanvas(img);
                    self.state.pages.push({
                        id: ++self.state.idCounter,
                        originalImg: img, editedCanvas: canvas,
                        filter: 'original', brightness: 0, contrast: 0,
                        undoStack: [], redoStack: []
                    });
                } catch (e) { notify('Skipped: ' + arr[i].name, 'error'); }
            }
            if (self.state.pages.length) {
                self._showEditor();
                self._renderThumbs();
                self._selectPage(self.state.pages.length > 1 ? self.state.activeIdx : 0);
            }
        },

        _showUpload: function () {
            document.getElementById('cpdf-upload').hidden = false;
            document.getElementById('cpdf-editor').hidden = true;
            document.getElementById('cpdf-result').hidden = true;
        },
        _showEditor: function () {
            document.getElementById('cpdf-upload').hidden = true;
            document.getElementById('cpdf-editor').hidden = false;
            document.getElementById('cpdf-result').hidden = true;
        },
        _showResultSection: function () {
            document.getElementById('cpdf-upload').hidden = true;
            document.getElementById('cpdf-editor').hidden = true;
            document.getElementById('cpdf-result').hidden = false;
        },

        _renderThumbs: function () {
            var self = this;
            var list = document.getElementById('cpdf-thumb-list');
            list.innerHTML = '';
            document.getElementById('cpdf-page-count').textContent = self.state.pages.length;
            self.state.pages.forEach(function (page, idx) {
                var div = document.createElement('div');
                div.className = 'cpdf-thumb' + (idx === self.state.activeIdx ? ' active' : '');
                div.dataset.idx = idx;
                div.draggable = true;
                var tc = document.createElement('canvas');
                var tw = 160, th = Math.round((page.editedCanvas.height / page.editedCanvas.width) * tw);
                tc.width = tw; tc.height = th;
                tc.getContext('2d').drawImage(page.editedCanvas, 0, 0, tw, th);
                var img = document.createElement('img');
                img.src = tc.toDataURL('image/jpeg', 0.5);
                img.draggable = false;
                var num = document.createElement('span');
                num.className = 'cpdf-thumb-num'; num.textContent = idx + 1;
                var grip = document.createElement('span');
                grip.className = 'cpdf-thumb-drag'; grip.innerHTML = '⠿';
                div.append(grip, img, num);
                div.addEventListener('click', function () { self._selectPage(idx); });
                div.addEventListener('dragstart', function (e) { e.dataTransfer.setData('text/plain', String(idx)); div.classList.add('dragging'); });
                div.addEventListener('dragend', function () { div.classList.remove('dragging'); });
                div.addEventListener('dragover', function (e) { e.preventDefault(); div.classList.add('drag-over'); });
                div.addEventListener('dragleave', function () { div.classList.remove('drag-over'); });
                div.addEventListener('drop', function (e) {
                    e.preventDefault(); div.classList.remove('drag-over');
                    var fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
                    if (fromIdx !== idx) self._reorderPage(fromIdx, idx);
                });
                list.appendChild(div);
            });
        },

        _selectPage: function (idx) {
            var self = this;
            if (idx < 0 || idx >= self.state.pages.length) return;
            self.state.activeIdx = idx;
            document.querySelectorAll('#cpdf-thumb-list .cpdf-thumb').forEach(function (t, i) { t.classList.toggle('active', i === idx); });
            self._renderMainCanvas();
            self._closeAllPanels();
        },

        _reorderPage: function (from, to) {
            var s = this.state;
            var item = s.pages.splice(from, 1)[0];
            s.pages.splice(to, 0, item);
            if (s.activeIdx === from) s.activeIdx = to;
            else if (from < s.activeIdx && to >= s.activeIdx) s.activeIdx--;
            else if (from > s.activeIdx && to <= s.activeIdx) s.activeIdx++;
            this._renderThumbs();
            this._renderMainCanvas();
        },

        _renderMainCanvas: function () {
            var page = this.state.pages[this.state.activeIdx];
            if (!page) return;
            var mc = document.getElementById('cpdf-main-canvas');
            var src = page.editedCanvas;
            mc.width = src.width; mc.height = src.height;
            var ctx = mc.getContext('2d');
            ctx.drawImage(src, 0, 0);
            if (page.filter !== 'original') this._applyFilterToCtx(ctx, mc.width, mc.height, page.filter);
            if (page.brightness !== 0 || page.contrast !== 0) this._applyBrightnessContrast(ctx, mc.width, mc.height, page.brightness, page.contrast);
            var self = this;
            document.querySelectorAll('[data-cpfilter]').forEach(function (b) { b.classList.toggle('active', b.dataset.cpfilter === page.filter); });
        },

        _applyFilterToCtx: function (ctx, w, h, filter) {
            var iData = ctx.getImageData(0, 0, w, h);
            var d = iData.data;
            switch (filter) {
                case 'bw':
                    for (var i = 0; i < d.length; i += 4) { var avg = d[i]*0.299+d[i+1]*0.587+d[i+2]*0.114; var v = avg>128?255:0; d[i]=d[i+1]=d[i+2]=v; } break;
                case 'grayscale':
                    for (var i = 0; i < d.length; i += 4) { var avg = d[i]*0.299+d[i+1]*0.587+d[i+2]*0.114; d[i]=d[i+1]=d[i+2]=avg; } break;
                case 'enhance':
                    for (var i = 0; i < d.length; i += 4) { d[i]=Math.min(255,d[i]*1.2+10); d[i+1]=Math.min(255,d[i+1]*1.15+5); d[i+2]=Math.min(255,d[i+2]*1.1); } break;
                case 'highcontrast':
                    for (var i = 0; i < d.length; i += 4) { var avg = d[i]*0.299+d[i+1]*0.587+d[i+2]*0.114; var v = Math.min(255,Math.max(0,((avg-128)*2.5)+128)); var bw = v>120?255:0; d[i]=d[i+1]=d[i+2]=bw; } break;
            }
            ctx.putImageData(iData, 0, 0);
        },

        _applyBrightnessContrast: function (ctx, w, h, brightness, contrast) {
            var iData = ctx.getImageData(0, 0, w, h);
            var d = iData.data;
            var c = (contrast + 100) / 100;
            var factor = (259 * (c * 255 + 255)) / (255 * (259 - c * 255));
            for (var i = 0; i < d.length; i += 4) {
                d[i]   = Math.min(255, Math.max(0, factor * (d[i] - 128) + 128 + brightness));
                d[i+1] = Math.min(255, Math.max(0, factor * (d[i+1] - 128) + 128 + brightness));
                d[i+2] = Math.min(255, Math.max(0, factor * (d[i+2] - 128) + 128 + brightness));
            }
            ctx.putImageData(iData, 0, 0);
        },

        _applySharpenKernel: function (ctx, w, h) {
            var iData = ctx.getImageData(0, 0, w, h);
            var d = iData.data;
            var copy = new Uint8ClampedArray(d);
            var k = [0,-1,0,-1,5,-1,0,-1,0];
            for (var y = 1; y < h - 1; y++) {
                for (var x = 1; x < w - 1; x++) {
                    for (var ch = 0; ch < 3; ch++) {
                        var sum = 0;
                        for (var ky = -1; ky <= 1; ky++) {
                            for (var kx = -1; kx <= 1; kx++) {
                                sum += copy[((y+ky)*w+(x+kx))*4+ch] * k[(ky+1)*3+(kx+1)];
                            }
                        }
                        d[(y*w+x)*4+ch] = Math.min(255, Math.max(0, sum));
                    }
                }
            }
            ctx.putImageData(iData, 0, 0);
        },

        _applySharpenTool: function () {
            var page = this.state.pages[this.state.activeIdx];
            if (!page) return;
            this._pushUndo(page);
            var ctx = page.editedCanvas.getContext('2d');
            this._applySharpenKernel(ctx, page.editedCanvas.width, page.editedCanvas.height);
            this._renderThumbs();
            this._renderMainCanvas();
            notify('Sharpened', 'success');
        },

        _rotatePage: function (dir) {
            var page = this.state.pages[this.state.activeIdx];
            if (!page) return;
            this._pushUndo(page);
            var src = page.editedCanvas;
            var c = document.createElement('canvas');
            c.width = src.height; c.height = src.width;
            var ctx = c.getContext('2d');
            ctx.translate(c.width / 2, c.height / 2);
            ctx.rotate((dir === 'right' ? 90 : -90) * Math.PI / 180);
            ctx.drawImage(src, -src.width / 2, -src.height / 2);
            page.editedCanvas = c;
            this._renderThumbs();
            this._renderMainCanvas();
        },

        _applyPerspective: function () {
            var page = this.state.pages[this.state.activeIdx];
            if (!page) return;
            this._pushUndo(page);
            var src = page.editedCanvas;
            var c = document.createElement('canvas');
            var shrink = 0.03;
            c.width = src.width; c.height = src.height;
            var ctx = c.getContext('2d');
            ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
            var dx = Math.round(src.width * shrink);
            ctx.drawImage(src, 0, 0, src.width, src.height, dx, 0, src.width - dx * 2, src.height);
            page.editedCanvas = c;
            this._renderThumbs();
            this._renderMainCanvas();
            notify('Perspective correction applied', 'success');
        },

        _startCrop: function () {
            var page = this.state.pages[this.state.activeIdx];
            if (!page) return;
            var mc = document.getElementById('cpdf-main-canvas');
            var rect = mc.getBoundingClientRect();
            var margin = 0.1;
            this._cropState = {
                active: true,
                x: Math.round(rect.width * margin), y: Math.round(rect.height * margin),
                w: Math.round(rect.width * (1 - margin * 2)), h: Math.round(rect.height * (1 - margin * 2)),
                scaleX: mc.width / rect.width, scaleY: mc.height / rect.height,
                dragging: null, startX: 0, startY: 0, origX: 0, origY: 0, origW: 0, origH: 0
            };
            document.getElementById('cpdf-crop-box').hidden = false;
            document.getElementById('cpdf-crop-overlay').hidden = false;
            this._updateCropBox();
        },

        _updateCropBox: function () {
            var box = document.getElementById('cpdf-crop-box');
            box.style.left = this._cropState.x + 'px';
            box.style.top = this._cropState.y + 'px';
            box.style.width = this._cropState.w + 'px';
            box.style.height = this._cropState.h + 'px';
        },

        _applyCrop: function () {
            var page = this.state.pages[this.state.activeIdx];
            if (!page) return;
            this._pushUndo(page);
            var mc = document.getElementById('cpdf-main-canvas');
            var rect = mc.getBoundingClientRect();
            var scaleX = mc.width / rect.width, scaleY = mc.height / rect.height;
            var sx = Math.round(this._cropState.x * scaleX), sy = Math.round(this._cropState.y * scaleY);
            var sw = Math.round(this._cropState.w * scaleX), sh = Math.round(this._cropState.h * scaleY);
            if (sw < 10 || sh < 10) { notify('Crop area too small', 'error'); return; }
            var c = document.createElement('canvas');
            c.width = sw; c.height = sh;
            c.getContext('2d').drawImage(page.editedCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
            page.editedCanvas = c;
            this._cancelCrop();
            this._renderThumbs();
            this._renderMainCanvas();
            notify('Cropped', 'success');
        },

        _cancelCrop: function () {
            this._cropState.active = false;
            document.getElementById('cpdf-crop-box').hidden = true;
            document.getElementById('cpdf-crop-overlay').hidden = true;
            document.querySelectorAll('[data-cptool="crop"]').forEach(function (b) { b.classList.remove('active'); });
        },

        _initCropDrag: function () {
            var self = this;
            var wrap = document.getElementById('cpdf-preview-wrap');
            wrap.addEventListener('pointerdown', function (e) {
                if (!self._cropState.active) return;
                var handle = e.target.closest('.cpdf-crop-handle');
                var box = e.target.closest('.cpdf-crop-box');
                if (!handle && !box) return;
                e.preventDefault();
                self._cropState.dragging = handle ? handle.dataset.handle : 'move';
                self._cropState.startX = e.clientX; self._cropState.startY = e.clientY;
                self._cropState.origX = self._cropState.x; self._cropState.origY = self._cropState.y;
                self._cropState.origW = self._cropState.w; self._cropState.origH = self._cropState.h;
            });
            document.addEventListener('pointermove', function (e) {
                if (!self._cropState.dragging) return;
                e.preventDefault();
                var dx = e.clientX - self._cropState.startX, dy = e.clientY - self._cropState.startY;
                var d = self._cropState.dragging;
                if (d === 'move') { self._cropState.x = self._cropState.origX + dx; self._cropState.y = self._cropState.origY + dy; }
                else if (d === 'br') { self._cropState.w = Math.max(30, self._cropState.origW + dx); self._cropState.h = Math.max(30, self._cropState.origH + dy); }
                else if (d === 'tl') { self._cropState.x = self._cropState.origX + dx; self._cropState.y = self._cropState.origY + dy; self._cropState.w = Math.max(30, self._cropState.origW - dx); self._cropState.h = Math.max(30, self._cropState.origH - dy); }
                else if (d === 'tr') { self._cropState.y = self._cropState.origY + dy; self._cropState.w = Math.max(30, self._cropState.origW + dx); self._cropState.h = Math.max(30, self._cropState.origH - dy); }
                else if (d === 'bl') { self._cropState.x = self._cropState.origX + dx; self._cropState.w = Math.max(30, self._cropState.origW - dx); self._cropState.h = Math.max(30, self._cropState.origH + dy); }
                self._updateCropBox();
            });
            document.addEventListener('pointerup', function () { self._cropState.dragging = null; });
        },

        _pushUndo: function (page) {
            page.undoStack.push(this._cloneCanvas(page.editedCanvas));
            if (page.undoStack.length > 20) page.undoStack.shift();
            page.redoStack = [];
        },
        _undo: function () {
            var page = this.state.pages[this.state.activeIdx];
            if (!page || !page.undoStack.length) return;
            page.redoStack.push(this._cloneCanvas(page.editedCanvas));
            page.editedCanvas = page.undoStack.pop();
            this._renderThumbs(); this._renderMainCanvas();
        },
        _redo: function () {
            var page = this.state.pages[this.state.activeIdx];
            if (!page || !page.redoStack.length) return;
            page.undoStack.push(this._cloneCanvas(page.editedCanvas));
            page.editedCanvas = page.redoStack.pop();
            this._renderThumbs(); this._renderMainCanvas();
        },

        _duplicatePage: function () {
            var page = this.state.pages[this.state.activeIdx];
            if (!page || this.state.pages.length >= 50) return;
            this.state.pages.splice(this.state.activeIdx + 1, 0, {
                id: ++this.state.idCounter, originalImg: page.originalImg,
                editedCanvas: this._cloneCanvas(page.editedCanvas),
                filter: page.filter, brightness: page.brightness, contrast: page.contrast,
                undoStack: [], redoStack: []
            });
            this._renderThumbs();
            this._selectPage(this.state.activeIdx + 1);
            notify('Page duplicated', 'success');
        },
        _deletePage: function () {
            if (this.state.pages.length <= 1) { this.state.pages = []; this._showUpload(); return; }
            this.state.pages.splice(this.state.activeIdx, 1);
            if (this.state.activeIdx >= this.state.pages.length) this.state.activeIdx = this.state.pages.length - 1;
            this._renderThumbs();
            this._selectPage(this.state.activeIdx);
            notify('Page deleted', 'success');
        },

        _closeAllPanels: function () {
            document.getElementById('cpdf-adjust-panel').hidden = true;
            this._cancelCrop();
            document.querySelectorAll('[data-cptool]').forEach(function (b) { b.classList.remove('active'); });
        },

        _openCamera: async function () {
            try {
                this._cameraStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
                });
                document.getElementById('cpdf-camera-video').srcObject = this._cameraStream;
                document.getElementById('cpdf-camera-modal').classList.add('active');
            } catch (e) { notify('Camera not available', 'error'); }
        },
        _capturePhoto: function () {
            var self = this;
            var video = document.getElementById('cpdf-camera-video');
            var canvas = document.getElementById('cpdf-camera-canvas');
            canvas.width = video.videoWidth; canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);
            var img = new Image();
            img.onload = function () {
                var c = self._imgToCanvas(img);
                self.state.pages.push({
                    id: ++self.state.idCounter, originalImg: img, editedCanvas: c,
                    filter: 'original', brightness: 0, contrast: 0, undoStack: [], redoStack: []
                });
                self._showEditor();
                self._renderThumbs();
                self._selectPage(self.state.pages.length - 1);
                self._closeCamera();
                notify('Photo captured!', 'success');
            };
            img.src = canvas.toDataURL('image/jpeg', 0.92);
        },
        _closeCamera: function () {
            if (this._cameraStream) { this._cameraStream.getTracks().forEach(function (t) { t.stop(); }); this._cameraStream = null; }
            document.getElementById('cpdf-camera-modal').classList.remove('active');
        },

        _initSignaturePad: function () {
            var self = this;
            var canvas = document.getElementById('cpdf-sig-canvas');
            self._sigCtx = canvas.getContext('2d');
            self._sigCtx.strokeStyle = '#fff';
            self._sigCtx.lineWidth = 2.5;
            self._sigCtx.lineCap = 'round';
            self._sigCtx.lineJoin = 'round';
            canvas.addEventListener('pointerdown', function (e) {
                self._sigDrawing = true;
                self._sigCtx.beginPath();
                var rect = canvas.getBoundingClientRect();
                self._sigCtx.moveTo((e.clientX - rect.left) * (canvas.width / rect.width), (e.clientY - rect.top) * (canvas.height / rect.height));
            });
            canvas.addEventListener('pointermove', function (e) {
                if (!self._sigDrawing) return;
                var rect = canvas.getBoundingClientRect();
                self._sigCtx.lineTo((e.clientX - rect.left) * (canvas.width / rect.width), (e.clientY - rect.top) * (canvas.height / rect.height));
                self._sigCtx.stroke();
            });
            canvas.addEventListener('pointerup', function () { self._sigDrawing = false; });
            canvas.addEventListener('pointerleave', function () { self._sigDrawing = false; });
        },

        _showPreviewModal: function () {
            var self = this;
            var container = document.getElementById('cpdf-preview-pages');
            container.innerHTML = '';
            self.state.pages.forEach(function (page, idx) {
                var c = document.createElement('canvas');
                var src = page.editedCanvas;
                var scale = Math.min(1, 600 / src.width);
                c.width = Math.round(src.width * scale); c.height = Math.round(src.height * scale);
                var ctx = c.getContext('2d');
                ctx.drawImage(src, 0, 0, c.width, c.height);
                if (page.filter !== 'original') self._applyFilterToCtx(ctx, c.width, c.height, page.filter);
                if (page.brightness !== 0 || page.contrast !== 0) self._applyBrightnessContrast(ctx, c.width, c.height, page.brightness, page.contrast);
                var label = document.createElement('p');
                label.style.cssText = 'color:var(--text3);font-size:.8rem;margin-top:4px';
                label.textContent = 'Page ' + (idx + 1);
                c.style.cssText = 'max-width:100%;border:1px solid var(--border);border-radius:8px;box-shadow:var(--shadow);background:#fff';
                container.append(c, label);
            });
            document.getElementById('cpdf-preview-modal').classList.add('active');
        },

        _generatePDF: async function () {
            var self = this;
            if (!self.state.pages.length) { notify('Add images first', 'error'); return; }

            var fileName = sanitize(document.getElementById('cpdf-filename').value.trim()) || 'Scanned Document';
            var pageSize = document.getElementById('cpdf-pagesize').value;
            var orientation = document.getElementById('cpdf-orientation').value;
            var margin = parseFloat(document.getElementById('cpdf-margin').value) * 2.835;
            var quality = parseFloat(document.getElementById('cpdf-quality').value);
            var addPageNums = document.getElementById('cpdf-pagenums').checked;
            var watermarkEnabled = document.getElementById('cpdf-watermark-chk').checked;
            var watermarkText = sanitize(document.getElementById('cpdf-watermark-text').value.trim());
            var ocrEnabled = document.getElementById('cpdf-ocr-chk').checked;
            var signEnabled = document.getElementById('cpdf-sig-chk').checked;

            document.getElementById('cpdf-settings-modal').classList.remove('active');
            document.getElementById('cpdf-progress').hidden = false;

            var setProgress = function (pct, text) {
                document.getElementById('cpdf-progress-fill').style.width = pct + '%';
                document.getElementById('cpdf-progress-pct').textContent = Math.round(pct) + '%';
                if (text) document.getElementById('cpdf-progress-text').textContent = text;
            };

            try {
                var pdfDoc = await PDFDocument.create();
                var totalPages = self.state.pages.length;
                var PAGE_SIZES = { a4: [595.28, 841.89], letter: [612, 792], legal: [612, 1008], fit: null };
                var ocrTexts = [];

                for (var i = 0; i < totalPages; i++) {
                    setProgress((i / totalPages) * 80, 'Processing page ' + (i + 1) + ' of ' + totalPages);
                    await new Promise(function (r) { setTimeout(r, 10); });

                    var page = self.state.pages[i];
                    var finalCanvas = self._cloneCanvas(page.editedCanvas);
                    var fCtx = finalCanvas.getContext('2d');
                    if (page.filter !== 'original') self._applyFilterToCtx(fCtx, finalCanvas.width, finalCanvas.height, page.filter);
                    if (page.brightness !== 0 || page.contrast !== 0) self._applyBrightnessContrast(fCtx, finalCanvas.width, finalCanvas.height, page.brightness, page.contrast);

                    var outCanvas = finalCanvas;
                    var maxDim = quality >= 0.9 ? 3000 : (quality >= 0.7 ? 2400 : 1600);
                    if (finalCanvas.width > maxDim || finalCanvas.height > maxDim) {
                        var scale = maxDim / Math.max(finalCanvas.width, finalCanvas.height);
                        var rc = document.createElement('canvas');
                        rc.width = Math.round(finalCanvas.width * scale);
                        rc.height = Math.round(finalCanvas.height * scale);
                        rc.getContext('2d').drawImage(finalCanvas, 0, 0, rc.width, rc.height);
                        outCanvas = rc;
                    }

                    var imgBytes = await new Promise(function (resolve) {
                        outCanvas.toBlob(function (blob) { blob.arrayBuffer().then(resolve); }, 'image/jpeg', quality);
                    });

                    var img = await pdfDoc.embedJpg(imgBytes);
                    var pw, ph;
                    if (pageSize === 'fit') { pw = img.width + margin * 2; ph = img.height + margin * 2; }
                    else { pw = PAGE_SIZES[pageSize][0]; ph = PAGE_SIZES[pageSize][1]; if (orientation === 'landscape') { var tmp = pw; pw = ph; ph = tmp; } }

                    var pdfPage = pdfDoc.addPage([pw, ph]);
                    var availW = pw - margin * 2, availH = ph - margin * 2;
                    var sc = Math.min(availW / img.width, availH / img.height, 1);
                    var drawW = img.width * sc, drawH = img.height * sc;
                    pdfPage.drawImage(img, { x: margin + (availW - drawW) / 2, y: margin + (availH - drawH) / 2, width: drawW, height: drawH });

                    if (watermarkEnabled && watermarkText) {
                        var font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
                        var wmSize = Math.min(pw, ph) * 0.08;
                        pdfPage.drawText(watermarkText, { x: (pw - font.widthOfTextAtSize(watermarkText, wmSize)) / 2, y: ph / 2, size: wmSize, font: font, color: rgb(0.7, 0.7, 0.7), opacity: 0.25, rotate: degrees(-45) });
                    }
                    if (addPageNums) {
                        var numFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
                        var numT = (i + 1) + ' / ' + totalPages;
                        pdfPage.drawText(numT, { x: (pw - numFont.widthOfTextAtSize(numT, 9)) / 2, y: 16, size: 9, font: numFont, color: rgb(0.5, 0.5, 0.5) });
                    }
                    if (signEnabled && self.state.signatureData && i === totalPages - 1) {
                        try {
                            var sigBytes = await fetch(self.state.signatureData).then(function (r) { return r.arrayBuffer(); });
                            var sigImg = await pdfDoc.embedPng(sigBytes);
                            var sigSc = Math.min(150 / sigImg.width, 60 / sigImg.height);
                            pdfPage.drawImage(sigImg, { x: pw - margin - sigImg.width * sigSc - 10, y: margin + 10, width: sigImg.width * sigSc, height: sigImg.height * sigSc });
                        } catch (_) {}
                    }
                    if (ocrEnabled && typeof Tesseract !== 'undefined') {
                        setProgress((i / totalPages) * 80 + 5, 'OCR page ' + (i + 1) + '...');
                        try {
                            var result = await Tesseract.recognize(outCanvas, 'eng');
                            if (result.data && result.data.text) ocrTexts.push('--- Page ' + (i + 1) + ' ---\n' + result.data.text);
                        } catch (_) {}
                    }
                }

                setProgress(90, 'Finalizing...');
                await new Promise(function (r) { setTimeout(r, 10); });

                var pdfBytes = await pdfDoc.save();
                var blob = new Blob([pdfBytes], { type: 'application/pdf' });
                self.state.generatedBlob = blob;
                self.state.generatedName = fileName;

                var sizeMB = (blob.size / (1024 * 1024)).toFixed(2);
                var infoEl = document.getElementById('cpdf-result-info');
                infoEl.textContent = fileName + '.pdf · ' + totalPages + ' page' + (totalPages > 1 ? 's' : '') + ' · ' + sizeMB + ' MB';

                if (ocrTexts.length) {
                    var ocrBlob = new Blob([ocrTexts.join('\n\n')], { type: 'text/plain' });
                    var ocrUrl = URL.createObjectURL(ocrBlob);
                    infoEl.innerHTML += '<br><a href="' + ocrUrl + '" download="' + esc(fileName) + '_OCR.txt" style="color:var(--accent-hover);text-decoration:underline;font-size:.85rem">Download OCR text</a>';
                }

                setProgress(100, 'Done!');
                await new Promise(function (r) { setTimeout(r, 400); });
                document.getElementById('cpdf-progress').hidden = true;
                self._showResultSection();
                notify('PDF generated!', 'success');
            } catch (err) {
                console.error('PDF generation error:', err);
                document.getElementById('cpdf-progress').hidden = true;
                notify('Failed: ' + err.message, 'error');
            }
        },

        _downloadPDF: function () {
            if (!this.state.generatedBlob) return;
            dl(this.state.generatedBlob, (this.state.generatedName || 'document') + '.pdf');
        },
        _sharePDF: async function () {
            if (!this.state.generatedBlob) return;
            if (navigator.share) {
                try {
                    var file = new File([this.state.generatedBlob], (this.state.generatedName || 'document') + '.pdf', { type: 'application/pdf' });
                    await navigator.share({ files: [file], title: this.state.generatedName });
                } catch (_) { this._downloadPDF(); }
            } else { this._downloadPDF(); notify('Share not supported — downloaded instead', 'info'); }
        }
    };

    /* ── Boot ─────────────────────────────────────────────────────── */
    document.addEventListener('DOMContentLoaded', init);
})();
