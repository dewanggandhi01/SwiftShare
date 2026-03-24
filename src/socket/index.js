const { chatUsers, chatRooms, socketToUser, randomLobby, gameRooms, generateChatCode, generateMsgId, generateGameCode } = require('../utils/helpers');
const config = require('../config');

module.exports = function initSocket(io) {
    io.on('connection', (socket) => {
        // ── SwiftDrop transfer signals ──
        socket.on('join-room', (code) => {
            if (typeof code === 'string' && code.length <= 20) {
                socket.join(code);
                socket.to(code).emit('peer-joined');
            }
        });

        socket.on('signal', ({ code, signal }) => {
            if (typeof code === 'string' && code.length <= 20) {
                socket.to(code).emit('signal', signal);
            }
        });

        socket.on('p2p-request', (code) => {
            socket.to(code).emit('p2p-request');
        });

        socket.on('p2p-ready', (code) => {
            socket.to(code).emit('p2p-ready');
        });

        // ═══════════════════════════════════════════════════════════════
        // CHAT EVENTS
        // ═══════════════════════════════════════════════════════════════

        socket.on('chat:register', (data) => {
            if (!data || !data.userId || !data.username) return;
            const uid = String(data.userId).substring(0, 50);
            const existing = chatUsers.get(uid);
            const code = existing ? existing.code : generateChatCode();

            const user = {
                id: uid,
                username: String(data.username).substring(0, 30),
                avatar: String(data.avatar || '😀').substring(0, 4),
                socketId: socket.id,
                online: true,
                lastSeen: Date.now(),
                code: code,
                rooms: existing ? existing.rooms : new Set()
            };
            chatUsers.set(uid, user);
            socketToUser.set(socket.id, uid);

            socket.emit('chat:registered', { code: user.code });

            // Rejoin all socket rooms
            user.rooms.forEach(roomCode => socket.join('chat:' + roomCode));

            // Notify peers of online status
            broadcastUserStatus(io, uid, true);
        });

        socket.on('chat:get-code', () => {
            const uid = socketToUser.get(socket.id);
            if (!uid || !chatUsers.has(uid)) return;
            socket.emit('chat:my-code', chatUsers.get(uid).code);
        });

        socket.on('chat:join-room', (data) => {
            if (!data || !data.code) return;
            const uid = socketToUser.get(socket.id);
            if (!uid || !chatUsers.has(uid)) return;
            const code = String(data.code).toUpperCase().trim();
            const me = chatUsers.get(uid);

            // Find the user who owns this code
            let targetUser = null;
            for (const [, u] of chatUsers) {
                if (u.code === code && u.id !== uid) { targetUser = u; break; }
            }

            if (!targetUser) {
                socket.emit('chat:error', { message: 'Code not found. Make sure the other person is online.' });
                return;
            }

            // Check if room already exists between these two
            let existingRoom = null;
            for (const [, room] of chatRooms) {
                if (room.users.includes(uid) && room.users.includes(targetUser.id)) {
                    existingRoom = room;
                    break;
                }
            }

            if (existingRoom) {
                socket.join('chat:' + existingRoom.code);
                me.rooms.add(existingRoom.code);
                socket.emit('chat:room-joined', {
                    code: existingRoom.code,
                    peerUser: { id: targetUser.id, username: targetUser.username, avatar: targetUser.avatar, online: targetUser.online, lastSeen: targetUser.lastSeen },
                    messages: existingRoom.messages
                });
                return;
            }

            // Create new room
            const roomCode = generateChatCode();
            const room = {
                code: roomCode,
                users: [uid, targetUser.id],
                messages: [{
                    id: generateMsgId(),
                    roomCode: roomCode,
                    senderId: 'system',
                    text: me.username + ' connected with ' + targetUser.username,
                    type: 'system',
                    timestamp: Date.now(),
                    status: 'read'
                }],
                createdAt: Date.now()
            };
            chatRooms.set(roomCode, room);

            me.rooms.add(roomCode);
            targetUser.rooms.add(roomCode);

            socket.join('chat:' + roomCode);

            // Notify self
            socket.emit('chat:room-joined', {
                code: roomCode,
                peerUser: { id: targetUser.id, username: targetUser.username, avatar: targetUser.avatar, online: targetUser.online, lastSeen: targetUser.lastSeen },
                messages: room.messages
            });

            // Notify target
            if (targetUser.socketId) {
                const targetSocket = io.sockets.sockets.get(targetUser.socketId);
                if (targetSocket) {
                    targetSocket.join('chat:' + roomCode);
                    targetSocket.emit('chat:room-joined', {
                        code: roomCode,
                        peerUser: { id: me.id, username: me.username, avatar: me.avatar, online: me.online, lastSeen: me.lastSeen },
                        messages: room.messages
                    });
                }
            }
        });

        socket.on('chat:rejoin-room', (data) => {
            if (!data || !data.code) return;
            const uid = socketToUser.get(socket.id);
            if (!uid) return;
            const room = chatRooms.get(data.code);
            if (room && room.users.includes(uid)) {
                socket.join('chat:' + data.code);
            }
        });

        socket.on('chat:message', (data) => {
            if (!data || !data.roomCode) return;
            const uid = socketToUser.get(socket.id);
            if (!uid) return;
            const room = chatRooms.get(data.roomCode);
            if (!room || !room.users.includes(uid)) return;

            const msg = {
                id: generateMsgId(),
                roomCode: data.roomCode,
                senderId: uid,
                text: String(data.text || '').substring(0, 5000),
                type: ['text', 'image', 'file', 'voice'].includes(data.type) ? data.type : 'text',
                timestamp: Date.now(),
                status: 'sent',
                replyTo: data.replyTo || null,
                reactions: {},
                edited: false,
                deleted: false,
                media: data.media ? {
                    url: String(data.media.url || '').substring(0, 500),
                    name: String(data.media.name || '').substring(0, 200),
                    size: Number(data.media.size) || 0,
                    type: String(data.media.type || '').substring(0, 50),
                    duration: data.media.duration || null
                } : null
            };

            room.messages.push(msg);
            if (room.messages.length > config.MAX_MESSAGES_PER_ROOM) {
                room.messages = room.messages.slice(-config.MAX_MESSAGES_PER_ROOM);
            }

            // Check if peer is in the room (socket room)
            const peerUid = room.users.find(u => u !== uid);
            const peerUser = peerUid ? chatUsers.get(peerUid) : null;
            if (peerUser && peerUser.socketId) {
                const peerSocket = io.sockets.sockets.get(peerUser.socketId);
                if (peerSocket && peerSocket.rooms.has('chat:' + data.roomCode)) {
                    msg.status = 'delivered';
                }
            }

            io.to('chat:' + data.roomCode).emit('chat:new-message', msg);
        });

        socket.on('chat:typing', (data) => {
            if (!data || !data.roomCode) return;
            const uid = socketToUser.get(socket.id);
            if (!uid) return;
            const user = chatUsers.get(uid);
            socket.to('chat:' + data.roomCode).emit('chat:typing', {
                roomCode: data.roomCode,
                userId: uid,
                username: user ? user.username : 'User',
                typing: !!data.typing
            });
        });

        socket.on('chat:read', (data) => {
            if (!data || !data.roomCode || !data.messageIds) return;
            const uid = socketToUser.get(socket.id);
            if (!uid) return;
            const room = chatRooms.get(data.roomCode);
            if (!room) return;
            const ids = Array.isArray(data.messageIds) ? data.messageIds.slice(0, 100) : [];
            ids.forEach(id => {
                const msg = room.messages.find(m => m.id === id);
                if (msg && msg.senderId !== uid) msg.status = 'read';
            });
            socket.to('chat:' + data.roomCode).emit('chat:messages-read', { roomCode: data.roomCode, messageIds: ids });
        });

        socket.on('chat:react', (data) => {
            if (!data || !data.roomCode || !data.messageId || !data.emoji) return;
            const uid = socketToUser.get(socket.id);
            if (!uid) return;
            const room = chatRooms.get(data.roomCode);
            if (!room) return;
            const msg = room.messages.find(m => m.id === data.messageId);
            if (!msg) return;
            if (!msg.reactions) msg.reactions = {};
            const emoji = String(data.emoji).substring(0, 4);
            if (msg.reactions[uid] === emoji) delete msg.reactions[uid];
            else msg.reactions[uid] = emoji;
            io.to('chat:' + data.roomCode).emit('chat:message-reacted', {
                roomCode: data.roomCode, messageId: data.messageId, userId: uid, emoji: emoji
            });
        });

        socket.on('chat:edit', (data) => {
            if (!data || !data.roomCode || !data.messageId) return;
            const uid = socketToUser.get(socket.id);
            if (!uid) return;
            const room = chatRooms.get(data.roomCode);
            if (!room) return;
            const msg = room.messages.find(m => m.id === data.messageId && m.senderId === uid);
            if (!msg) return;
            msg.text = String(data.newText || '').substring(0, 5000);
            msg.edited = true;
            io.to('chat:' + data.roomCode).emit('chat:message-edited', {
                roomCode: data.roomCode, messageId: data.messageId, newText: msg.text
            });
        });

        socket.on('chat:delete', (data) => {
            if (!data || !data.roomCode || !data.messageId) return;
            const uid = socketToUser.get(socket.id);
            if (!uid) return;
            const room = chatRooms.get(data.roomCode);
            if (!room) return;
            const msg = room.messages.find(m => m.id === data.messageId);
            if (!msg) return;
            if (data.forEveryone && msg.senderId === uid) {
                msg.deleted = 'everyone';
                msg.text = '';
                io.to('chat:' + data.roomCode).emit('chat:message-deleted', {
                    roomCode: data.roomCode, messageId: data.messageId, forEveryone: true, userId: uid
                });
            } else {
                socket.emit('chat:message-deleted', {
                    roomCode: data.roomCode, messageId: data.messageId, forEveryone: false, userId: uid
                });
            }
        });

        socket.on('chat:get-history', (data) => {
            if (!data || !data.roomCode) return;
            const uid = socketToUser.get(socket.id);
            if (!uid) return;
            const room = chatRooms.get(data.roomCode);
            if (room && room.users.includes(uid)) {
                socket.emit('chat:history', { roomCode: data.roomCode, messages: room.messages });
            }
        });

        // ═══════════════════════════════════════════════════════════════
        // RANDOM CHAT LOBBY
        // ═══════════════════════════════════════════════════════════════

        // Join the socket room to receive real-time lobby updates (browsing)
        socket.on('random:watch-lobby', () => {
            socket.join('random-lobby');
            socket.emit('random:lobby-update', getLobbyList());
        });

        // Leave the socket room (stop receiving lobby updates)
        socket.on('random:unwatch-lobby', () => {
            socket.leave('random-lobby');
        });

        // Go online — make yourself visible in the lobby
        socket.on('random:join-lobby', () => {
            const uid = socketToUser.get(socket.id);
            if (!uid || !chatUsers.has(uid)) return;
            const user = chatUsers.get(uid);

            // Don't add if already in lobby
            if (randomLobby.has(uid)) return;

            const tag = 'Stranger #' + generateChatCode().substring(0, 4);
            randomLobby.set(uid, {
                userId: uid,
                username: user.username,
                avatar: user.avatar,
                socketId: socket.id,
                tag: tag,
                joinedAt: Date.now()
            });

            // Ensure they're in the room too
            socket.join('random-lobby');
            io.to('random-lobby').emit('random:lobby-update', getLobbyList());
        });

        // Go offline — remove yourself from lobby but stay watching
        socket.on('random:leave-lobby', () => {
            const uid = socketToUser.get(socket.id);
            if (!uid) return;
            randomLobby.delete(uid);
            io.to('random-lobby').emit('random:lobby-update', getLobbyList());
        });

        socket.on('random:connect', (data) => {
            if (!data || !data.targetUserId) return;
            const uid = socketToUser.get(socket.id);
            if (!uid || !chatUsers.has(uid)) return;
            const me = chatUsers.get(uid);

            const targetId = String(data.targetUserId);
            const targetEntry = randomLobby.get(targetId);
            if (!targetEntry) {
                socket.emit('random:error', { message: 'This stranger is no longer available.' });
                return;
            }

            const targetUser = chatUsers.get(targetId);
            if (!targetUser) {
                socket.emit('random:error', { message: 'User not found.' });
                return;
            }

            // Get anonymous tags
            const myEntry = randomLobby.get(uid);
            const myTag = myEntry ? myEntry.tag : ('Stranger #' + generateChatCode().substring(0, 4));
            const targetTag = targetEntry.tag;

            // Remove both from lobby
            randomLobby.delete(uid);
            randomLobby.delete(targetId);
            socket.leave('random-lobby');

            // Create a random chat room
            const roomCode = generateChatCode();
            const room = {
                code: roomCode,
                users: [uid, targetId],
                isRandom: true,
                messages: [{
                    id: generateMsgId(),
                    roomCode: roomCode,
                    senderId: 'system',
                    text: 'Random chat started! Say hi to your new stranger.',
                    type: 'system',
                    timestamp: Date.now(),
                    status: 'read'
                }],
                createdAt: Date.now()
            };
            chatRooms.set(roomCode, room);
            me.rooms.add(roomCode);
            targetUser.rooms.add(roomCode);

            // Anonymous avatars for random chats
            const anonAvatars = ['👤', '🎭', '🕶️', '🤿', '🥷'];
            const myAnonAvatar = anonAvatars[Math.floor(Math.random() * anonAvatars.length)];
            const targetAnonAvatar = anonAvatars[Math.floor(Math.random() * anonAvatars.length)];

            socket.join('chat:' + roomCode);
            socket.emit('chat:room-joined', {
                code: roomCode,
                isRandom: true,
                peerUser: { id: targetUser.id, username: targetTag, avatar: targetAnonAvatar, online: targetUser.online, lastSeen: targetUser.lastSeen },
                messages: room.messages
            });

            // Notify target
            if (targetUser.socketId) {
                const targetSocket = io.sockets.sockets.get(targetUser.socketId);
                if (targetSocket) {
                    targetSocket.leave('random-lobby');
                    targetSocket.join('chat:' + roomCode);
                    targetSocket.emit('chat:room-joined', {
                        code: roomCode,
                        isRandom: true,
                        peerUser: { id: me.id, username: myTag, avatar: myAnonAvatar, online: me.online, lastSeen: me.lastSeen },
                        messages: room.messages
                    });
                    targetSocket.emit('random:matched');
                }
            }

            socket.emit('random:matched');

            // Broadcast updated lobby
            io.to('random-lobby').emit('random:lobby-update', getLobbyList());
        });

        // ═══════════════════════════════════════════════════════════════
        // SCRIBBLE GAME EVENTS
        // ═══════════════════════════════════════════════════════════════

        socket.on('game:create', (data) => {
            if (!data || !data.player || !data.player.id || !data.player.name) return;
            const code = generateGameCode();
            const player = sanitizePlayer(data.player, true);
            const room = {
                code,
                host: player.id,
                players: [player],
                settings: {
                    rounds: clamp(data.settings?.rounds || 3, 1, 10),
                    drawTime: clamp(data.settings?.drawTime || 80, 30, 180),
                    hints: clamp(data.settings?.hints || 2, 0, 3)
                },
                state: 'lobby', // lobby | playing | ended
                round: 0,
                currentDrawer: null,
                currentWord: '',
                drawOrder: [],
                drawIndex: 0,
                guessedPlayers: new Set(),
                roundTimer: null,
                hintTimer: null,
                hintsGiven: 0
            };
            gameRooms.set(code, room);
            socket.join('game:' + code);
            socket.emit('game:created', { roomCode: code, players: room.players });
        });

        socket.on('game:join', (data) => {
            if (!data || !data.player || !data.roomCode) return;
            const code = String(data.roomCode).toUpperCase().trim();
            const room = gameRooms.get(code);
            if (!room) return socket.emit('game:error', { message: 'Room not found.' });
            if (room.state !== 'lobby') return socket.emit('game:error', { message: 'Game already in progress.' });
            if (room.players.length >= 8) return socket.emit('game:error', { message: 'Room is full (8/8).' });
            if (room.players.some(p => p.id === data.player.id)) return socket.emit('game:error', { message: 'Already in room.' });

            const player = sanitizePlayer(data.player, false);
            room.players.push(player);
            socket.join('game:' + code);
            socket.emit('game:joined', { roomCode: code, players: room.players, isHost: false, settings: room.settings });
            socket.to('game:' + code).emit('game:player-joined', { players: room.players, name: player.name });
        });

        socket.on('game:rejoin', (data) => {
            if (!data || !data.player || !data.roomCode) return;
            const room = gameRooms.get(data.roomCode);
            if (!room) return;
            const existing = room.players.find(p => p.id === data.player.id);
            if (!existing) return;
            existing.socketId = socket.id;
            socket.join('game:' + data.roomCode);
            socket.emit('game:joined', {
                roomCode: data.roomCode,
                players: room.players,
                isHost: room.host === data.player.id,
                settings: room.settings
            });
        });

        socket.on('game:leave', (data) => {
            if (!data || !data.roomCode) return;
            const room = gameRooms.get(data.roomCode);
            if (!room) return;
            const uid = findPlayerId(socket, room);
            if (!uid) return;
            const name = room.players.find(p => p.id === uid)?.name || 'Player';
            room.players = room.players.filter(p => p.id !== uid);
            socket.leave('game:' + data.roomCode);

            if (room.players.length === 0) {
                clearGameTimers(room);
                gameRooms.delete(data.roomCode);
                return;
            }

            let newHostId = null;
            if (room.host === uid) {
                room.host = room.players[0].id;
                room.players[0].isHost = true;
                newHostId = room.host;
            }
            io.to('game:' + data.roomCode).emit('game:player-left', { players: room.players, name, newHostId });

            if (room.state === 'playing' && room.currentDrawer === uid) {
                endRound(io, data.roomCode);
            }
        });

        socket.on('game:update-settings', (data) => {
            if (!data || !data.roomCode || !data.settings) return;
            const room = gameRooms.get(data.roomCode);
            if (!room || room.state !== 'lobby') return;
            const uid = findPlayerId(socket, room);
            if (uid !== room.host) return;
            room.settings.rounds = clamp(data.settings.rounds || 3, 1, 10);
            room.settings.drawTime = clamp(data.settings.drawTime || 80, 30, 180);
            room.settings.hints = clamp(data.settings.hints || 2, 0, 3);
            socket.to('game:' + data.roomCode).emit('game:settings-updated', { settings: room.settings });
        });

        socket.on('game:lobby-chat', (data) => {
            if (!data || !data.roomCode || !data.text) return;
            const room = gameRooms.get(data.roomCode);
            if (!room) return;
            const uid = findPlayerId(socket, room);
            const player = room.players.find(p => p.id === uid);
            if (!player) return;
            const text = String(data.text).substring(0, 200);
            io.to('game:' + data.roomCode).emit('game:lobby-chat', { name: player.name, text });
        });

        socket.on('game:start', (data) => {
            if (!data || !data.roomCode) return;
            const room = gameRooms.get(data.roomCode);
            if (!room) return;
            const uid = findPlayerId(socket, room);
            if (uid !== room.host) return;
            if (room.players.length < 2) return socket.emit('game:error', { message: 'Need at least 2 players.' });
            if (room.state === 'playing') return;

            if (data.settings) {
                room.settings.rounds = clamp(data.settings.rounds || room.settings.rounds, 1, 10);
                room.settings.drawTime = clamp(data.settings.drawTime || room.settings.drawTime, 30, 180);
                room.settings.hints = clamp(data.settings.hints ?? room.settings.hints, 0, 3);
            }

            room.state = 'playing';
            room.round = 0;
            room.players.forEach(p => { p.score = 0; p.guessed = false; });
            room.drawOrder = shuffleArray(room.players.map(p => p.id));
            room.drawIndex = 0;

            io.to('game:' + data.roomCode).emit('game:started', { players: room.players, settings: room.settings });
            nextTurn(io, data.roomCode);
        });

        socket.on('game:pick-word', (data) => {
            if (!data || !data.roomCode || !data.word) return;
            const room = gameRooms.get(data.roomCode);
            if (!room || room.state !== 'playing') return;
            const uid = findPlayerId(socket, room);
            if (uid !== room.currentDrawer) return;
            const word = String(data.word).substring(0, 40);
            room.currentWord = word;
            room.guessedPlayers = new Set();
            room.hintsGiven = 0;

            const hint = word.split('').map(c => c === ' ' ? '  ' : '_ ').join('');
            io.to('game:' + data.roomCode).emit('game:round-start', {
                drawerId: uid,
                round: room.round,
                totalRounds: room.settings.rounds,
                hint,
                wordLength: word.length,
                word: undefined, // don't send word to guessers
                drawTime: room.settings.drawTime
            });
            // Send full word only to drawer
            const drawerPlayer = room.players.find(p => p.id === uid);
            if (drawerPlayer?.socketId) {
                const drawerSocket = io.sockets.sockets.get(drawerPlayer.socketId);
                if (drawerSocket) drawerSocket.emit('game:round-start', {
                    drawerId: uid, round: room.round, totalRounds: room.settings.rounds,
                    hint, wordLength: word.length, word, drawTime: room.settings.drawTime
                });
            }

            startRoundTimer(io, data.roomCode);
        });

        socket.on('game:draw', (data) => {
            if (!data || !data.roomCode) return;
            const room = gameRooms.get(data.roomCode);
            if (!room || room.state !== 'playing') return;
            const uid = findPlayerId(socket, room);
            if (uid !== room.currentDrawer) return;
            socket.to('game:' + data.roomCode).emit('game:draw', data);
        });

        socket.on('game:clear-canvas', (data) => {
            if (!data || !data.roomCode) return;
            const room = gameRooms.get(data.roomCode);
            if (!room) return;
            const uid = findPlayerId(socket, room);
            if (uid !== room.currentDrawer) return;
            socket.to('game:' + data.roomCode).emit('game:clear-canvas');
        });

        socket.on('game:undo', (data) => {
            if (!data || !data.roomCode) return;
            const room = gameRooms.get(data.roomCode);
            if (!room) return;
            const uid = findPlayerId(socket, room);
            if (uid !== room.currentDrawer) return;
            // Relay drawer's canvas snapshot to others
            socket.to('game:' + data.roomCode).emit('game:undo', {
                dataUrl: typeof data.dataUrl === 'string' ? data.dataUrl.substring(0, 2_000_000) : null
            });
        });

        socket.on('game:guess', (data) => {
            if (!data || !data.roomCode || !data.text) return;
            const room = gameRooms.get(data.roomCode);
            if (!room || room.state !== 'playing' || !room.currentWord) return;
            const uid = findPlayerId(socket, room);
            if (!uid || uid === room.currentDrawer) return;
            if (room.guessedPlayers.has(uid)) return;

            const player = room.players.find(p => p.id === uid);
            if (!player) return;
            const text = String(data.text).substring(0, 100);
            const guess = text.toLowerCase().trim();
            const word = room.currentWord.toLowerCase().trim();

            if (guess === word) {
                room.guessedPlayers.add(uid);
                const timeBonus = Math.ceil((room.settings.drawTime > 0 ? room.settings.drawTime : 80) * 0.5);
                const guessOrder = room.guessedPlayers.size;
                const points = Math.max(10, 100 - (guessOrder - 1) * 15 + timeBonus);
                player.score = (player.score || 0) + points;

                // Give drawer points too
                const drawer = room.players.find(p => p.id === room.currentDrawer);
                if (drawer) drawer.score = (drawer.score || 0) + Math.ceil(points * 0.3);

                io.to('game:' + data.roomCode).emit('game:correct-guess', {
                    playerId: uid, name: player.name, score: player.score
                });
                io.to('game:' + data.roomCode).emit('game:score-update', { players: room.players });

                // Check if all non-drawer players guessed
                const nonDrawers = room.players.filter(p => p.id !== room.currentDrawer);
                if (room.guessedPlayers.size >= nonDrawers.length) {
                    endRound(io, data.roomCode);
                }
            } else if (isCloseGuess(guess, word)) {
                socket.emit('game:close-guess', { name: player.name });
                socket.to('game:' + data.roomCode).emit('game:guess', { name: player.name, text: text });
            } else {
                io.to('game:' + data.roomCode).emit('game:guess', { name: player.name, text: text });
            }
        });

        // ── Disconnect ──
        socket.on('disconnect', () => {
            const uid = socketToUser.get(socket.id);
            if (uid) {
                // Remove from random lobby
                if (randomLobby.has(uid)) {
                    randomLobby.delete(uid);
                    io.to('random-lobby').emit('random:lobby-update', getLobbyList());
                }
                if (chatUsers.has(uid)) {
                    const user = chatUsers.get(uid);
                    user.online = false;
                    user.lastSeen = Date.now();
                    user.socketId = null;
                    broadcastUserStatus(io, uid, false);
                }
                // Handle game room disconnect
                handleGameDisconnect(io, socket, uid);
            }
            socketToUser.delete(socket.id);
        });
    });
};

function broadcastUserStatus(io, userId, online) {
    const user = chatUsers.get(userId);
    if (!user) return;
    user.rooms.forEach(roomCode => {
        io.to('chat:' + roomCode).emit('chat:user-status', {
            userId: userId,
            online: online,
            lastSeen: user.lastSeen
        });
    });
}

function getLobbyList() {
    const list = [];
    for (const [, entry] of randomLobby) {
        list.push({
            oderId: entry.userId,
            tag: entry.tag,
            avatar: entry.avatar,
            joinedAt: entry.joinedAt
        });
    }
    return list;
}

// ═══════════════════════════════════════════════════════════════
// SCRIBBLE GAME HELPERS
// ═══════════════════════════════════════════════════════════════

const WORD_BANK = [
    'apple','banana','car','dog','elephant','fire','guitar','house','island','jungle',
    'kite','lion','moon','notebook','ocean','piano','queen','rainbow','sun','tree',
    'umbrella','volcano','whale','xylophone','yoga','zebra','airplane','bridge','castle',
    'diamond','eagle','flower','ghost','hammer','iceberg','jellyfish','knight','lamp',
    'mountain','ninja','octopus','penguin','robot','sword','telephone','unicorn','violin',
    'waterfall','butterfly','dragon','pirate','rocket','tornado','wizard','anchor','balloon',
    'camera','dolphin','envelope','fountain','globe','helmet','igloo','jacket','kangaroo',
    'lighthouse','magnet','necklace','owl','parachute','quilt','ruler','satellite','telescope',
    'treasure','village','windmill','crystal','feather','garden','horizon','lantern','marble',
    'puzzle','sandwich','caterpillar','firework','giraffe','hamburger','mushroom','pineapple',
    'snowflake','strawberry','sunflower','surfboard','trampoline','basketball','skateboard',
    'headphone','spaceship','raincoat','backpack','campfire','dominoes','fingerprint','goldfish',
    'horseshoe','jigsaw','lollipop','mermaid','nightmare','paintbrush','quicksand','scarecrow',
    'thunderstorm','volleyball','wrestling','birthday','chocolate','cinnamon','dragonfly',
    'earthquake','flamingo','grasshopper','helicopter','invisible','playground','microphone'
];

function getRandomWords(n) {
    const shuffled = WORD_BANK.slice().sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
}

function sanitizePlayer(data, isHost) {
    return {
        id: String(data.id).substring(0, 50),
        name: String(data.name).substring(0, 20),
        avatar: String(data.avatar || '😀').substring(0, 4),
        isHost,
        score: 0,
        guessed: false,
        socketId: null
    };
}

function findPlayerId(socket, room) {
    // Try to find by socketId first, else match by checking
    for (const p of room.players) {
        if (p.socketId === socket.id) return p.id;
    }
    // Assign socketId on first match attempt
    for (const p of room.players) {
        if (!p.socketId) {
            p.socketId = socket.id;
            return p.id;
        }
    }
    return null;
}

function clamp(val, min, max) {
    const n = parseInt(val);
    if (isNaN(n)) return min;
    return Math.min(max, Math.max(min, n));
}

function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function nextTurn(io, roomCode) {
    const room = gameRooms.get(roomCode);
    if (!room || room.state !== 'playing') return;

    if (room.drawIndex >= room.drawOrder.length) {
        room.drawIndex = 0;
        room.round++;
    }
    if (room.round === 0) room.round = 1;

    if (room.round > room.settings.rounds) {
        endGame(io, roomCode);
        return;
    }

    const drawerId = room.drawOrder[room.drawIndex];
    room.drawIndex++;
    room.currentDrawer = drawerId;
    room.currentWord = '';
    room.guessedPlayers = new Set();
    room.hintsGiven = 0;

    const words = getRandomWords(3);
    const drawerPlayer = room.players.find(p => p.id === drawerId);
    if (drawerPlayer?.socketId) {
        const drawerSocket = io.sockets.sockets.get(drawerPlayer.socketId);
        if (drawerSocket) drawerSocket.emit('game:pick-word', { words });
    }

    // Auto-pick after 15 seconds if drawer hasn't chosen
    room.roundTimer = setTimeout(() => {
        if (!room.currentWord && room.state === 'playing') {
            room.currentWord = words[0];
            const hint = words[0].split('').map(c => c === ' ' ? '  ' : '_ ').join('');
            io.to('game:' + roomCode).emit('game:round-start', {
                drawerId, round: room.round, totalRounds: room.settings.rounds,
                hint, wordLength: words[0].length, drawTime: room.settings.drawTime
            });
            if (drawerPlayer?.socketId) {
                const ds = io.sockets.sockets.get(drawerPlayer.socketId);
                if (ds) ds.emit('game:round-start', {
                    drawerId, round: room.round, totalRounds: room.settings.rounds,
                    hint, wordLength: words[0].length, word: words[0], drawTime: room.settings.drawTime
                });
            }
            startRoundTimer(io, roomCode);
        }
    }, 15000);
}

function startRoundTimer(io, roomCode) {
    const room = gameRooms.get(roomCode);
    if (!room) return;
    clearGameTimers(room);

    let elapsed = 0;
    const total = room.settings.drawTime;
    const hintIntervals = [];
    if (room.settings.hints >= 1) hintIntervals.push(Math.floor(total * 0.35));
    if (room.settings.hints >= 2) hintIntervals.push(Math.floor(total * 0.6));
    if (room.settings.hints >= 3) hintIntervals.push(Math.floor(total * 0.8));

    room.roundTimer = setInterval(() => {
        elapsed++;
        // Send hints at configured intervals
        if (room.currentWord && hintIntervals.includes(elapsed)) {
            room.hintsGiven++;
            const hint = generateHint(room.currentWord, room.hintsGiven, room.settings.hints);
            io.to('game:' + roomCode).emit('game:hint', { hint });
        }
        if (elapsed >= total) {
            endRound(io, roomCode);
        }
    }, 1000);
}

function generateHint(word, hintsGiven, totalHints) {
    const chars = word.split('');
    const revealable = [];
    chars.forEach((c, i) => { if (c !== ' ') revealable.push(i); });
    const revealCount = Math.ceil(revealable.length * (hintsGiven / (totalHints + 1)));
    const shuffled = revealable.sort(() => Math.random() - 0.5);
    const revealed = new Set(shuffled.slice(0, revealCount));
    return chars.map((c, i) => {
        if (c === ' ') return '  ';
        return revealed.has(i) ? c + ' ' : '_ ';
    }).join('');
}

function endRound(io, roomCode) {
    const room = gameRooms.get(roomCode);
    if (!room) return;
    clearGameTimers(room);

    io.to('game:' + roomCode).emit('game:round-end', {
        word: room.currentWord,
        players: room.players
    });

    room.currentWord = '';
    room.currentDrawer = null;

    setTimeout(() => {
        if (room.state === 'playing') nextTurn(io, roomCode);
    }, 5000);
}

function endGame(io, roomCode) {
    const room = gameRooms.get(roomCode);
    if (!room) return;
    clearGameTimers(room);
    room.state = 'lobby';

    io.to('game:' + roomCode).emit('game:game-over', { players: room.players });
}

function clearGameTimers(room) {
    if (room.roundTimer) { clearTimeout(room.roundTimer); clearInterval(room.roundTimer); room.roundTimer = null; }
    if (room.hintTimer) { clearTimeout(room.hintTimer); room.hintTimer = null; }
}

function handleGameDisconnect(io, socket, uid) {
    for (const [code, room] of gameRooms) {
        const idx = room.players.findIndex(p => p.id === uid);
        if (idx === -1) continue;
        const name = room.players[idx].name;
        room.players.splice(idx, 1);

        if (room.players.length === 0) {
            clearGameTimers(room);
            gameRooms.delete(code);
            continue;
        }

        let newHostId = null;
        if (room.host === uid) {
            room.host = room.players[0].id;
            room.players[0].isHost = true;
            newHostId = room.host;
        }
        io.to('game:' + code).emit('game:player-left', { players: room.players, name, newHostId });

        if (room.state === 'playing' && room.currentDrawer === uid) {
            endRound(io, code);
        }
        if (room.state === 'playing' && room.players.length < 2) {
            endGame(io, code);
        }
    }
}

function isCloseGuess(guess, word) {
    if (guess.length < 2 || word.length < 2) return false;
    if (Math.abs(guess.length - word.length) > 2) return false;
    let diff = 0;
    const longer = guess.length >= word.length ? guess : word;
    const shorter = guess.length < word.length ? guess : word;
    for (let i = 0; i < longer.length; i++) {
        if (shorter[i] !== longer[i]) diff++;
    }
    return diff <= 2 && diff > 0;
}
