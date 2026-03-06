(function () {
    'use strict';

    // ── State ────────────────────────────────────────────────────────
    let selectedFiles = [];
    let currentTransfer = null;
    let socket = null;
    let countdownInterval = null;

    // ── DOM helpers ──────────────────────────────────────────────────
    const $ = (s) => document.querySelector(s);
    const $$ = (s) => document.querySelectorAll(s);

    // Send elements
    const dropZone = $('#drop-zone');
    const fileInput = $('#file-input');
    const browseBtn = $('#browse-btn');
    const fileList = $('#file-list');
    const filesUl = $('#files-ul');
    const fileCount = $('#file-count');
    const totalSizeEl = $('#total-size');
    const addMoreBtn = $('#add-more-btn');
    const clearBtn = $('#clear-btn');
    const shareBtn = $('#share-btn');
    const progressSection = $('#progress-section');
    const progressFill = $('#progress-fill');
    const progressText = $('#progress-text');
    const results = $('#results');
    const codeDisplay = $('#code-display');
    const codeCountdown = $('#code-countdown');
    const linkDisplay = $('#link-display');
    const qrImage = $('#qr-image');
    const p2pStatus = $('#p2p-status');
    const newTransferBtn = $('#new-transfer-btn');

    // Receive elements
    const codeInput = $('#code-input');
    const receiveBtn = $('#receive-btn');
    const linkInput = $('#link-input');
    const receiveLinkBtn = $('#receive-link-btn');
    const fileInfo = $('#file-info');
    const receivedFilesList = $('#received-files-list');
    const receivedTotalSize = $('#received-total-size');
    const receivedDownloads = $('#received-downloads');
    const downloadBtn = $('#download-btn');
    const backBtn = $('#back-btn');
    const p2pReceiveStatus = $('#p2p-receive-status');

    // ── Init ─────────────────────────────────────────────────────────
    function init() {
        initSocket();
        initTabs();
        initDropZone();
        initFileControls();
        initSendFlow();
        initReceiveFlow();
        checkUrlParams();
    }

    // ── Socket.IO ────────────────────────────────────────────────────
    function initSocket() {
        socket = io();

        socket.on('peer-joined', () => {
            if (p2pStatus) {
                p2pStatus.innerHTML =
                    '<span class="status-dot active"></span>' +
                    '<span>Receiver connected! Direct P2P transfer active.</span>';
            }
            if (p2pReceiveStatus) {
                p2pReceiveStatus.hidden = false;
            }
        });

        socket.on('signal', (signal) => {
            handleSignal(signal);
        });
    }

    // ── Tabs ─────────────────────────────────────────────────────────
    function initTabs() {
        $$('.tab').forEach((tab) => {
            tab.addEventListener('click', () => {
                $$('.tab').forEach((t) => t.classList.remove('active'));
                $$('.tab-content').forEach((tc) => tc.classList.remove('active'));
                tab.classList.add('active');
                $('#' + tab.dataset.tab + '-tab').classList.add('active');
            });
        });
    }

    function switchToTab(name) {
        $$('.tab').forEach((t) => t.classList.remove('active'));
        $$('.tab-content').forEach((tc) => tc.classList.remove('active'));
        const btn = document.querySelector('.tab[data-tab="' + name + '"]');
        if (btn) btn.classList.add('active');
        const panel = $('#' + name + '-tab');
        if (panel) panel.classList.add('active');
    }

    // ── Drop Zone ────────────────────────────────────────────────────
    function initDropZone() {
        dropZone.addEventListener('click', () => fileInput.click());

        browseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.click();
        });

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            addFiles(e.dataTransfer.files);
        });

        fileInput.addEventListener('change', () => {
            addFiles(fileInput.files);
            fileInput.value = '';
        });
    }

    // ── File Controls ────────────────────────────────────────────────
    function initFileControls() {
        addMoreBtn.addEventListener('click', () => fileInput.click());
        clearBtn.addEventListener('click', () => {
            selectedFiles = [];
            renderFileList();
        });
    }

    function addFiles(list) {
        for (let i = 0; i < list.length; i++) {
            selectedFiles.push(list[i]);
        }
        renderFileList();
    }

    function removeFile(idx) {
        selectedFiles.splice(idx, 1);
        renderFileList();
    }

    function renderFileList() {
        if (selectedFiles.length === 0) {
            fileList.hidden = true;
            shareBtn.hidden = true;
            dropZone.hidden = false;
            return;
        }

        dropZone.hidden = true;
        fileList.hidden = false;
        shareBtn.hidden = false;

        fileCount.textContent = selectedFiles.length;
        const total = selectedFiles.reduce((s, f) => s + f.size, 0);
        totalSizeEl.textContent = 'Total: ' + formatSize(total);

        filesUl.innerHTML = '';
        selectedFiles.forEach((file, i) => {
            const li = document.createElement('li');
            li.innerHTML =
                '<span class="file-name">' + escapeHtml(file.name) + '</span>' +
                '<span class="file-size">' + formatSize(file.size) + '</span>' +
                '<button class="file-remove" data-idx="' + i + '">&times;</button>';
            filesUl.appendChild(li);
        });

        filesUl.querySelectorAll('.file-remove').forEach((btn) => {
            btn.addEventListener('click', () => removeFile(parseInt(btn.dataset.idx, 10)));
        });
    }

    // ── Send Flow ────────────────────────────────────────────────────
    function initSendFlow() {
        shareBtn.addEventListener('click', uploadFiles);
        newTransferBtn.addEventListener('click', resetSend);

        $$('.btn-copy').forEach((btn) => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.copy;
                let text = '';
                if (target === 'code') text = codeDisplay.textContent;
                else if (target === 'link') text = linkDisplay.value;

                navigator.clipboard.writeText(text).then(() => {
                    const orig = btn.textContent;
                    btn.textContent = '✅ Copied!';
                    setTimeout(() => { btn.textContent = orig; }, 2000);
                });
            });
        });
    }

    function uploadFiles() {
        if (selectedFiles.length === 0) return;

        const formData = new FormData();
        for (let i = 0; i < selectedFiles.length; i++) {
            formData.append('files', selectedFiles[i]);
        }

        shareBtn.hidden = true;
        fileList.hidden = true;
        progressSection.hidden = false;

        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const pct = Math.round((e.loaded / e.total) * 100);
                progressFill.style.width = pct + '%';
                progressText.textContent =
                    'Uploading… ' + pct + '% (' + formatSize(e.loaded) + ' / ' + formatSize(e.total) + ')';
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                const data = JSON.parse(xhr.responseText);
                currentTransfer = data;
                showResults(data);
            } else {
                let msg = 'Upload failed';
                try { msg = JSON.parse(xhr.responseText).error || msg; } catch (_) {}
                notify(msg, 'error');
                resetSend();
            }
        });

        xhr.addEventListener('error', () => {
            notify('Upload failed. Please check your connection.', 'error');
            resetSend();
        });

        xhr.open('POST', '/api/upload');
        xhr.send(formData);
    }

    function showResults(data) {
        progressSection.hidden = true;
        results.hidden = false;

        // Code
        codeDisplay.textContent = data.code;

        // Link
        const linkUrl = window.location.origin + '/receive?link=' + data.linkId;
        linkDisplay.value = linkUrl;

        // QR
        fetch('/api/qrcode/' + encodeURIComponent(data.linkId))
            .then((r) => r.json())
            .then((d) => { qrImage.src = d.qr; })
            .catch(() => {});

        // Countdown
        startCountdown(data.codeExpiresIn);

        // Join room for P2P awareness
        socket.emit('join-room', data.code);
    }

    function startCountdown(seconds) {
        let remaining = seconds;
        if (countdownInterval) clearInterval(countdownInterval);

        function tick() {
            const m = Math.floor(remaining / 60);
            const s = remaining % 60;
            codeCountdown.textContent = m + ':' + String(s).padStart(2, '0');

            if (remaining <= 0) {
                clearInterval(countdownInterval);
                codeCountdown.textContent = 'Expired';
                codeDisplay.style.opacity = '0.4';
            }
            remaining--;
        }

        tick();
        countdownInterval = setInterval(tick, 1000);
    }

    function resetSend() {
        selectedFiles = [];
        currentTransfer = null;
        if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }

        dropZone.hidden = false;
        fileList.hidden = true;
        shareBtn.hidden = true;
        progressSection.hidden = true;
        results.hidden = true;
        progressFill.style.width = '0%';
        codeDisplay.style.opacity = '1';

        p2pStatus.innerHTML =
            '<span class="status-dot"></span>' +
            '<span>Waiting for receiver… Stay on this page for direct P2P transfer</span>';
    }

    // ── Receive Flow ─────────────────────────────────────────────────
    function initReceiveFlow() {
        receiveBtn.addEventListener('click', () => {
            receiveByKey(codeInput.value.trim());
        });

        codeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') receiveByKey(codeInput.value.trim());
        });

        codeInput.addEventListener('input', () => {
            codeInput.value = codeInput.value.replace(/\D/g, '');
            if (codeInput.value.length === 6) {
                receiveByKey(codeInput.value);
            }
        });

        receiveLinkBtn.addEventListener('click', () => {
            const val = linkInput.value.trim();
            const id = extractLinkId(val);
            if (id) receiveByKey(id);
            else notify('Invalid link', 'error');
        });

        linkInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const val = linkInput.value.trim();
                const id = extractLinkId(val);
                if (id) receiveByKey(id);
                else notify('Invalid link', 'error');
            }
        });

        downloadBtn.addEventListener('click', downloadFiles);

        backBtn.addEventListener('click', () => {
            fileInfo.hidden = true;
            $('#receive-section').hidden = false;
            currentTransfer = null;
            p2pReceiveStatus.hidden = true;
        });
    }

    function extractLinkId(input) {
        try {
            const url = new URL(input);
            return new URLSearchParams(url.search).get('link') || null;
        } catch (_) {
            // Might be a raw link ID
            if (/^[a-f0-9]{16}$/i.test(input)) return input;
            return null;
        }
    }

    function receiveByKey(key) {
        if (!key) { notify('Please enter a code or link', 'error'); return; }

        receiveBtn.disabled = true;
        receiveBtn.innerHTML = '<span class="spinner"></span> Checking…';

        fetch('/api/info/' + encodeURIComponent(key))
            .then((r) => {
                if (!r.ok) return r.json().then((d) => Promise.reject(d));
                return r.json();
            })
            .then((data) => {
                currentTransfer = { key: key };
                Object.assign(currentTransfer, data);
                showFileInfo(data);
                socket.emit('join-room', key);
            })
            .catch((err) => {
                notify(err.error || 'Transfer not found or expired', 'error');
            })
            .finally(() => {
                receiveBtn.disabled = false;
                receiveBtn.innerHTML = '📥 Receive';
            });
    }

    function showFileInfo(data) {
        $('#receive-section').hidden = true;
        fileInfo.hidden = false;

        receivedFilesList.innerHTML = '';
        data.files.forEach((f) => {
            const li = document.createElement('li');
            li.innerHTML =
                '<span class="file-name">' + escapeHtml(f.name) + '</span>' +
                '<span class="file-size">' + formatSize(f.size) + '</span>';
            receivedFilesList.appendChild(li);
        });

        receivedTotalSize.textContent = 'Total: ' + formatSize(data.totalSize);
        receivedDownloads.textContent = 'Downloads: ' + data.downloads;
    }

    function downloadFiles() {
        if (!currentTransfer || !currentTransfer.key) return;

        downloadBtn.disabled = true;
        downloadBtn.innerHTML = '<span class="spinner"></span> Downloading…';

        const a = document.createElement('a');
        a.href = '/api/download/' + encodeURIComponent(currentTransfer.key);
        a.download = '';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setTimeout(() => {
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = '⬇️ Download Files';
            notify('Download started!', 'success');
        }, 1500);
    }

    // ── URL Params ───────────────────────────────────────────────────
    function checkUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const link = params.get('link');
        const code = params.get('code');

        if (link || code) {
            switchToTab('receive');
            const key = link || code;
            if (link) linkInput.value = window.location.href;
            else codeInput.value = code;
            receiveByKey(key);
        }
    }

    // ── WebRTC stub ──────────────────────────────────────────────────
    function handleSignal(_signal) {
        // Placeholder for full WebRTC data-channel P2P
    }

    // ── Utilities ────────────────────────────────────────────────────
    function formatSize(bytes) {
        if (bytes === 0) return '0 B';
        var units = ['B', 'KB', 'MB', 'GB', 'TB'];
        var i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
    }

    function escapeHtml(str) {
        var d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    function notify(message, type) {
        type = type || 'info';
        var div = document.createElement('div');
        div.className = 'notification ' + type;
        div.textContent = message;
        document.body.appendChild(div);
        setTimeout(function () { if (div.parentNode) div.remove(); }, 4000);
    }

    // ── Boot ─────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', init);
})();
