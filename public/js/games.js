(function () {
    'use strict';

    /* ═══════════════════════════════════════════════════════════════
       DΞBO Games – Scribble Client
       ═══════════════════════════════════════════════════════════════ */

    const socket = io();
    const AVATARS = ['😀','😎','🤩','🥳','🤖','👾','🦊','🐱','🐶','🦁','🐼','🐨','🦄','🌸','⭐','🔥','💎','🎮','🎵','🏀'];
    const COLORS = ['#ffffff','#000000','#ef4444','#f97316','#f59e0b','#22c55e','#3b82f6','#6366f1','#a855f7','#ec4899','#78716c','#06b6d4'];

    /* ── State ──────────────────────────────────────────────────── */
    let me = null;           // { id, name, avatar }
    let roomCode = null;
    let isHost = false;
    let players = [];        // [{ id, name, avatar, score, isHost }]
    let gameActive = false;
    let amDrawing = false;
    let currentWord = '';
    let roundTime = 80;
    let timerInterval = null;
    let timeLeft = 0;

    // Canvas state
    let canvas, ctx;
    let drawing = false;
    let tool = 'pen';        // pen | eraser | fill
    let brushColor = '#ffffff';
    let brushSize = 5;
    let undoStack = [];
    let lastX = 0, lastY = 0;

    /* ── DOM ────────────────────────────────────────────────────── */
    const $ = (s) => document.getElementById(s);

    /* ═══════════════════════════════════════════════════════════════
       INIT
       ═══════════════════════════════════════════════════════════════ */
    function init() {
        buildAvatarGrid();
        buildColorPresets();
        loadUser();
        bindEvents();
        checkURLJoin();
    }

    function loadUser() {
        try {
            const s = localStorage.getItem('debo-games-user');
            if (s) me = JSON.parse(s);
        } catch (e) { /* ignore */ }
        if (me) $('setup-name').value = me.name || '';
    }

    function saveUser() {
        localStorage.setItem('debo-games-user', JSON.stringify(me));
    }

    function genId() {
        return 'g_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    }

    function esc(s) {
        const d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    /* ═══════════════════════════════════════════════════════════════
       SETUP
       ═══════════════════════════════════════════════════════════════ */
    let selectedAvatar = AVATARS[0];

    function buildAvatarGrid() {
        const g = $('avatar-grid');
        g.innerHTML = AVATARS.map(function (a, i) {
            return '<span class="g-avatar-opt' + (i === 0 ? ' selected' : '') + '" data-av="' + a + '">' + a + '</span>';
        }).join('');
        g.addEventListener('click', function (e) {
            var t = e.target.closest('.g-avatar-opt');
            if (!t) return;
            g.querySelectorAll('.g-avatar-opt').forEach(function (x) { x.classList.remove('selected'); });
            t.classList.add('selected');
            selectedAvatar = t.dataset.av;
        });
    }

    function buildColorPresets() {
        var el = $('color-presets');
        el.innerHTML = COLORS.map(function (c) {
            return '<span class="g-color-swatch' + (c === '#ffffff' ? ' active' : '') + '" data-c="' + c + '" style="background:' + c + '"></span>';
        }).join('');
    }

    function validateName() {
        var name = $('setup-name').value.trim();
        if (!name) { $('setup-name').focus(); return null; }
        if (!me) me = { id: genId(), name: name, avatar: selectedAvatar };
        else { me.name = name; me.avatar = selectedAvatar; }
        saveUser();
        return me;
    }

    function checkURLJoin() {
        var params = new URLSearchParams(location.search);
        var code = params.get('room');
        if (code) {
            $('join-section').hidden = false;
            $('join-code').value = code.toUpperCase();
        }
    }

    /* ═══════════════════════════════════════════════════════════════
       EVENTS
       ═══════════════════════════════════════════════════════════════ */
    function bindEvents() {
        // Setup
        $('btn-new-game').addEventListener('click', function () {
            if (!validateName()) return;
            socket.emit('game:create', { player: me, settings: getSettings() });
        });
        $('btn-join-game').addEventListener('click', function () {
            $('join-section').hidden = !$('join-section').hidden;
        });
        $('btn-join-go').addEventListener('click', doJoin);
        $('join-code').addEventListener('keydown', function (e) { if (e.key === 'Enter') doJoin(); });
        $('setup-name').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('btn-new-game').click(); });

        // Lobby
        $('btn-leave-lobby').addEventListener('click', leaveLobby);
        $('btn-copy-code').addEventListener('click', function () {
            navigator.clipboard.writeText(roomCode).then(function () {
                this.textContent = '✅ Copied!';
                setTimeout(function () { $('btn-copy-code').textContent = '📋 Copy Code'; }, 1500);
            }.bind(this));
        });
        $('btn-copy-link').addEventListener('click', function () {
            var link = location.origin + '/games?room=' + roomCode;
            navigator.clipboard.writeText(link).then(function () {
                $('btn-copy-link').textContent = '✅ Copied!';
                setTimeout(function () { $('btn-copy-link').textContent = '🔗 Copy Link'; }, 1500);
            });
        });
        $('btn-show-qr').addEventListener('click', toggleQR);
        $('btn-start-game').addEventListener('click', function () {
            socket.emit('game:start', { roomCode: roomCode, settings: getSettings() });
        });
        $('btn-lobby-send').addEventListener('click', sendLobbyChat);
        $('lobby-chat-input').addEventListener('keydown', function (e) { if (e.key === 'Enter') sendLobbyChat(); });

        // Game chat
        $('btn-game-send').addEventListener('click', sendGuess);
        $('game-chat-input').addEventListener('keydown', function (e) { if (e.key === 'Enter') sendGuess(); });

        // Settings changes
        $('setting-rounds').addEventListener('change', syncSettings);
        $('setting-time').addEventListener('change', syncSettings);
        $('setting-hints').addEventListener('change', syncSettings);

        // Drawing tools
        $('tool-pen').addEventListener('click', function () { setTool('pen'); });
        $('tool-eraser').addEventListener('click', function () { setTool('eraser'); });
        $('tool-fill').addEventListener('click', function () { setTool('fill'); });
        $('tool-color').addEventListener('input', function () { brushColor = this.value; updateSwatchActive(); });
        $('color-presets').addEventListener('click', function (e) {
            var sw = e.target.closest('.g-color-swatch');
            if (!sw) return;
            brushColor = sw.dataset.c;
            $('tool-color').value = brushColor;
            updateSwatchActive();
        });
        $('tool-size').addEventListener('input', function () { brushSize = parseInt(this.value); });
        $('tool-undo').addEventListener('click', undoStroke);
        $('tool-clear').addEventListener('click', function () {
            if (!amDrawing) return;
            clearCanvas();
            socket.emit('game:clear-canvas', { roomCode: roomCode });
        });

        // Socket events
        registerSocket();
    }

    function doJoin() {
        if (!validateName()) return;
        var code = $('join-code').value.trim().toUpperCase();
        if (!code || code.length < 4) return;
        socket.emit('game:join', { player: me, roomCode: code });
    }

    function getSettings() {
        return {
            rounds: parseInt($('setting-rounds').value),
            drawTime: parseInt($('setting-time').value),
            hints: parseInt($('setting-hints').value)
        };
    }

    function syncSettings() {
        if (!isHost || !roomCode) return;
        socket.emit('game:update-settings', { roomCode: roomCode, settings: getSettings() });
    }

    /* ═══════════════════════════════════════════════════════════════
       SOCKET
       ═══════════════════════════════════════════════════════════════ */
    function registerSocket() {
        socket.on('game:created', function (data) {
            roomCode = data.roomCode;
            isHost = true;
            players = data.players;
            showLobby();
        });

        socket.on('game:joined', function (data) {
            roomCode = data.roomCode;
            isHost = data.isHost;
            players = data.players;
            showLobby();
            if (data.settings) applySettings(data.settings);
        });

        socket.on('game:player-joined', function (data) {
            players = data.players;
            renderPlayerList();
            addLobbyMsg(null, data.name + ' joined the lobby!');
        });

        socket.on('game:player-left', function (data) {
            players = data.players;
            isHost = data.newHostId === me.id || isHost;
            renderPlayerList();
            addLobbyMsg(null, data.name + ' left.');
            if (data.newHostId === me.id) {
                isHost = true;
                $('btn-start-game').hidden = false;
                $('lobby-settings').style.pointerEvents = '';
                $('lobby-settings').style.opacity = '';
            }
        });

        socket.on('game:settings-updated', function (data) {
            applySettings(data.settings);
        });

        socket.on('game:lobby-chat', function (data) {
            addLobbyMsg(data.name, data.text);
        });

        socket.on('game:started', function (data) {
            players = data.players;
            roundTime = data.settings.drawTime;
            showGame();
        });

        socket.on('game:pick-word', function (data) {
            showWordPick(data.words);
        });

        socket.on('game:round-start', function (data) {
            startRound(data);
        });

        socket.on('game:draw', function (data) {
            drawRemoteStroke(data);
        });

        socket.on('game:clear-canvas', function () {
            clearCanvas();
        });

        socket.on('game:guess', function (data) {
            addGameMsg(data.name, data.text);
        });

        socket.on('game:correct-guess', function (data) {
            addGameMsgCorrect(data.name);
            updatePlayerGuessed(data.playerId);
            updateScore(data.playerId, data.score);
        });

        socket.on('game:close-guess', function (data) {
            addGameMsgClose(data.name);
        });

        socket.on('game:hint', function (data) {
            $('word-hint').textContent = data.hint;
        });

        socket.on('game:round-end', function (data) {
            stopTimer();
            showRoundEnd(data);
        });

        socket.on('game:game-over', function (data) {
            stopTimer();
            gameActive = false;
            showGameOver(data);
        });

        socket.on('game:error', function (data) {
            alert(data.message || 'Something went wrong.');
        });

        socket.on('game:score-update', function (data) {
            players = data.players;
            renderScoreboard();
        });

        socket.on('connect', function () {
            if (roomCode && me) {
                socket.emit('game:rejoin', { player: me, roomCode: roomCode });
            }
        });
    }

    /* ═══════════════════════════════════════════════════════════════
       SCREENS
       ═══════════════════════════════════════════════════════════════ */
    function showLobby() {
        $('setup-screen').hidden = true;
        $('lobby-screen').hidden = false;
        $('game-screen').hidden = true;
        $('lobby-code').textContent = roomCode;
        $('btn-start-game').hidden = !isHost;
        if (!isHost) {
            $('lobby-settings').style.pointerEvents = 'none';
            $('lobby-settings').style.opacity = '0.5';
        }
        renderPlayerList();
        history.replaceState(null, '', '/games?room=' + roomCode);
    }

    function showGame() {
        $('setup-screen').hidden = true;
        $('lobby-screen').hidden = true;
        $('game-screen').hidden = false;
        $('overlay').hidden = true;
        gameActive = true;
        initCanvas();
        renderScoreboard();
    }

    function showSetup() {
        $('setup-screen').hidden = false;
        $('lobby-screen').hidden = true;
        $('game-screen').hidden = true;
        $('overlay').hidden = true;
        roomCode = null;
        isHost = false;
        players = [];
        gameActive = false;
        stopTimer();
        history.replaceState(null, '', '/games');
    }

    /* ═══════════════════════════════════════════════════════════════
       LOBBY HELPERS
       ═══════════════════════════════════════════════════════════════ */
    function renderPlayerList() {
        var html = '';
        players.forEach(function (p) {
            var cls = p.id === me.id ? ' is-me' : '';
            var crown = p.isHost ? '<span class="g-crown">👑</span>' : '';
            html += '<span class="g-player-tag' + cls + '">' + esc(p.avatar) + ' ' + esc(p.name) + crown + '</span>';
        });
        $('player-list').innerHTML = html;
        $('player-count').textContent = players.length + '/8';
    }

    function addLobbyMsg(name, text) {
        var el = $('lobby-messages');
        var div = document.createElement('div');
        if (name) {
            div.className = 'g-lmsg';
            div.innerHTML = '<b>' + esc(name) + ':</b> ' + esc(text);
        } else {
            div.className = 'g-lmsg-system';
            div.textContent = text;
        }
        el.appendChild(div);
        el.scrollTop = el.scrollHeight;
    }

    function sendLobbyChat() {
        var input = $('lobby-chat-input');
        var text = input.value.trim();
        if (!text || !roomCode) return;
        socket.emit('game:lobby-chat', { roomCode: roomCode, text: text });
        input.value = '';
    }

    function leaveLobby() {
        if (roomCode) socket.emit('game:leave', { roomCode: roomCode });
        showSetup();
    }

    function applySettings(s) {
        $('setting-rounds').value = s.rounds;
        $('setting-time').value = s.drawTime;
        $('setting-hints').value = s.hints;
    }

    function toggleQR() {
        var c = $('qr-container');
        if (!c.hidden) { c.hidden = true; return; }
        var link = location.origin + '/games?room=' + roomCode;
        var canvas = $('qr-canvas');
        var ctx2 = canvas.getContext('2d');
        ctx2.fillStyle = '#fff';
        ctx2.fillRect(0, 0, 160, 160);
        ctx2.fillStyle = '#000';
        ctx2.font = '12px Inter, sans-serif';
        ctx2.textAlign = 'center';
        ctx2.fillText('Room: ' + roomCode, 80, 70);
        ctx2.fillText(link.length > 35 ? link.slice(0, 35) + '...' : link, 80, 90);
        ctx2.font = '10px Inter';
        ctx2.fillStyle = '#666';
        ctx2.fillText('Share this code to join', 80, 115);
        c.hidden = false;
    }

    /* ═══════════════════════════════════════════════════════════════
       CANVAS
       ═══════════════════════════════════════════════════════════════ */
    function initCanvas() {
        canvas = $('draw-canvas');
        ctx = canvas.getContext('2d');

        // Resize canvas to fit container
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', onPointerMove);
        canvas.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('pointerleave', onPointerUp);

        clearCanvas();
    }

    function resizeCanvas() {
        var wrap = document.querySelector('.g-canvas-wrap');
        if (!wrap) return;
        var w = Math.min(800, wrap.clientWidth - 16);
        var h = Math.min(600, wrap.clientHeight - 16);
        // Keep 4:3 ratio
        if (w / h > 4 / 3) w = Math.floor(h * 4 / 3);
        else h = Math.floor(w * 3 / 4);
        canvas.width = w;
        canvas.height = h;
        clearCanvas();
    }

    function clearCanvas() {
        if (!ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        undoStack = [];
    }

    function saveToUndo() {
        undoStack.push(canvas.toDataURL());
        if (undoStack.length > 30) undoStack.shift();
    }

    function undoStroke() {
        if (!amDrawing || undoStack.length === 0) return;
        var img = new Image();
        img.onload = function () {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            socket.emit('game:undo', { roomCode: roomCode, dataUrl: undoStack[undoStack.length - 1] || null });
        };
        var dataUrl = undoStack.pop();
        if (undoStack.length > 0) img.src = undoStack[undoStack.length - 1];
        else { clearCanvas(); socket.emit('game:clear-canvas', { roomCode: roomCode }); }
    }

    function getCanvasPos(e) {
        var rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / rect.width * canvas.width,
            y: (e.clientY - rect.top) / rect.height * canvas.height
        };
    }

    function onPointerDown(e) {
        if (!amDrawing) return;
        drawing = true;
        saveToUndo();
        var pos = getCanvasPos(e);
        lastX = pos.x;
        lastY = pos.y;

        if (tool === 'fill') {
            floodFill(Math.floor(pos.x), Math.floor(pos.y), brushColor);
            socket.emit('game:draw', { roomCode: roomCode, type: 'fill', x: pos.x / canvas.width, y: pos.y / canvas.height, color: brushColor });
            drawing = false;
            return;
        }

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, (tool === 'eraser' ? brushSize * 2 : brushSize) / 2, 0, Math.PI * 2);
        ctx.fillStyle = tool === 'eraser' ? '#ffffff' : brushColor;
        ctx.fill();

        socket.emit('game:draw', {
            roomCode: roomCode, type: 'dot',
            x: pos.x / canvas.width, y: pos.y / canvas.height,
            color: tool === 'eraser' ? '#ffffff' : brushColor,
            size: tool === 'eraser' ? brushSize * 2 : brushSize
        });
    }

    function onPointerMove(e) {
        if (!drawing || !amDrawing) return;
        var pos = getCanvasPos(e);

        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : brushColor;
        ctx.lineWidth = tool === 'eraser' ? brushSize * 2 : brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        socket.emit('game:draw', {
            roomCode: roomCode, type: 'line',
            x1: lastX / canvas.width, y1: lastY / canvas.height,
            x2: pos.x / canvas.width, y2: pos.y / canvas.height,
            color: tool === 'eraser' ? '#ffffff' : brushColor,
            size: tool === 'eraser' ? brushSize * 2 : brushSize
        });

        lastX = pos.x;
        lastY = pos.y;
    }

    function onPointerUp() {
        drawing = false;
    }

    function drawRemoteStroke(data) {
        if (!ctx) return;
        var w = canvas.width, h = canvas.height;

        if (data.type === 'dot') {
            ctx.beginPath();
            ctx.arc(data.x * w, data.y * h, data.size / 2, 0, Math.PI * 2);
            ctx.fillStyle = data.color;
            ctx.fill();
        } else if (data.type === 'line') {
            ctx.beginPath();
            ctx.moveTo(data.x1 * w, data.y1 * h);
            ctx.lineTo(data.x2 * w, data.y2 * h);
            ctx.strokeStyle = data.color;
            ctx.lineWidth = data.size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
        } else if (data.type === 'fill') {
            floodFill(Math.floor(data.x * w), Math.floor(data.y * h), data.color);
        }
    }

    function floodFill(startX, startY, fillColor) {
        var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var data = imgData.data;
        var w = canvas.width;
        var target = getPixel(data, startX, startY, w);
        var fill = hexToRgb(fillColor);
        if (target[0] === fill[0] && target[1] === fill[1] && target[2] === fill[2]) return;

        var stack = [[startX, startY]];
        var visited = new Set();
        var maxIter = canvas.width * canvas.height;
        var count = 0;

        while (stack.length > 0 && count < maxIter) {
            var pos = stack.pop();
            var x = pos[0], y = pos[1];
            var key = x + ',' + y;
            if (visited.has(key)) continue;
            if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue;
            var px = getPixel(data, x, y, w);
            if (Math.abs(px[0] - target[0]) > 30 || Math.abs(px[1] - target[1]) > 30 || Math.abs(px[2] - target[2]) > 30) continue;
            visited.add(key);
            setPixel(data, x, y, w, fill);
            stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
            count++;
        }
        ctx.putImageData(imgData, 0, 0);
    }

    function getPixel(data, x, y, w) {
        var i = (y * w + x) * 4;
        return [data[i], data[i + 1], data[i + 2]];
    }
    function setPixel(data, x, y, w, rgb) {
        var i = (y * w + x) * 4;
        data[i] = rgb[0]; data[i + 1] = rgb[1]; data[i + 2] = rgb[2]; data[i + 3] = 255;
    }
    function hexToRgb(hex) {
        var r = parseInt(hex.slice(1, 3), 16);
        var g = parseInt(hex.slice(3, 5), 16);
        var b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
    }

    /* ── Tool helpers ────────────────────────────────────────────── */
    function setTool(t) {
        tool = t;
        document.querySelectorAll('.g-tool').forEach(function (el) { el.classList.remove('active'); });
        $('tool-' + t).classList.add('active');
    }

    function updateSwatchActive() {
        document.querySelectorAll('.g-color-swatch').forEach(function (el) {
            el.classList.toggle('active', el.dataset.c === brushColor);
        });
    }

    /* ═══════════════════════════════════════════════════════════════
       GAME FLOW
       ═══════════════════════════════════════════════════════════════ */
    function showWordPick(words) {
        var card = $('overlay-card');
        card.innerHTML = '<h2>🎨 Choose a Word</h2><p>Pick a word to draw:</p><div class="g-word-options">' +
            words.map(function (w) { return '<button class="g-word-opt">' + esc(w) + '</button>'; }).join('') +
            '</div>';
        $('overlay').hidden = false;

        card.querySelectorAll('.g-word-opt').forEach(function (btn) {
            btn.addEventListener('click', function () {
                socket.emit('game:pick-word', { roomCode: roomCode, word: btn.textContent });
                $('overlay').hidden = true;
            });
        });
    }

    function startRound(data) {
        $('overlay').hidden = true;
        amDrawing = data.drawerId === me.id;
        currentWord = data.word || '';
        $('round-display').textContent = 'Round ' + data.round + ' / ' + data.totalRounds;

        if (amDrawing) {
            $('word-hint').textContent = currentWord;
            $('draw-tools').hidden = false;
            canvas.style.cursor = 'crosshair';
        } else {
            $('word-hint').textContent = data.hint || '_ '.repeat(data.wordLength);
            $('draw-tools').hidden = true;
            canvas.style.cursor = 'default';
        }

        clearCanvas();
        resetPlayerGuessed();
        highlightDrawer(data.drawerId);
        startTimer(data.drawTime || roundTime);
        $('game-chat-input').disabled = amDrawing;
        $('game-chat-input').placeholder = amDrawing ? "You're drawing!" : 'Type your guess...';
    }

    function highlightDrawer(drawerId) {
        players.forEach(function (p) { p.isDrawing = p.id === drawerId; p.guessed = false; });
        renderScoreboard();
    }

    function resetPlayerGuessed() {
        players.forEach(function (p) { p.guessed = false; });
    }

    function updatePlayerGuessed(playerId) {
        var p = players.find(function (pl) { return pl.id === playerId; });
        if (p) p.guessed = true;
        renderScoreboard();
    }

    function updateScore(playerId, score) {
        var p = players.find(function (pl) { return pl.id === playerId; });
        if (p) p.score = score;
        renderScoreboard();
    }

    /* ── Timer ───────────────────────────────────────────────────── */
    function startTimer(seconds) {
        stopTimer();
        timeLeft = seconds;
        var total = seconds;
        updateTimerDisplay(timeLeft, total);

        timerInterval = setInterval(function () {
            timeLeft--;
            if (timeLeft < 0) timeLeft = 0;
            updateTimerDisplay(timeLeft, total);
            if (timeLeft <= 0) stopTimer();
        }, 1000);
    }

    function stopTimer() {
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    }

    function updateTimerDisplay(left, total) {
        $('timer-text').textContent = left;
        var ring = $('timer-ring');
        var offset = (1 - left / total) * 113.1;
        ring.style.strokeDashoffset = offset;
        ring.classList.remove('warn', 'danger');
        if (left <= 10) ring.classList.add('danger');
        else if (left <= 20) ring.classList.add('warn');
    }

    /* ── Chat ────────────────────────────────────────────────────── */
    function sendGuess() {
        var input = $('game-chat-input');
        var text = input.value.trim();
        if (!text || !roomCode || amDrawing) return;
        socket.emit('game:guess', { roomCode: roomCode, text: text });
        input.value = '';
    }

    function addGameMsg(name, text) {
        var el = $('game-messages');
        var div = document.createElement('div');
        div.className = 'g-cmsg';
        div.innerHTML = '<b>' + esc(name) + ':</b> ' + esc(text);
        el.appendChild(div);
        el.scrollTop = el.scrollHeight;
    }

    function addGameMsgCorrect(name) {
        var el = $('game-messages');
        var div = document.createElement('div');
        div.className = 'g-cmsg-correct';
        div.textContent = '✅ ' + name + ' guessed the word!';
        el.appendChild(div);
        el.scrollTop = el.scrollHeight;
    }

    function addGameMsgClose(name) {
        var el = $('game-messages');
        var div = document.createElement('div');
        div.className = 'g-cmsg-close';
        div.textContent = '🔥 ' + name + ' is close!';
        el.appendChild(div);
        el.scrollTop = el.scrollHeight;
    }

    function addGameMsgSystem(text) {
        var el = $('game-messages');
        var div = document.createElement('div');
        div.className = 'g-cmsg-system';
        div.textContent = text;
        el.appendChild(div);
        el.scrollTop = el.scrollHeight;
    }

    /* ── Scoreboard ──────────────────────────────────────────────── */
    function renderScoreboard() {
        var sorted = players.slice().sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
        var html = '';
        sorted.forEach(function (p, i) {
            var rankCls = i < 3 ? ' rank-' + (i + 1) : '';
            var itemCls = p.isDrawing ? ' drawing' : (p.guessed ? ' guessed' : '');
            var status = '';
            if (p.isDrawing) status = '<span class="g-score-status is-drawing">✏️ Drawing</span>';
            else if (p.guessed) status = '<span class="g-score-status is-guessed">✅</span>';

            html += '<div class="g-score-item' + itemCls + '">' +
                '<div class="g-score-rank' + rankCls + '">' + (i + 1) + '</div>' +
                '<div class="g-score-avatar">' + esc(p.avatar) + '</div>' +
                '<div class="g-score-info"><span class="g-score-name">' + esc(p.name) + '</span>' +
                '<span class="g-score-pts">' + (p.score || 0) + ' pts</span></div>' +
                status + '</div>';
        });
        $('scoreboard').innerHTML = html;
    }

    /* ═══════════════════════════════════════════════════════════════
       OVERLAYS
       ═══════════════════════════════════════════════════════════════ */
    function showRoundEnd(data) {
        amDrawing = false;
        $('draw-tools').hidden = true;
        var card = $('overlay-card');
        card.innerHTML = '<h2>⏰ Round Over!</h2>' +
            '<p>The word was: <strong style="color:var(--g-accent2);font-size:1.3rem;">' + esc(data.word) + '</strong></p>' +
            '<p style="color:var(--g-text3);font-size:.85rem;">Next round starting soon...</p>';
        $('overlay').hidden = false;

        if (data.players) { players = data.players; renderScoreboard(); }

        setTimeout(function () { $('overlay').hidden = true; }, 4000);
    }

    function showGameOver(data) {
        amDrawing = false;
        $('draw-tools').hidden = true;
        if (data.players) players = data.players;
        var sorted = players.slice().sort(function (a, b) { return (b.score || 0) - (a.score || 0); });

        var rows = sorted.map(function (p, i) {
            var medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);
            return '<div class="g-final-row">' +
                '<span class="g-final-rank">' + medal + '</span>' +
                '<span>' + esc(p.avatar) + '</span>' +
                '<span class="g-final-name">' + esc(p.name) + '</span>' +
                '<span class="g-final-pts">' + (p.score || 0) + '</span>' +
                '</div>';
        }).join('');

        var card = $('overlay-card');
        card.innerHTML = '<h2>🏆 Game Over!</h2>' +
            '<div class="g-final-scores">' + rows + '</div>' +
            '<button class="g-btn g-btn-primary" id="btn-play-again">🔄 Play Again</button>' +
            '&nbsp;<button class="g-btn g-btn-secondary" id="btn-back-home">🏠 Back to Lobby</button>';
        $('overlay').hidden = false;

        $('btn-play-again').addEventListener('click', function () {
            $('overlay').hidden = true;
            if (isHost) socket.emit('game:start', { roomCode: roomCode, settings: getSettings() });
        });
        $('btn-back-home').addEventListener('click', function () {
            leaveLobby();
        });
    }

    /* ═══════════════════════════════════════════════════════════════
       BOOTSTRAP
       ═══════════════════════════════════════════════════════════════ */
    init();
})();
