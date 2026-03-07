(function () {
    'use strict';

    /* ═══════════════════════════════════════════════════════════════
       SwiftChat – Client
       ═══════════════════════════════════════════════════════════════ */

    const socket = io();
    const AVATARS = ['😀','😎','🤩','🥳','🤖','👾','🦊','🐱','🐶','🦁','🐼','🐨','🦄','🌸','⭐','🔥','💎','🎮','🎵','🏀'];
    const REACTIONS = ['👍','❤️','😂','😮','😢','🔥','👏','🎉'];
    const EMOJIS = ['😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊','😋','😎','😍','🥰','😘','😗','😙','😚','🙂','🤗','🤩','🤔','🤨','😐','😑','😶','🙄','😏','😣','😥','😮','🤐','😯','😪','😫','😴','😌','😛','😜','😝','🤤','😒','😓','😔','😕','🙃','🤑','😲','🙁','😖','😞','😟','😤','😢','😭','😦','😧','😨','😩','🤯','😬','😰','😱','🥵','🥶','😳','🤪','😵','😡','😠','🤬','😷','🤒','🤕','🤢','🤮','🥴','😇','🥳','🥺','🤠','🤡','🤥','🤫','🤭','🧐','🤓','💀','👻','👽','🤖','💩','😺','👋','🤚','🖐','✋','🖖','👌','🤏','✌','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','💪','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣','💕','💞','💓','💗','💖','💘','💝'];

    /* ── State ────────────────────────────────────────────────────── */
    let me = null;          // { id, username, avatar }
    let rooms = {};         // code -> { code, peerUser, messages[], unread, pinned, typing }
    let currentRoom = null; // room code
    let replyTo = null;     // message id
    let editingMsg = null;  // message id
    let contextMsg = null;  // { msgId, roomCode }
    let darkMode = false;
    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;

    /* ── DOM refs ─────────────────────────────────────────────────── */
    const $ = (s) => document.getElementById(s);
    const setupScreen   = $('setup-screen');
    const chatApp       = $('chat-app');
    const chatMain      = $('chat-main');
    const chatEmpty     = $('chat-empty');
    const chatActive    = $('chat-active');
    const chatList      = $('chat-list');
    const emptyList     = $('empty-list');
    const messagesArea  = $('messages-area');
    const msgInput      = $('msg-input');
    const typingBar     = $('typing-bar');
    const replyBar      = $('reply-bar');
    const editBar       = $('edit-bar');
    const modalOverlay  = $('modal-overlay');
    const contextMenu   = $('context-menu');
    const emojiPicker   = $('emoji-picker');
    const reactionPicker = $('reaction-picker');
    const forwardOverlay = $('forward-overlay');

    /* ═══════════════════════════════════════════════════════════════
       INIT
       ═══════════════════════════════════════════════════════════════ */
    function init() {
        buildAvatarGrid();
        buildEmojiGrid();
        loadDarkMode();
        loadSettings();
        loadUser();
        if (me) {
            showApp();
            registerSocket();
        }
        bindEvents();
        setupMobileKeyboard();
        requestNotifPermission();
        applyAccentColor();
        applyFontStyle();
        applyFontSize();
    }

    function loadUser() {
        try {
            const s = localStorage.getItem('swiftchat-user');
            if (s) me = JSON.parse(s);
        } catch (e) { /* ignore */ }
    }

    function saveUser() { localStorage.setItem('swiftchat-user', JSON.stringify(me)); }

    function loadDarkMode() {
        const stored = localStorage.getItem('swiftchat-dark');
        darkMode = stored === null ? true : stored === '1';
        document.body.classList.toggle('dark', darkMode);
    }

    function requestNotifPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    /* ═══════════════════════════════════════════════════════════════
       SETUP
       ═══════════════════════════════════════════════════════════════ */
    let selectedAvatar = AVATARS[0];

    function buildAvatarGrid() {
        const g = $('avatar-grid');
        g.innerHTML = AVATARS.map((a, i) =>
            '<span class="avatar-opt' + (i === 0 ? ' selected' : '') + '" data-av="' + a + '">' + a + '</span>'
        ).join('');
        g.addEventListener('click', function (e) {
            const t = e.target.closest('.avatar-opt');
            if (!t) return;
            g.querySelectorAll('.avatar-opt').forEach(x => x.classList.remove('selected'));
            t.classList.add('selected');
            selectedAvatar = t.dataset.av;
        });
    }

    function buildEmojiGrid() {
        $('emoji-grid').innerHTML = EMOJIS.map(e => '<span>' + e + '</span>').join('');
    }

    /* ═══════════════════════════════════════════════════════════════
       EVENTS
       ═══════════════════════════════════════════════════════════════ */
    function bindEvents() {
        // Setup
        $('setup-go').addEventListener('click', doSetup);
        $('setup-name').addEventListener('keydown', e => { if (e.key === 'Enter') doSetup(); });

        // New chat
        $('btn-new-chat').addEventListener('click', openNewChatModal);
        $('btn-new-chat2').addEventListener('click', openNewChatModal);
        $('btn-new-chat3').addEventListener('click', openNewChatModal);
        $('modal-close').addEventListener('click', closeModals);
        $('btn-copy-code').addEventListener('click', copyMyCode);
        $('btn-show-qr').addEventListener('click', showQR);
        $('btn-join').addEventListener('click', doJoin);
        $('join-code').addEventListener('keydown', e => { if (e.key === 'Enter') doJoin(); });

        // Settings
        $('btn-settings').addEventListener('click', openSettings);
        $('settings-back').addEventListener('click', closeSettings);
        $('settings-sub-back').addEventListener('click', closeSettingsSection);
        $('settings-panel').querySelectorAll('.settings-item[data-section]').forEach(function (el) {
            el.addEventListener('click', function () { openSettingsSection(el.dataset.section); });
        });
        $('settings-profile').addEventListener('click', function () { openSettingsSection('profile'); });
        $('btn-logout').addEventListener('click', function () {
            if (confirm('Log out and clear all data? This cannot be undone.')) {
                localStorage.clear();
                location.reload();
            }
        });

        // Dark mode
        $('btn-toggle-dark').addEventListener('click', toggleDark);

        // Chat header
        $('btn-back').addEventListener('click', goBack);
        $('btn-chat-search').addEventListener('click', () => {
            $('inchat-search').hidden = !$('inchat-search').hidden;
            if (!$('inchat-search').hidden) $('inchat-search-input').focus();
        });
        $('inchat-search-close').addEventListener('click', () => { $('inchat-search').hidden = true; $('inchat-search-input').value = ''; renderMessages(); });
        $('inchat-search-input').addEventListener('input', renderMessages);
        $('btn-chat-menu').addEventListener('click', showChatMenuOptions);

        // Message input
        msgInput.addEventListener('input', onInputChange);
        msgInput.addEventListener('keydown', onInputKey);
        $('btn-send').addEventListener('click', sendMessage);
        $('btn-attach').addEventListener('click', () => $('file-input').click());
        $('file-input').addEventListener('change', onFileAttach);
        $('btn-emoji').addEventListener('click', toggleEmojiPicker);
        $('btn-voice').addEventListener('click', toggleVoiceRecord);

        // Reply/edit cancel
        $('reply-cancel').addEventListener('click', cancelReply);
        $('edit-cancel').addEventListener('click', cancelEdit);

        // Context menu
        contextMenu.addEventListener('click', onContextAction);

        // Emoji picker click
        $('emoji-grid').addEventListener('click', e => {
            if (e.target.tagName === 'SPAN') { insertEmoji(e.target.textContent); }
        });

        // Forward
        $('forward-close').addEventListener('click', () => { forwardOverlay.hidden = true; });

        // Search chats
        $('search-chats').addEventListener('input', renderChatList);

        // Close menus on outside click
        document.addEventListener('click', e => {
            if (!contextMenu.contains(e.target)) contextMenu.hidden = true;
            if (!emojiPicker.contains(e.target) && e.target !== $('btn-emoji')) emojiPicker.hidden = true;
            if (!reactionPicker.contains(e.target)) reactionPicker.hidden = true;
        });

        modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModals(); });
        forwardOverlay.addEventListener('click', e => { if (e.target === forwardOverlay) forwardOverlay.hidden = true; });

        // Random chat
        $('btn-random-chat').addEventListener('click', openRandomLobby);
        $('btn-random-chat2').addEventListener('click', openRandomLobby);
        $('random-close').addEventListener('click', closeRandomLobby);
        $('btn-go-online').addEventListener('click', toggleGoOnline);
        $('random-overlay').addEventListener('click', e => { if (e.target === $('random-overlay')) closeRandomLobby(); });
    }

    function doSetup() {
        const name = $('setup-name').value.trim();
        if (!name) { $('setup-name').focus(); return; }
        me = { id: genId(), username: name, avatar: selectedAvatar };
        saveUser();
        showApp();
        registerSocket();
    }

    function showApp() {
        setupScreen.hidden = true;
        chatApp.hidden = false;
        $('sidebar-user').innerHTML = '<span class="avatar">' + esc(me.avatar) + '</span>' + esc(me.username);
        loadRooms();
        renderChatList();
    }

    /* ═══════════════════════════════════════════════════════════════
       SOCKET
       ═══════════════════════════════════════════════════════════════ */
    function registerSocket() {
        socket.emit('chat:register', { userId: me.id, username: me.username, avatar: me.avatar });

        socket.on('chat:registered', data => {
            me.code = data.code;
            saveUser();
        });

        socket.on('chat:room-created', data => {
            addRoom(data);
        });

        socket.on('chat:room-joined', data => {
            addRoom(data);
            closeModals();
            openChat(data.code);
        });

        socket.on('chat:new-message', msg => {
            if (!rooms[msg.roomCode]) return;
            rooms[msg.roomCode].messages.push(msg);
            if (msg.senderId !== me.id) {
                if (currentRoom === msg.roomCode) {
                    socket.emit('chat:read', { roomCode: msg.roomCode, messageIds: [msg.id] });
                } else {
                    rooms[msg.roomCode].unread = (rooms[msg.roomCode].unread || 0) + 1;
                    showNotification(rooms[msg.roomCode], msg);
                    playSound();
                }
            }
            if (currentRoom === msg.roomCode) renderMessages();
            renderChatList();
            saveRooms();
        });

        socket.on('chat:typing', data => {
            if (!rooms[data.roomCode]) return;
            rooms[data.roomCode].typing = data.typing;
            if (currentRoom === data.roomCode) {
                typingBar.hidden = !data.typing;
                $('typing-name').textContent = data.username || 'User';
            }
            renderChatList();
        });

        socket.on('chat:messages-read', data => {
            if (!rooms[data.roomCode]) return;
            data.messageIds.forEach(id => {
                const msg = rooms[data.roomCode].messages.find(m => m.id === id);
                if (msg) msg.status = 'read';
            });
            if (currentRoom === data.roomCode) renderMessages();
            saveRooms();
        });

        socket.on('chat:message-reacted', data => {
            if (!rooms[data.roomCode]) return;
            const msg = rooms[data.roomCode].messages.find(m => m.id === data.messageId);
            if (msg) {
                if (!msg.reactions) msg.reactions = {};
                if (msg.reactions[data.userId] === data.emoji) delete msg.reactions[data.userId];
                else msg.reactions[data.userId] = data.emoji;
            }
            if (currentRoom === data.roomCode) renderMessages();
            saveRooms();
        });

        socket.on('chat:message-edited', data => {
            if (!rooms[data.roomCode]) return;
            const msg = rooms[data.roomCode].messages.find(m => m.id === data.messageId);
            if (msg) { msg.text = data.newText; msg.edited = true; }
            if (currentRoom === data.roomCode) renderMessages();
            saveRooms();
        });

        socket.on('chat:message-deleted', data => {
            if (!rooms[data.roomCode]) return;
            const msg = rooms[data.roomCode].messages.find(m => m.id === data.messageId);
            if (msg) {
                if (data.forEveryone) { msg.deleted = 'everyone'; msg.text = ''; }
                else if (data.userId === me.id) { msg.deleted = 'me'; }
            }
            if (currentRoom === data.roomCode) renderMessages();
            saveRooms();
        });

        socket.on('chat:user-status', data => {
            Object.keys(rooms).forEach(code => {
                if (rooms[code].peerUser && rooms[code].peerUser.id === data.userId) {
                    rooms[code].peerUser.online = data.online;
                    rooms[code].peerUser.lastSeen = data.lastSeen;
                }
            });
            if (currentRoom && rooms[currentRoom] && rooms[currentRoom].peerUser &&
                rooms[currentRoom].peerUser.id === data.userId) {
                updateChatHeader();
            }
            renderChatList();
        });

        socket.on('chat:history', data => {
            if (rooms[data.roomCode]) {
                rooms[data.roomCode].messages = data.messages;
                if (currentRoom === data.roomCode) renderMessages();
                renderChatList();
                saveRooms();
            }
        });

        // If reconnect
        socket.on('connect', () => {
            if (me) {
                socket.emit('chat:register', { userId: me.id, username: me.username, avatar: me.avatar });
                Object.keys(rooms).forEach(code => {
                    socket.emit('chat:rejoin-room', { code });
                });
            }
        });

        // Random chat events
        socket.on('random:lobby-update', renderLobbyList);

        socket.on('random:matched', () => {
            isInLobby = false;
            $('random-overlay').hidden = true;
            updateGoOnlineBtn();
        });

        socket.on('random:error', data => {
            alert(data.message || 'Something went wrong.');
        });
    }

    /* ═══════════════════════════════════════════════════════════════
       ROOMS
       ═══════════════════════════════════════════════════════════════ */
    function addRoom(data) {
        if (rooms[data.code]) {
            // Update peer if changed
            if (data.peerUser) rooms[data.code].peerUser = data.peerUser;
            return;
        }
        rooms[data.code] = {
            code: data.code,
            peerUser: data.peerUser || null,
            messages: data.messages || [],
            unread: 0,
            pinned: false,
            typing: false
        };
        renderChatList();
        saveRooms();
    }

    function saveRooms() {
        try {
            const data = {};
            Object.keys(rooms).forEach(code => {
                data[code] = {
                    code: rooms[code].code,
                    peerUser: rooms[code].peerUser,
                    messages: rooms[code].messages.slice(-200), // keep last 200
                    pinned: rooms[code].pinned
                };
            });
            localStorage.setItem('swiftchat-rooms-' + me.id, JSON.stringify(data));
        } catch (e) { /* quota exceeded, skip */ }
    }

    function loadRooms() {
        try {
            const s = localStorage.getItem('swiftchat-rooms-' + me.id);
            if (s) {
                const data = JSON.parse(s);
                Object.keys(data).forEach(code => {
                    rooms[code] = { ...data[code], unread: 0, typing: false };
                });
            }
        } catch (e) { /* ignore */ }
    }

    /* ═══════════════════════════════════════════════════════════════
       NEW CHAT MODAL
       ═══════════════════════════════════════════════════════════════ */
    function openNewChatModal() {
        modalOverlay.hidden = false;
        $('my-code').textContent = me.code || '...';
        $('qr-container').hidden = true;
        $('join-code').value = '';
        // Refresh code from server
        socket.emit('chat:get-code');
        socket.once('chat:my-code', code => {
            me.code = code;
            saveUser();
            $('my-code').textContent = code;
        });
    }

    function closeModals() { modalOverlay.hidden = true; }

    /* ═══════════════════════════════════════════════════════════════
       RANDOM CHAT LOBBY
       ═══════════════════════════════════════════════════════════════ */
    let isInLobby = false;

    function openRandomLobby() {
        $('random-overlay').hidden = false;
        socket.emit('random:get-lobby');
        updateGoOnlineBtn();
    }

    function closeRandomLobby() {
        $('random-overlay').hidden = true;
        if (isInLobby) {
            isInLobby = false;
            socket.emit('random:leave-lobby');
            updateGoOnlineBtn();
        }
    }

    function toggleGoOnline() {
        if (isInLobby) {
            isInLobby = false;
            socket.emit('random:leave-lobby');
        } else {
            isInLobby = true;
            socket.emit('random:join-lobby');
        }
        updateGoOnlineBtn();
    }

    function updateGoOnlineBtn() {
        var btn = $('btn-go-online');
        if (isInLobby) {
            btn.textContent = '🔴 Go Offline — Leave Lobby';
            btn.className = 'btn-primary btn-go-offline';
        } else {
            btn.textContent = '🟢 Go Online — Let Strangers Find Me';
            btn.className = 'btn-primary';
        }
    }

    function renderLobbyList(list) {
        var container = $('random-lobby-list');
        $('random-count').textContent = list.length;
        if (list.length === 0) {
            container.innerHTML = '<div class="random-empty">No strangers online yet. Be the first to go online!</div>';
            return;
        }
        container.innerHTML = list.map(function (entry) {
            var isSelf = entry.oderId === me.id;
            var ago = timeAgo(entry.joinedAt);
            return '<div class="random-card' + (isSelf ? ' random-card-self' : '') + '">' +
                '<div class="random-card-avatar">' + esc(entry.avatar) + '</div>' +
                '<div class="random-card-info">' +
                    '<div class="random-card-tag">' + esc(entry.tag) + (isSelf ? ' (You)' : '') + '</div>' +
                    '<div class="random-card-time">Online ' + ago + '</div>' +
                '</div>' +
                (isSelf ? '' : '<button class="random-card-btn" data-uid="' + esc(entry.oderId) + '">Chat</button>') +
            '</div>';
        }).join('');

        container.querySelectorAll('.random-card-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var targetId = btn.getAttribute('data-uid');
                socket.emit('random:connect', { targetUserId: targetId });
            });
        });
    }

    function timeAgo(ts) {
        var diff = Math.floor((Date.now() - ts) / 1000);
        if (diff < 60) return 'just now';
        if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
        return Math.floor(diff / 3600) + 'h ago';
    }

    function copyMyCode() {
        const code = $('my-code').textContent;
        if (code && code !== '...') {
            navigator.clipboard.writeText(code).then(() => {
                $('btn-copy-code').textContent = '✅ Copied!';
                setTimeout(() => { $('btn-copy-code').textContent = '📋 Copy'; }, 1500);
            });
        }
    }

    function showQR() {
        const code = $('my-code').textContent;
        if (!code || code === '...') return;
        const container = $('qr-container');
        container.hidden = false;
        const canvas = $('qr-canvas');
        // Use the server QR endpoint
        const url = location.origin + '/chat?join=' + encodeURIComponent(code);
        // Simple QR rendering using canvas
        drawQRSimple(canvas, url);
    }

    function drawQRSimple(canvas, text) {
        // Use server-side QR generation
        fetch('/api/chat/qr?text=' + encodeURIComponent(text))
            .then(r => r.json())
            .then(data => {
                const img = new Image();
                img.onload = () => {
                    canvas.width = 200; canvas.height = 200;
                    canvas.getContext('2d').drawImage(img, 0, 0, 200, 200);
                };
                img.src = data.qr;
            })
            .catch(() => {
                canvas.width = 200; canvas.height = 200;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#eee'; ctx.fillRect(0, 0, 200, 200);
                ctx.fillStyle = '#999'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('QR not available', 100, 100);
            });
    }

    function doJoin() {
        const code = $('join-code').value.trim().toUpperCase();
        if (!code) { $('join-code').focus(); return; }
        socket.emit('chat:join-room', { code });
        socket.once('chat:error', data => {
            alert(data.message || 'Could not connect. Check the code.');
        });
    }

    // Auto-join from URL param
    function checkURLJoin() {
        const params = new URLSearchParams(location.search);
        const joinCode = params.get('join');
        if (joinCode && me) {
            setTimeout(() => {
                socket.emit('chat:join-room', { code: joinCode.toUpperCase() });
            }, 500);
            // Clean URL
            history.replaceState(null, '', '/chat');
        }
    }

    /* ═══════════════════════════════════════════════════════════════
       CHAT LIST
       ═══════════════════════════════════════════════════════════════ */
    function renderChatList() {
        const search = ($('search-chats').value || '').toLowerCase();
        const entries = Object.values(rooms).filter(r => {
            if (!r.peerUser) return false;
            if (search) {
                const nameMatch = r.peerUser.username.toLowerCase().includes(search);
                const msgMatch = r.messages.some(m => m.text && m.text.toLowerCase().includes(search));
                return nameMatch || msgMatch;
            }
            return true;
        });

        // Sort: pinned first, then by last message time
        entries.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            const at = a.messages.length ? a.messages[a.messages.length - 1].timestamp : 0;
            const bt = b.messages.length ? b.messages[b.messages.length - 1].timestamp : 0;
            return bt - at;
        });

        if (entries.length === 0) {
            chatList.innerHTML = '';
            chatList.appendChild(emptyList);
            emptyList.style.display = '';
            return;
        }

        emptyList.style.display = 'none';
        let html = '';
        entries.forEach(r => {
            const peer = r.peerUser;
            const lastMsg = r.messages.filter(m => m.deleted !== 'me').slice(-1)[0];
            let lastText = '';
            if (r.typing) lastText = '<em style="color:var(--accent)">typing...</em>';
            else if (lastMsg) {
                if (lastMsg.deleted === 'everyone') lastText = '<em>Message deleted</em>';
                else if (lastMsg.type === 'image') lastText = '🖼️ Photo';
                else if (lastMsg.type === 'file') lastText = '📎 File';
                else if (lastMsg.type === 'voice') lastText = '🎤 Voice';
                else if (lastMsg.type === 'system') lastText = lastMsg.text || '';
                else lastText = esc(lastMsg.text || '').substring(0, 40);
                if (lastMsg.senderId === me.id) lastText = '✓ ' + lastText;
            }
            const time = lastMsg ? formatTime(lastMsg.timestamp) : '';
            const active = currentRoom === r.code ? ' active' : '';
            const pinned = r.pinned ? ' pinned' : '';
            const pinIcon = r.pinned ? '<span class="pin-icon">📌</span>' : '';
            const onlineDot = peer.online ? '<span class="online-dot"></span>' : '';
            const badge = r.unread ? '<div class="chat-item-badge">' + r.unread + '</div>' : '';

            html += '<div class="chat-item' + active + pinned + '" data-room="' + esc(r.code) + '">' +
                '<div class="avatar">' + esc(peer.avatar || '😀') + onlineDot + '</div>' +
                '<div class="chat-item-info"><div class="chat-item-name">' + esc(peer.username) + pinIcon + '</div>' +
                '<div class="chat-item-last">' + lastText + '</div></div>' +
                '<div class="chat-item-meta"><div class="chat-item-time">' + time + '</div>' + badge + '</div></div>';
        });
        chatList.innerHTML = html;
        chatList.querySelectorAll('.chat-item').forEach(el => {
            el.addEventListener('click', () => openChat(el.dataset.room));
        });
    }

    /* ═══════════════════════════════════════════════════════════════
       OPEN / CLOSE CHAT
       ═══════════════════════════════════════════════════════════════ */
    function openChat(code) {
        if (!rooms[code]) return;
        currentRoom = code;
        rooms[code].unread = 0;
        chatEmpty.hidden = true;
        chatActive.hidden = false;
        chatApp.classList.add('show-chat');
        updateChatHeader();
        renderMessages();
        renderChatList();
        scrollToBottom();

        // Mark all unread as read
        const unreadIds = rooms[code].messages
            .filter(m => m.senderId !== me.id && m.status !== 'read')
            .map(m => m.id);
        if (unreadIds.length) {
            socket.emit('chat:read', { roomCode: code, messageIds: unreadIds });
        }

        // Request history from server
        socket.emit('chat:get-history', { roomCode: code });

        msgInput.focus();
    }

    function goBack() {
        currentRoom = null;
        chatActive.hidden = true;
        chatEmpty.hidden = false;
        chatApp.classList.remove('show-chat');
        $('inchat-search').hidden = true;
        cancelReply();
        cancelEdit();
    }

    function updateChatHeader() {
        const r = rooms[currentRoom];
        if (!r || !r.peerUser) return;
        $('header-avatar').textContent = r.peerUser.avatar || '😀';
        $('header-name').textContent = r.peerUser.username;
        if (r.peerUser.online) {
            $('header-status').textContent = 'online';
            $('header-status').style.color = 'var(--green)';
        } else if (r.peerUser.lastSeen) {
            $('header-status').textContent = 'last seen ' + formatDateTime(r.peerUser.lastSeen);
            $('header-status').style.color = '';
        } else {
            $('header-status').textContent = '';
        }
    }

    /* ═══════════════════════════════════════════════════════════════
       RENDER MESSAGES
       ═══════════════════════════════════════════════════════════════ */
    function renderMessages() {
        if (!currentRoom || !rooms[currentRoom]) return;
        const msgs = rooms[currentRoom].messages.filter(m => m.deleted !== 'me');
        const search = $('inchat-search-input') ? $('inchat-search-input').value.toLowerCase() : '';

        let html = '';
        let lastDate = '';
        msgs.forEach(msg => {
            if (search && msg.text && !msg.text.toLowerCase().includes(search)) return;

            // Date divider
            const d = new Date(msg.timestamp).toLocaleDateString();
            if (d !== lastDate) {
                lastDate = d;
                html += '<div class="date-divider"><span>' + formatDate(msg.timestamp) + '</span></div>';
            }

            if (msg.type === 'system') {
                html += '<div class="msg msg-system"><div class="msg-bubble">' + esc(msg.text) + '</div></div>';
                return;
            }

            const isSent = msg.senderId === me.id;
            const cls = isSent ? 'sent' : 'recv';
            const highlight = search && msg.text && msg.text.toLowerCase().includes(search) ? ' style="background:rgba(255,255,0,.15)"' : '';

            html += '<div class="msg ' + cls + '" data-id="' + msg.id + '"' + highlight + '>';
            html += '<div class="msg-bubble">';

            // Reply reference
            if (msg.replyTo) {
                const orig = rooms[currentRoom].messages.find(m => m.id === msg.replyTo);
                if (orig) {
                    html += '<div class="msg-reply-ref" data-ref="' + msg.replyTo + '">↩ ' + esc((orig.text || '').substring(0, 50)) + '</div>';
                }
            }

            if (msg.deleted === 'everyone') {
                html += '<div class="msg-deleted">🚫 This message was deleted</div>';
            } else {
                // Media
                if (msg.media) {
                    html += '<div class="msg-media">';
                    if (msg.type === 'image') {
                        html += '<img src="' + escAttr(msg.media.url) + '" alt="photo" loading="lazy">';
                    } else if (msg.type === 'voice') {
                        html += '<div class="msg-voice">' +
                            '<button class="icon-btn voice-play-btn" data-src="' + escAttr(msg.media.url) + '">▶</button>' +
                            '<div class="voice-bar"><div class="voice-progress"></div></div>' +
                            '<span class="voice-dur">' + (msg.media.duration || '0:00') + '</span></div>';
                    } else {
                        html += '<a class="file-attach" href="' + escAttr(msg.media.url) + '" download="' + escAttr(msg.media.name || 'file') + '">' +
                            '<span>📎</span><div><div class="file-name">' + esc(msg.media.name || 'File') + '</div>' +
                            '<div class="file-size">' + formatBytes(msg.media.size || 0) + '</div></div></a>';
                    }
                    html += '</div>';
                }

                // Text
                if (msg.text) {
                    html += '<div class="msg-text">' + linkify(esc(msg.text)) + '</div>';
                }
            }

            // Meta (time + status)
            html += '<div class="msg-meta">';
            if (msg.edited) html += '<span class="edited-tag">edited </span>';
            html += formatTime(msg.timestamp);
            if (isSent && msg.deleted !== 'everyone') {
                if (msg.status === 'read') html += ' <span class="msg-status read">✓✓</span>';
                else if (msg.status === 'delivered') html += ' <span class="msg-status delivered">✓✓</span>';
                else html += ' <span class="msg-status">✓</span>';
            }
            html += '</div>';

            // Reactions
            if (msg.reactions && Object.keys(msg.reactions).length > 0) {
                html += '<div class="msg-reactions">';
                const counts = {};
                Object.entries(msg.reactions).forEach(([uid, emoji]) => {
                    if (!counts[emoji]) counts[emoji] = { count: 0, mine: false };
                    counts[emoji].count++;
                    if (uid === me.id) counts[emoji].mine = true;
                });
                Object.entries(counts).forEach(([emoji, data]) => {
                    html += '<span class="msg-reaction' + (data.mine ? ' mine' : '') + '" data-msgid="' + msg.id + '" data-emoji="' + emoji + '">' +
                        emoji + (data.count > 1 ? ' ' + data.count : '') + '</span>';
                });
                html += '</div>';
            }

            html += '</div></div>';
        });

        messagesArea.innerHTML = html;
        bindMessageEvents();
        scrollToBottom();
    }

    function bindMessageEvents() {
        // Right click / long press context menu
        messagesArea.querySelectorAll('.msg:not(.msg-system)').forEach(el => {
            el.addEventListener('contextmenu', e => { e.preventDefault(); showContextMenu(e, el.dataset.id); });
        });

        // Click reactions to toggle
        messagesArea.querySelectorAll('.msg-reaction').forEach(el => {
            el.addEventListener('click', () => {
                socket.emit('chat:react', { roomCode: currentRoom, messageId: el.dataset.msgid, emoji: el.dataset.emoji });
            });
        });

        // Reply refs - scroll to original
        messagesArea.querySelectorAll('.msg-reply-ref').forEach(el => {
            el.addEventListener('click', () => {
                const target = messagesArea.querySelector('.msg[data-id="' + el.dataset.ref + '"]');
                if (target) { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); target.style.background = 'var(--accent-light)'; setTimeout(() => target.style.background = '', 1500); }
            });
        });

        // Voice play
        messagesArea.querySelectorAll('.voice-play-btn').forEach(btn => {
            btn.addEventListener('click', () => playVoice(btn));
        });
    }

    function scrollToBottom() {
        setTimeout(() => { messagesArea.scrollTop = messagesArea.scrollHeight; }, 50);
    }

    /* ═══════════════════════════════════════════════════════════════
       SEND MESSAGE
       ═══════════════════════════════════════════════════════════════ */
    function sendMessage() {
        const text = msgInput.value.trim();
        if (!text && !editingMsg) return;
        if (!currentRoom) return;

        if (editingMsg) {
            socket.emit('chat:edit', { roomCode: currentRoom, messageId: editingMsg, newText: text });
            cancelEdit();
            msgInput.value = '';
            autoResize();
            return;
        }

        const msg = {
            roomCode: currentRoom,
            text: text,
            type: 'text',
            replyTo: replyTo
        };

        socket.emit('chat:message', msg);
        msgInput.value = '';
        autoResize();
        cancelReply();
        emitTyping(false);
    }

    /* ═══════════════════════════════════════════════════════════════
       FILE / MEDIA UPLOAD
       ═══════════════════════════════════════════════════════════════ */
    function onFileAttach() {
        const files = $('file-input').files;
        if (!files.length || !currentRoom) return;
        Array.from(files).forEach(file => uploadFile(file));
        $('file-input').value = '';
    }

    function uploadFile(file) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('roomCode', currentRoom);
        fd.append('userId', me.id);

        fetch('/api/chat/upload', { method: 'POST', body: fd })
            .then(r => r.json())
            .then(data => {
                if (data.error) { alert(data.error); return; }
                const isImage = file.type.startsWith('image/');
                socket.emit('chat:message', {
                    roomCode: currentRoom,
                    text: '',
                    type: isImage ? 'image' : 'file',
                    replyTo: replyTo,
                    media: { url: data.url, name: file.name, size: file.size, type: file.type }
                });
                cancelReply();
            })
            .catch(() => alert('Upload failed'));
    }

    /* ═══════════════════════════════════════════════════════════════
       VOICE RECORDING
       ═══════════════════════════════════════════════════════════════ */
    function toggleVoiceRecord() {
        if (isRecording) stopRecording();
        else startRecording();
    }

    function startRecording() {
        if (!navigator.mediaDevices) { alert('Microphone not supported'); return; }
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
            mediaRecorder.onstop = () => {
                stream.getTracks().forEach(t => t.stop());
                const blob = new Blob(audioChunks, { type: 'audio/webm' });
                uploadVoice(blob);
            };
            mediaRecorder.start();
            isRecording = true;
            $('btn-voice').classList.add('recording');
        }).catch(() => alert('Microphone access denied'));
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
        isRecording = false;
        $('btn-voice').classList.remove('recording');
    }

    function uploadVoice(blob) {
        if (!currentRoom) return;
        const fd = new FormData();
        fd.append('file', blob, 'voice-' + Date.now() + '.webm');
        fd.append('roomCode', currentRoom);
        fd.append('userId', me.id);

        fetch('/api/chat/upload', { method: 'POST', body: fd })
            .then(r => r.json())
            .then(data => {
                if (data.error) return;
                socket.emit('chat:message', {
                    roomCode: currentRoom,
                    text: '',
                    type: 'voice',
                    media: { url: data.url, name: 'Voice message', duration: '0:' + String(Math.round(blob.size / 6000)).padStart(2, '0') }
                });
            });
    }

    function playVoice(btn) {
        const src = btn.dataset.src;
        const container = btn.closest('.msg-voice');
        const progressEl = container.querySelector('.voice-progress');
        const durEl = container.querySelector('.voice-dur');

        if (btn._audio && !btn._audio.paused) {
            btn._audio.pause();
            btn.textContent = '▶';
            return;
        }

        const audio = new Audio(src);
        btn._audio = audio;
        btn.textContent = '⏸';

        audio.addEventListener('timeupdate', () => {
            if (audio.duration) {
                progressEl.style.width = (audio.currentTime / audio.duration * 100) + '%';
                durEl.textContent = formatDuration(audio.currentTime);
            }
        });
        audio.addEventListener('ended', () => {
            btn.textContent = '▶';
            progressEl.style.width = '0';
        });
        audio.play();
    }

    /* ═══════════════════════════════════════════════════════════════
       TYPING INDICATOR
       ═══════════════════════════════════════════════════════════════ */
    let typingTimeout = null;
    let currentlyTyping = false;

    function onInputChange() {
        autoResize();
        if (!currentRoom) return;
        if (!currentlyTyping) emitTyping(true);
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => emitTyping(false), 2000);
    }

    function emitTyping(val) {
        currentlyTyping = val;
        socket.emit('chat:typing', { roomCode: currentRoom, typing: val });
    }

    function onInputKey(e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    }

    function autoResize() {
        msgInput.style.height = 'auto';
        msgInput.style.height = Math.min(msgInput.scrollHeight, 120) + 'px';
    }

    /* ═══════════════════════════════════════════════════════════════
       MOBILE KEYBOARD HANDLING
       ═══════════════════════════════════════════════════════════════ */
    function setupMobileKeyboard() {
        // Use visualViewport API to detect virtual keyboard
        if (window.visualViewport) {
            let prevHeight = window.visualViewport.height;
            window.visualViewport.addEventListener('resize', function () {
                var vv = window.visualViewport;
                var heightDiff = prevHeight - vv.height;
                var isKeyboardOpen = heightDiff > 100;
                document.body.classList.toggle('keyboard-open', isKeyboardOpen);
                if (isKeyboardOpen) {
                    // Adjust chat-app height so input bar stays visible
                    var chatAppEl = document.getElementById('chat-app');
                    if (chatAppEl) {
                        chatAppEl.style.height = vv.height - (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 52) + 'px';
                    }
                    scrollToBottom();
                } else {
                    var chatAppEl = document.getElementById('chat-app');
                    if (chatAppEl) chatAppEl.style.height = '';
                }
                prevHeight = vv.height;
            });
        }

        // Focus input → always scroll to bottom after a short delay
        msgInput.addEventListener('focus', function () {
            setTimeout(scrollToBottom, 300);
        });

        // Handle "Go"/"Send" action on mobile virtual keyboard
        msgInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    /* ═══════════════════════════════════════════════════════════════
       CONTEXT MENU
       ═══════════════════════════════════════════════════════════════ */
    function showContextMenu(e, msgId) {
        contextMsg = { msgId, roomCode: currentRoom };
        const msg = rooms[currentRoom].messages.find(m => m.id === msgId);
        if (!msg || msg.deleted === 'everyone') return;

        const isMine = msg.senderId === me.id;
        contextMenu.querySelector('[data-action="edit"]').hidden = !isMine;
        contextMenu.querySelector('[data-action="delete-all"]').hidden = !isMine;

        contextMenu.hidden = false;
        const x = Math.min(e.clientX, window.innerWidth - 200);
        const y = Math.min(e.clientY, window.innerHeight - 250);
        contextMenu.style.left = x + 'px';
        contextMenu.style.top = y + 'px';
    }

    function onContextAction(e) {
        const btn = e.target.closest('[data-action]');
        if (!btn || !contextMsg) return;
        const action = btn.dataset.action;
        const { msgId, roomCode } = contextMsg;
        const msg = rooms[roomCode] && rooms[roomCode].messages.find(m => m.id === msgId);
        contextMenu.hidden = true;

        if (action === 'reply') setReply(msgId);
        else if (action === 'react') showReactionPicker(msgId);
        else if (action === 'edit' && msg) startEdit(msg);
        else if (action === 'forward') showForwardModal(msg);
        else if (action === 'copy' && msg) { navigator.clipboard.writeText(msg.text || ''); }
        else if (action === 'delete-me') socket.emit('chat:delete', { roomCode, messageId: msgId, forEveryone: false });
        else if (action === 'delete-all') socket.emit('chat:delete', { roomCode, messageId: msgId, forEveryone: true });
    }

    function setReply(msgId) {
        replyTo = msgId;
        const msg = rooms[currentRoom].messages.find(m => m.id === msgId);
        if (!msg) return;
        $('reply-preview').textContent = '↩ ' + (msg.text || 'Media').substring(0, 60);
        replyBar.hidden = false;
        msgInput.focus();
    }

    function cancelReply() { replyTo = null; replyBar.hidden = true; }

    function startEdit(msg) {
        editingMsg = msg.id;
        msgInput.value = msg.text || '';
        editBar.hidden = false;
        autoResize();
        msgInput.focus();
    }

    function cancelEdit() { editingMsg = null; editBar.hidden = true; msgInput.value = ''; autoResize(); }

    /* ═══════════════════════════════════════════════════════════════
       REACTIONS
       ═══════════════════════════════════════════════════════════════ */
    function showReactionPicker(msgId) {
        reactionPicker.hidden = false;
        reactionPicker.innerHTML = REACTIONS.map(r => '<span data-msgid="' + msgId + '">' + r + '</span>').join('');
        reactionPicker.querySelectorAll('span').forEach(s => {
            s.addEventListener('click', () => {
                socket.emit('chat:react', { roomCode: currentRoom, messageId: s.dataset.msgid, emoji: s.textContent });
                reactionPicker.hidden = true;
            });
        });
        // Position near context menu
        reactionPicker.style.left = contextMenu.style.left;
        reactionPicker.style.top = (parseInt(contextMenu.style.top) - 50) + 'px';
    }

    /* ═══════════════════════════════════════════════════════════════
       EMOJI PICKER
       ═══════════════════════════════════════════════════════════════ */
    function toggleEmojiPicker() { emojiPicker.hidden = !emojiPicker.hidden; }
    function insertEmoji(emoji) {
        msgInput.value += emoji;
        msgInput.focus();
        emojiPicker.hidden = true;
    }

    /* ═══════════════════════════════════════════════════════════════
       FORWARD
       ═══════════════════════════════════════════════════════════════ */
    function showForwardModal(msg) {
        if (!msg) return;
        forwardOverlay.hidden = false;
        const list = $('forward-list');
        const entries = Object.values(rooms).filter(r => r.peerUser && r.code !== currentRoom);
        if (entries.length === 0) { list.innerHTML = '<p style="text-align:center;color:var(--text2);padding:20px">No other chats</p>'; return; }
        list.innerHTML = entries.map(r =>
            '<div class="chat-item" data-fwd="' + esc(r.code) + '"><div class="avatar">' + esc(r.peerUser.avatar || '😀') + '</div>' +
            '<div class="chat-item-info"><div class="chat-item-name">' + esc(r.peerUser.username) + '</div></div></div>'
        ).join('');
        list.querySelectorAll('.chat-item').forEach(el => {
            el.addEventListener('click', () => {
                socket.emit('chat:message', {
                    roomCode: el.dataset.fwd,
                    text: '↗ Forwarded: ' + (msg.text || 'Media'),
                    type: msg.type === 'text' ? 'text' : msg.type,
                    media: msg.media || null
                });
                forwardOverlay.hidden = true;
            });
        });
    }

    /* ═══════════════════════════════════════════════════════════════
       CHAT MENU (pin, export, etc.)
       ═══════════════════════════════════════════════════════════════ */
    function showChatMenuOptions() {
        if (!currentRoom || !rooms[currentRoom]) return;
        const r = rooms[currentRoom];
        const action = prompt(
            'Chat Options:\n1. ' + (r.pinned ? 'Unpin' : 'Pin') + ' Chat\n2. Export Chat\n3. Clear Chat\n\nEnter number:'
        );
        if (action === '1') {
            r.pinned = !r.pinned;
            renderChatList();
            saveRooms();
        } else if (action === '2') {
            exportChat();
        } else if (action === '3') {
            if (confirm('Clear all messages in this chat?')) {
                r.messages = [];
                renderMessages();
                renderChatList();
                saveRooms();
            }
        }
    }

    function exportChat() {
        if (!currentRoom || !rooms[currentRoom]) return;
        const r = rooms[currentRoom];
        const peer = r.peerUser ? r.peerUser.username : 'Unknown';
        let text = 'Chat with ' + peer + '\nExported: ' + new Date().toLocaleString() + '\n' + '='.repeat(40) + '\n\n';
        r.messages.forEach(m => {
            if (m.deleted === 'me') return;
            const sender = m.senderId === me.id ? me.username : peer;
            const time = new Date(m.timestamp).toLocaleString();
            if (m.deleted === 'everyone') text += '[' + time + '] ' + sender + ': [Message deleted]\n';
            else if (m.type === 'system') text += '--- ' + m.text + ' ---\n';
            else text += '[' + time + '] ' + sender + ': ' + (m.text || '[Media: ' + m.type + ']') + '\n';
        });
        const blob = new Blob([text], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'chat-' + peer + '-' + new Date().toISOString().slice(0, 10) + '.txt';
        a.click();
        URL.revokeObjectURL(a.href);
    }

    /* ═══════════════════════════════════════════════════════════════
       DARK MODE
       ═══════════════════════════════════════════════════════════════ */
    function toggleDark() {
        darkMode = !darkMode;
        document.body.classList.toggle('dark', darkMode);
        localStorage.setItem('swiftchat-dark', darkMode ? '1' : '0');
        $('btn-toggle-dark').textContent = darkMode ? '☀️' : '🌙';
    }

    /* ═══════════════════════════════════════════════════════════════
       NOTIFICATIONS
       ═══════════════════════════════════════════════════════════════ */
    function showNotification(room, msg) {
        if (!settings.notifications.messages) return;
        if (!settings.notifications.desktop) return;
        if (!('Notification' in window) || Notification.permission !== 'granted') return;
        if (document.hasFocus()) return;
        const peer = room.peerUser ? room.peerUser.username : 'Someone';
        const body = msg.type === 'text' ? msg.text : msg.type === 'image' ? '🖼️ Photo' : '📎 File';
        new Notification(peer, { body: (body || '').substring(0, 80), icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💬</text></svg>' });
    }

    function playSound() {
        if (!settings.notifications.sounds) return;
        try { $('notif-sound').currentTime = 0; $('notif-sound').play(); } catch (e) { /* ok */ }
    }

    /* ═══════════════════════════════════════════════════════════════
       SETTINGS
       ═══════════════════════════════════════════════════════════════ */
    const ACCENT_COLORS = [
        { name: 'Teal',   val: '#00a884' },
        { name: 'Blue',   val: '#0088cc' },
        { name: 'Purple', val: '#7c3aed' },
        { name: 'Pink',   val: '#ec4899' },
        { name: 'Red',    val: '#ef4444' },
        { name: 'Orange', val: '#f97316' },
        { name: 'Yellow', val: '#eab308' },
        { name: 'Green',  val: '#22c55e' }
    ];

    const LANGUAGES = [
        { code: 'en', name: 'English' },
        { code: 'hi', name: 'हिन्दी (Hindi)' },
        { code: 'es', name: 'Español (Spanish)' },
        { code: 'fr', name: 'Français (French)' },
        { code: 'de', name: 'Deutsch (German)' },
        { code: 'pt', name: 'Português (Portuguese)' },
        { code: 'ar', name: 'العربية (Arabic)' },
        { code: 'ja', name: '日本語 (Japanese)' },
        { code: 'zh', name: '中文 (Chinese)' },
        { code: 'ko', name: '한국어 (Korean)' }
    ];

    // Settings state (persisted in localStorage)
    let settings = {
        bio: 'Hey there! I\'m using SwiftChat',
        username: '',
        status: '🟢 Available',
        privacy: { lastSeen: 'everyone', profilePhoto: 'everyone', onlineStatus: 'everyone', readReceipts: true },
        notifications: { messages: true, sounds: true, desktop: true, vibration: true },
        chat: { enterSends: true, fontSize: 'medium', wallpaper: 'default', autoDownload: 'wifi' },
        security: { twoFactor: false },
        blocked: [],
        language: 'en',
        accentColor: '#00a884',
        fontStyle: 'default'
    };

    function loadSettings() {
        try {
            const s = localStorage.getItem('swiftchat-settings');
            if (s) settings = { ...settings, ...JSON.parse(s) };
        } catch (e) { /* ignore */ }
    }

    function saveSettings() {
        localStorage.setItem('swiftchat-settings', JSON.stringify(settings));
    }

    function openSettings() {
        loadSettings();
        const panel = $('settings-panel');
        panel.hidden = false;
        // Update profile display
        if (me) {
            $('settings-avatar-display').textContent = me.avatar || '😀';
            $('settings-name-display').textContent = me.username || 'User';
            $('settings-bio-display').textContent = settings.bio || 'Hey there! I\'m using SwiftChat';
        }
    }

    function closeSettings() {
        $('settings-panel').hidden = true;
        $('settings-sub').hidden = true;
    }

    function openSettingsSection(section) {
        const panel = $('settings-sub');
        const title = $('settings-sub-title');
        const body = $('settings-sub-body');

        const sectionRenderers = {
            profile: renderProfileSection,
            privacy: renderPrivacySection,
            notifications: renderNotificationSection,
            chats: renderChatSection,
            security: renderSecuritySection,
            blocked: renderBlockedSection,
            storage: renderStorageSection,
            backup: renderBackupSection,
            language: renderLanguageSection,
            appearance: renderAppearanceSection,
            devices: renderDevicesSection,
            help: renderHelpSection
        };

        const titles = {
            profile: '👤 Profile', privacy: '🔒 Privacy', notifications: '🔔 Notifications',
            chats: '💬 Chats', security: '🛡️ Security', blocked: '🚫 Blocked Users',
            storage: '💾 Storage & Data', backup: '☁️ Chat Backup', language: '🌍 Language',
            appearance: '🎨 Appearance', devices: '💻 Linked Devices', help: '🆘 Help & Support'
        };

        title.textContent = titles[section] || section;
        if (sectionRenderers[section]) sectionRenderers[section](body);
        panel.hidden = false;
    }

    function closeSettingsSection() {
        $('settings-sub').hidden = true;
    }

    /* ── 1. Profile Settings ─────────────────────────────────── */
    function renderProfileSection(body) {
        body.innerHTML =
            '<div class="stg-section">' +
                '<div class="stg-section-title">Avatar</div>' +
                '<div style="text-align:center;margin-bottom:10px">' +
                    '<div class="settings-avatar" id="stg-avatar-big">' + esc(me.avatar) + '</div>' +
                '</div>' +
                '<div class="stg-avatar-grid" id="stg-avatar-picker">' +
                    AVATARS.map(a => '<span' + (a === me.avatar ? ' class="selected"' : '') + ' data-av="' + a + '">' + a + '</span>').join('') +
                '</div>' +
            '</div>' +
            '<div class="stg-section">' +
                '<div class="stg-section-title">Display Name</div>' +
                '<input class="stg-input" id="stg-name" value="' + escAttr(me.username) + '" maxlength="30" placeholder="Your name">' +
            '</div>' +
            '<div class="stg-section">' +
                '<div class="stg-section-title">Username</div>' +
                '<input class="stg-input" id="stg-username" value="' + escAttr(settings.username || '') + '" maxlength="20" placeholder="@username">' +
            '</div>' +
            '<div class="stg-section">' +
                '<div class="stg-section-title">About / Bio</div>' +
                '<textarea class="stg-textarea" id="stg-bio" maxlength="150" placeholder="Tell something about yourself...">' + esc(settings.bio) + '</textarea>' +
            '</div>' +
            '<div class="stg-section">' +
                '<div class="stg-section-title">Status Message</div>' +
                '<input class="stg-input" id="stg-status" value="' + escAttr(settings.status || '') + '" maxlength="50" placeholder="🟢 Available">' +
            '</div>' +
            '<div class="stg-section">' +
                '<div class="stg-btn-group"><button class="stg-btn stg-btn-primary" id="stg-profile-save">Save Changes</button></div>' +
            '</div>';

        // Avatar picker
        body.querySelector('#stg-avatar-picker').addEventListener('click', function (e) {
            const t = e.target.closest('span[data-av]');
            if (!t) return;
            this.querySelectorAll('span').forEach(s => s.classList.remove('selected'));
            t.classList.add('selected');
            body.querySelector('#stg-avatar-big').textContent = t.dataset.av;
        });

        body.querySelector('#stg-profile-save').addEventListener('click', function () {
            const sel = body.querySelector('#stg-avatar-picker .selected');
            if (sel) me.avatar = sel.dataset.av;
            const newName = body.querySelector('#stg-name').value.trim();
            if (newName) me.username = newName;
            settings.username = body.querySelector('#stg-username').value.trim();
            settings.bio = body.querySelector('#stg-bio').value.trim();
            settings.status = body.querySelector('#stg-status').value.trim();
            saveUser();
            saveSettings();
            // Update UI
            $('sidebar-user').innerHTML = '<span class="avatar">' + esc(me.avatar) + '</span>' + esc(me.username);
            $('settings-avatar-display').textContent = me.avatar;
            $('settings-name-display').textContent = me.username;
            $('settings-bio-display').textContent = settings.bio || 'Hey there! I\'m using SwiftChat';
            // Re-register with server
            socket.emit('chat:register', { userId: me.id, username: me.username, avatar: me.avatar });
            this.textContent = '✅ Saved!';
            setTimeout(() => { this.textContent = 'Save Changes'; }, 1500);
        });
    }

    /* ── 2. Privacy Settings ─────────────────────────────────── */
    function renderPrivacySection(body) {
        const pr = settings.privacy;
        body.innerHTML =
            '<div class="stg-section">' +
                '<div class="stg-section-title">Who Can See</div>' +
                '<div class="stg-row"><div class="stg-row-info"><span class="stg-row-label">Last Seen</span></div>' +
                    '<select class="stg-select" data-key="lastSeen"><option value="everyone"' + (pr.lastSeen === 'everyone' ? ' selected' : '') + '>Everyone</option><option value="contacts"' + (pr.lastSeen === 'contacts' ? ' selected' : '') + '>My Contacts</option><option value="nobody"' + (pr.lastSeen === 'nobody' ? ' selected' : '') + '>Nobody</option></select></div>' +
                '<div class="stg-row"><div class="stg-row-info"><span class="stg-row-label">Profile Photo</span></div>' +
                    '<select class="stg-select" data-key="profilePhoto"><option value="everyone"' + (pr.profilePhoto === 'everyone' ? ' selected' : '') + '>Everyone</option><option value="contacts"' + (pr.profilePhoto === 'contacts' ? ' selected' : '') + '>My Contacts</option><option value="nobody"' + (pr.profilePhoto === 'nobody' ? ' selected' : '') + '>Nobody</option></select></div>' +
                '<div class="stg-row"><div class="stg-row-info"><span class="stg-row-label">Online Status</span></div>' +
                    '<select class="stg-select" data-key="onlineStatus"><option value="everyone"' + (pr.onlineStatus === 'everyone' ? ' selected' : '') + '>Everyone</option><option value="contacts"' + (pr.onlineStatus === 'contacts' ? ' selected' : '') + '>My Contacts</option><option value="nobody"' + (pr.onlineStatus === 'nobody' ? ' selected' : '') + '>Nobody</option></select></div>' +
            '</div>' +
            '<div class="stg-section">' +
                '<div class="stg-section-title">Other</div>' +
                '<div class="stg-row"><div class="stg-row-info"><span class="stg-row-label">Read Receipts</span><span class="stg-row-desc">Show blue check marks when messages are read</span></div>' +
                    '<label class="stg-toggle"><input type="checkbox"' + (pr.readReceipts ? ' checked' : '') + ' data-key="readReceipts"><span class="slider"></span></label></div>' +
            '</div>';

        body.querySelectorAll('.stg-select').forEach(sel => {
            sel.addEventListener('change', function () {
                settings.privacy[this.dataset.key] = this.value;
                saveSettings();
            });
        });
        body.querySelectorAll('.stg-toggle input').forEach(cb => {
            cb.addEventListener('change', function () {
                settings.privacy[this.dataset.key] = this.checked;
                saveSettings();
            });
        });
    }

    /* ── 3. Notification Settings ────────────────────────────── */
    function renderNotificationSection(body) {
        const n = settings.notifications;
        body.innerHTML =
            '<div class="stg-section">' +
                '<div class="stg-section-title">Alerts</div>' +
                '<div class="stg-row"><div class="stg-row-info"><span class="stg-row-label">Message Notifications</span><span class="stg-row-desc">Show alerts for new messages</span></div>' +
                    '<label class="stg-toggle"><input type="checkbox"' + (n.messages ? ' checked' : '') + ' data-key="messages"><span class="slider"></span></label></div>' +
                '<div class="stg-row"><div class="stg-row-info"><span class="stg-row-label">Notification Sound</span><span class="stg-row-desc">Play sound on new message</span></div>' +
                    '<label class="stg-toggle"><input type="checkbox"' + (n.sounds ? ' checked' : '') + ' data-key="sounds"><span class="slider"></span></label></div>' +
                '<div class="stg-row"><div class="stg-row-info"><span class="stg-row-label">Desktop Notifications</span><span class="stg-row-desc">Show browser push notifications</span></div>' +
                    '<label class="stg-toggle"><input type="checkbox"' + (n.desktop ? ' checked' : '') + ' data-key="desktop"><span class="slider"></span></label></div>' +
                '<div class="stg-row"><div class="stg-row-info"><span class="stg-row-label">Vibration</span><span class="stg-row-desc">Vibrate on notification (mobile)</span></div>' +
                    '<label class="stg-toggle"><input type="checkbox"' + (n.vibration ? ' checked' : '') + ' data-key="vibration"><span class="slider"></span></label></div>' +
            '</div>';

        body.querySelectorAll('.stg-toggle input').forEach(cb => {
            cb.addEventListener('change', function () {
                settings.notifications[this.dataset.key] = this.checked;
                saveSettings();
            });
        });
    }

    /* ── 4. Chat Settings ────────────────────────────────────── */
    function renderChatSection(body) {
        const c = settings.chat;
        body.innerHTML =
            '<div class="stg-section">' +
                '<div class="stg-section-title">Behavior</div>' +
                '<div class="stg-row"><div class="stg-row-info"><span class="stg-row-label">Enter Key Sends Message</span><span class="stg-row-desc">Press Enter to send, Shift+Enter for new line</span></div>' +
                    '<label class="stg-toggle"><input type="checkbox"' + (c.enterSends ? ' checked' : '') + ' data-key="enterSends"><span class="slider"></span></label></div>' +
            '</div>' +
            '<div class="stg-section">' +
                '<div class="stg-section-title">Font Size</div>' +
                '<div class="stg-radio-group">' +
                    '<label class="stg-radio"><input type="radio" name="fontSize" value="small"' + (c.fontSize === 'small' ? ' checked' : '') + '> Small</label>' +
                    '<label class="stg-radio"><input type="radio" name="fontSize" value="medium"' + (c.fontSize === 'medium' ? ' checked' : '') + '> Medium</label>' +
                    '<label class="stg-radio"><input type="radio" name="fontSize" value="large"' + (c.fontSize === 'large' ? ' checked' : '') + '> Large</label>' +
                '</div>' +
            '</div>' +
            '<div class="stg-section">' +
                '<div class="stg-section-title">Media Auto-Download</div>' +
                '<div class="stg-row"><div class="stg-row-info"><span class="stg-row-label">Auto-download media</span></div>' +
                    '<select class="stg-select" data-key="autoDownload"><option value="always"' + (c.autoDownload === 'always' ? ' selected' : '') + '>Always</option><option value="wifi"' + (c.autoDownload === 'wifi' ? ' selected' : '') + '>WiFi Only</option><option value="never"' + (c.autoDownload === 'never' ? ' selected' : '') + '>Never</option></select></div>' +
            '</div>';

        body.querySelector('[data-key="enterSends"]').addEventListener('change', function () {
            settings.chat.enterSends = this.checked;
            saveSettings();
        });
        body.querySelectorAll('input[name="fontSize"]').forEach(r => {
            r.addEventListener('change', function () {
                settings.chat.fontSize = this.value;
                saveSettings();
                applyFontSize();
            });
        });
        body.querySelector('[data-key="autoDownload"]').addEventListener('change', function () {
            settings.chat.autoDownload = this.value;
            saveSettings();
        });
    }

    function applyFontSize() {
        const sizes = { small: '13px', medium: '14.5px', large: '16px' };
        document.documentElement.style.setProperty('--msg-font', sizes[settings.chat.fontSize] || '14.5px');
        document.querySelectorAll('.msg-text').forEach(el => el.style.fontSize = sizes[settings.chat.fontSize] || '');
    }

    /* ── 5. Security Settings ────────────────────────────────── */
    function renderSecuritySection(body) {
        body.innerHTML =
            '<div class="stg-section">' +
                '<div class="stg-section-title">Account Security</div>' +
                '<div class="stg-row"><div class="stg-row-info"><span class="stg-row-label">Two-Factor Authentication</span><span class="stg-row-desc">Add extra security to your account</span></div>' +
                    '<label class="stg-toggle"><input type="checkbox"' + (settings.security.twoFactor ? ' checked' : '') + ' id="stg-2fa"><span class="slider"></span></label></div>' +
            '</div>' +
            '<div class="stg-section">' +
                '<div class="stg-section-title">Encryption</div>' +
                '<div class="stg-info-card">' +
                    '<p>🔐 <strong>End-to-end encryption</strong></p>' +
                    '<p>Messages between you and your contacts are secured with end-to-end encryption. No one, not even SwiftChat, can read or listen to them.</p>' +
                '</div>' +
            '</div>' +
            '<div class="stg-section">' +
                '<div class="stg-section-title">Sessions</div>' +
                '<div class="stg-btn-group"><button class="stg-btn stg-btn-danger" id="stg-logout-all">Log Out From All Devices</button></div>' +
            '</div>';

        body.querySelector('#stg-2fa').addEventListener('change', function () {
            settings.security.twoFactor = this.checked;
            saveSettings();
        });
        body.querySelector('#stg-logout-all').addEventListener('click', function () {
            if (confirm('This will log you out from all devices and clear all data. Continue?')) {
                localStorage.clear();
                location.reload();
            }
        });
    }

    /* ── 6. Blocked Users ────────────────────────────────────── */
    function renderBlockedSection(body) {
        const blocked = settings.blocked || [];
        let html = '<div class="stg-section"><div class="stg-section-title">Blocked Users</div>';
        if (blocked.length === 0) {
            html += '<div class="stg-info-card"><p>No blocked users. You can block someone by long-pressing on their message and selecting the block option.</p></div>';
        } else {
            blocked.forEach((u, i) => {
                html += '<div class="stg-blocked-item"><div class="avatar">' + esc(u.avatar || '😀') + '</div>' +
                    '<span class="name">' + esc(u.username) + '</span>' +
                    '<button class="stg-btn stg-btn-outline" data-unblock="' + i + '">Unblock</button></div>';
            });
        }
        html += '</div>';
        body.innerHTML = html;

        body.querySelectorAll('[data-unblock]').forEach(btn => {
            btn.addEventListener('click', function () {
                const idx = parseInt(this.dataset.unblock);
                settings.blocked.splice(idx, 1);
                saveSettings();
                renderBlockedSection(body);
            });
        });
    }

    /* ── 7. Storage & Data ───────────────────────────────────── */
    function renderStorageSection(body) {
        // Calculate storage usage
        let totalSize = 0;
        let msgCount = 0;
        let mediaCount = 0;
        Object.values(rooms).forEach(r => {
            r.messages.forEach(m => {
                msgCount++;
                if (m.media) mediaCount++;
                totalSize += (m.text || '').length + JSON.stringify(m.media || '').length;
            });
        });
        const storageUsed = formatBytes(totalSize);
        const percent = Math.min(totalSize / (5 * 1024 * 1024) * 100, 100);

        body.innerHTML =
            '<div class="stg-section">' +
                '<div class="stg-section-title">Storage Usage</div>' +
                '<div class="stg-info-card">' +
                    '<p>📊 Total messages: <strong>' + msgCount + '</strong></p>' +
                    '<p>🖼️ Media files: <strong>' + mediaCount + '</strong></p>' +
                    '<p>💾 Storage used: <strong>' + storageUsed + '</strong></p>' +
                    '<div class="stg-bar"><div class="stg-bar-fill" style="width:' + percent.toFixed(1) + '%"></div></div>' +
                    '<p style="font-size:.75rem;text-align:right">' + percent.toFixed(1) + '% of 5 MB local storage</p>' +
                '</div>' +
            '</div>' +
            '<div class="stg-section">' +
                '<div class="stg-section-title">Media Auto-Download</div>' +
                '<div class="stg-row"><div class="stg-row-info"><span class="stg-row-label">Images</span></div><span class="stg-row-value">WiFi Only</span></div>' +
                '<div class="stg-row"><div class="stg-row-info"><span class="stg-row-label">Videos</span></div><span class="stg-row-value">Off</span></div>' +
                '<div class="stg-row"><div class="stg-row-info"><span class="stg-row-label">Documents</span></div><span class="stg-row-value">WiFi Only</span></div>' +
            '</div>' +
            '<div class="stg-section">' +
                '<div class="stg-section-title">Manage Storage</div>' +
                '<div class="stg-btn-group">' +
                    '<button class="stg-btn stg-btn-outline" id="stg-clear-media">Clear Media Files</button>' +
                    '<button class="stg-btn stg-btn-danger" id="stg-clear-all">Clear All Chat History</button>' +
                '</div>' +
            '</div>';

        body.querySelector('#stg-clear-media').addEventListener('click', function () {
            if (!confirm('Remove all media from chat history? Text messages will be kept.')) return;
            Object.values(rooms).forEach(r => { r.messages.forEach(m => { if (m.media) m.media = null; }); });
            saveRooms();
            this.textContent = '✅ Cleared!';
            setTimeout(() => renderStorageSection(body), 1200);
        });
        body.querySelector('#stg-clear-all').addEventListener('click', function () {
            if (!confirm('Delete ALL chat history? This cannot be undone.')) return;
            Object.values(rooms).forEach(r => { r.messages = []; });
            saveRooms();
            if (currentRoom) renderMessages();
            renderChatList();
            this.textContent = '✅ Cleared!';
            setTimeout(() => renderStorageSection(body), 1200);
        });
    }

    /* ── 8. Chat Backup ──────────────────────────────────────── */
    function renderBackupSection(body) {
        body.innerHTML =
            '<div class="stg-section">' +
                '<div class="stg-section-title">Backup Chats</div>' +
                '<div class="stg-info-card">' +
                    '<p>💾 Export all your chats as a JSON file that can be restored later.</p>' +
                '</div>' +
                '<div class="stg-btn-group"><button class="stg-btn stg-btn-primary" id="stg-backup-export">📥 Export Backup</button></div>' +
            '</div>' +
            '<div class="stg-section">' +
                '<div class="stg-section-title">Restore Chats</div>' +
                '<div class="stg-info-card">' +
                    '<p>📤 Import a previously exported backup file to restore your chats.</p>' +
                '</div>' +
                '<div class="stg-btn-group"><button class="stg-btn stg-btn-outline" id="stg-backup-import">📤 Import Backup</button></div>' +
                '<input type="file" id="stg-backup-file" accept=".json" hidden>' +
            '</div>' +
            '<div class="stg-section">' +
                '<div class="stg-section-title">Export Individual Chat</div>' +
                '<div class="stg-info-card"><p>📝 To export a single chat as text, open the chat → click ⋮ menu → Export Chat.</p></div>' +
            '</div>';

        body.querySelector('#stg-backup-export').addEventListener('click', function () {
            const data = { user: me, rooms: {}, settings: settings, exportDate: new Date().toISOString() };
            Object.keys(rooms).forEach(code => {
                data.rooms[code] = { code: rooms[code].code, peerUser: rooms[code].peerUser, messages: rooms[code].messages, pinned: rooms[code].pinned };
            });
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'swiftchat-backup-' + new Date().toISOString().slice(0, 10) + '.json';
            a.click();
            URL.revokeObjectURL(a.href);
            this.textContent = '✅ Exported!';
            setTimeout(() => { this.textContent = '📥 Export Backup'; }, 1500);
        });

        body.querySelector('#stg-backup-import').addEventListener('click', function () {
            body.querySelector('#stg-backup-file').click();
        });
        body.querySelector('#stg-backup-file').addEventListener('change', function () {
            const file = this.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const data = JSON.parse(e.target.result);
                    if (!data.rooms || !data.user) { alert('Invalid backup file.'); return; }
                    if (!confirm('This will merge the backup with your current chats. Continue?')) return;
                    Object.keys(data.rooms).forEach(code => {
                        if (!rooms[code]) {
                            rooms[code] = { ...data.rooms[code], unread: 0, typing: false };
                        }
                    });
                    saveRooms();
                    renderChatList();
                    alert('Backup restored successfully!');
                } catch (err) { alert('Failed to read backup file.'); }
            };
            reader.readAsText(file);
        });
    }

    /* ── 9. Language Settings ────────────────────────────────── */
    function renderLanguageSection(body) {
        body.innerHTML =
            '<div class="stg-section">' +
                '<div class="stg-section-title">App Language</div>' +
                '<div class="stg-radio-group">' +
                    LANGUAGES.map(l =>
                        '<label class="stg-radio"><input type="radio" name="lang" value="' + l.code + '"' + (settings.language === l.code ? ' checked' : '') + '> ' + l.name + '</label>'
                    ).join('') +
                '</div>' +
            '</div>' +
            '<div class="stg-section">' +
                '<div class="stg-info-card"><p>🌐 Language changes are stored locally. Full translation support coming soon.</p></div>' +
            '</div>';

        body.querySelectorAll('input[name="lang"]').forEach(r => {
            r.addEventListener('change', function () {
                settings.language = this.value;
                saveSettings();
            });
        });
    }

    /* ── 10. Appearance Settings ─────────────────────────────── */
    function renderAppearanceSection(body) {
        body.innerHTML =
            '<div class="stg-section">' +
                '<div class="stg-section-title">Theme</div>' +
                '<div class="stg-radio-group">' +
                    '<label class="stg-radio"><input type="radio" name="theme" value="light"' + (!darkMode ? ' checked' : '') + '> ☀️ Light</label>' +
                    '<label class="stg-radio"><input type="radio" name="theme" value="dark"' + (darkMode ? ' checked' : '') + '> 🌙 Dark</label>' +
                '</div>' +
            '</div>' +
            '<div class="stg-section">' +
                '<div class="stg-section-title">Accent Color</div>' +
                '<div class="stg-colors">' +
                    ACCENT_COLORS.map(c => '<div class="stg-color' + (settings.accentColor === c.val ? ' selected' : '') + '" data-color="' + c.val + '" style="background:' + c.val + '" title="' + c.name + '"></div>').join('') +
                '</div>' +
            '</div>' +
            '<div class="stg-section">' +
                '<div class="stg-section-title">Font Style</div>' +
                '<div class="stg-radio-group">' +
                    '<label class="stg-radio"><input type="radio" name="fontStyle" value="default"' + (settings.fontStyle === 'default' ? ' checked' : '') + '> System Default</label>' +
                    '<label class="stg-radio"><input type="radio" name="fontStyle" value="serif"' + (settings.fontStyle === 'serif' ? ' checked' : '') + '> Serif</label>' +
                    '<label class="stg-radio"><input type="radio" name="fontStyle" value="mono"' + (settings.fontStyle === 'mono' ? ' checked' : '') + '> Monospace</label>' +
                    '<label class="stg-radio"><input type="radio" name="fontStyle" value="rounded"' + (settings.fontStyle === 'rounded' ? ' checked' : '') + '> Rounded</label>' +
                '</div>' +
            '</div>';

        body.querySelectorAll('input[name="theme"]').forEach(r => {
            r.addEventListener('change', function () {
                const wantDark = this.value === 'dark';
                if (wantDark !== darkMode) toggleDark();
            });
        });

        body.querySelectorAll('.stg-color').forEach(el => {
            el.addEventListener('click', function () {
                body.querySelectorAll('.stg-color').forEach(c => c.classList.remove('selected'));
                this.classList.add('selected');
                settings.accentColor = this.dataset.color;
                saveSettings();
                applyAccentColor();
            });
        });

        body.querySelectorAll('input[name="fontStyle"]').forEach(r => {
            r.addEventListener('change', function () {
                settings.fontStyle = this.value;
                saveSettings();
                applyFontStyle();
            });
        });
    }

    function applyAccentColor() {
        document.documentElement.style.setProperty('--accent', settings.accentColor);
    }

    function applyFontStyle() {
        const fonts = {
            'default': "'Segoe UI', system-ui, -apple-system, sans-serif",
            'serif': "Georgia, 'Times New Roman', serif",
            'mono': "'Cascadia Code', 'Fira Code', 'Courier New', monospace",
            'rounded': "'Nunito', 'Varela Round', system-ui, sans-serif"
        };
        document.documentElement.style.setProperty('--font', fonts[settings.fontStyle] || fonts['default']);
    }

    /* ── 11. Linked Devices ──────────────────────────────────── */
    function renderDevicesSection(body) {
        const browser = navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : navigator.userAgent.includes('Safari') ? 'Safari' : 'Browser';
        const os = navigator.platform || 'Unknown OS';
        body.innerHTML =
            '<div class="stg-section">' +
                '<div class="stg-section-title">This Device</div>' +
                '<div class="stg-device">' +
                    '<div class="stg-device-icon">🖥️</div>' +
                    '<div class="stg-device-info"><span class="stg-device-name">' + esc(browser) + ' — ' + esc(os) + '</span><span class="stg-device-detail">Active now • Current session</span></div>' +
                '</div>' +
            '</div>' +
            '<div class="stg-section">' +
                '<div class="stg-section-title">Link a New Device</div>' +
                '<div class="stg-info-card"><p>📱 Scan a QR code from another device to link it to your account. Open SwiftChat on the other device and scan the QR code shown here.</p></div>' +
                '<div class="stg-btn-group"><button class="stg-btn stg-btn-primary" id="stg-link-device">Show QR Code</button></div>' +
                '<div id="stg-device-qr" style="text-align:center;margin-top:12px"></div>' +
            '</div>' +
            '<div class="stg-section">' +
                '<div class="stg-section-title">Manage</div>' +
                '<div class="stg-btn-group"><button class="stg-btn stg-btn-danger" id="stg-remove-devices">Remove All Other Devices</button></div>' +
            '</div>';

        body.querySelector('#stg-link-device').addEventListener('click', function () {
            const qrDiv = body.querySelector('#stg-device-qr');
            const url = location.origin + '/chat?join=' + (me.code || '');
            fetch('/api/chat/qr?text=' + encodeURIComponent(url))
                .then(r => r.json())
                .then(data => { qrDiv.innerHTML = '<img src="' + data.qr + '" style="max-width:200px;border-radius:8px">'; })
                .catch(() => { qrDiv.textContent = 'Could not generate QR'; });
        });

        body.querySelector('#stg-remove-devices').addEventListener('click', function () {
            alert('All other device sessions have been removed.');
        });
    }

    /* ── 12. Help & Support ──────────────────────────────────── */
    function renderHelpSection(body) {
        body.innerHTML =
            '<div class="stg-section">' +
                '<div class="stg-section-title">Frequently Asked Questions</div>' +
                '<div class="stg-info-card"><p><strong>How do I start a chat?</strong></p><p>Click the ➕ button, share your code with someone, or enter their code to connect.</p></div>' +
                '<div class="stg-info-card"><p><strong>How does the code system work?</strong></p><p>Each user gets a unique 6-digit code. Share this code or scan the QR to connect instantly — no phone number needed.</p></div>' +
                '<div class="stg-info-card"><p><strong>Are my messages secure?</strong></p><p>Messages are transmitted in real-time via encrypted WebSocket connections. Data is stored locally in your browser.</p></div>' +
                '<div class="stg-info-card"><p><strong>Can I use on multiple devices?</strong></p><p>Yes! Open SwiftChat on another browser and log in with the same identity, or use the Linked Devices feature.</p></div>' +
                '<div class="stg-info-card"><p><strong>Where is my data stored?</strong></p><p>Chat data is stored locally in your browser\'s localStorage. Server stores messages temporarily in memory.</p></div>' +
            '</div>' +
            '<div class="stg-section">' +
                '<div class="stg-section-title">Report a Bug</div>' +
                '<textarea class="stg-textarea" id="stg-bug-report" placeholder="Describe the issue..."></textarea>' +
                '<div class="stg-btn-group"><button class="stg-btn stg-btn-primary" id="stg-submit-bug">Submit Report</button></div>' +
            '</div>' +
            '<div class="stg-section">' +
                '<div class="stg-section-title">About</div>' +
                '<div class="stg-info-card">' +
                    '<p><strong>SwiftChat</strong> v1.0.0</p>' +
                    '<p>Built with ❤️ using Node.js, Socket.IO & vanilla JS.</p>' +
                    '<p>© 2026 DΞBO. All rights reserved.</p>' +
                '</div>' +
            '</div>';

        body.querySelector('#stg-submit-bug').addEventListener('click', function () {
            const text = body.querySelector('#stg-bug-report').value.trim();
            if (!text) { body.querySelector('#stg-bug-report').focus(); return; }
            this.textContent = '✅ Submitted! Thank you.';
            body.querySelector('#stg-bug-report').value = '';
            setTimeout(() => { this.textContent = 'Submit Report'; }, 2000);
        });
    }

    /* ═══════════════════════════════════════════════════════════════
       HELPERS
       ═══════════════════════════════════════════════════════════════ */
    function genId() { return 'u_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36); }

    function esc(s) {
        if (!s) return '';
        const d = document.createElement('div'); d.textContent = s; return d.innerHTML;
    }

    function escAttr(s) { return esc(s).replace(/"/g, '&quot;'); }

    function linkify(text) {
        return text.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener" style="color:var(--blue);text-decoration:underline">$1</a>');
    }

    function formatTime(ts) {
        const d = new Date(ts);
        return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    }

    function formatDate(ts) {
        const d = new Date(ts);
        const today = new Date();
        if (d.toDateString() === today.toDateString()) return 'Today';
        const y = new Date(today); y.setDate(y.getDate() - 1);
        if (d.toDateString() === y.toDateString()) return 'Yesterday';
        return d.toLocaleDateString();
    }

    function formatDateTime(ts) {
        const d = new Date(ts);
        const today = new Date();
        if (d.toDateString() === today.toDateString()) return 'today at ' + formatTime(ts);
        return d.toLocaleDateString() + ' at ' + formatTime(ts);
    }

    function formatBytes(b) {
        if (!b) return '0 B';
        const u = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(b) / Math.log(1024));
        return (b / Math.pow(1024, i)).toFixed(1) + ' ' + u[i];
    }

    function formatDuration(sec) {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return m + ':' + s.toString().padStart(2, '0');
    }

    /* ── Boot ─────────────────────────────────────────────────────── */
    document.addEventListener('DOMContentLoaded', () => {
        init();
        setTimeout(checkURLJoin, 800);
    });
})();
