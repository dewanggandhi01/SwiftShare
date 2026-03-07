const { chatUsers, chatRooms, socketToUser, randomLobby, generateChatCode, generateMsgId } = require('../utils/helpers');
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

            // Remove both from lobby
            randomLobby.delete(uid);
            randomLobby.delete(targetId);
            socket.leave('random-lobby');

            // Create a chat room between them
            const roomCode = generateChatCode();
            const room = {
                code: roomCode,
                users: [uid, targetId],
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

            socket.join('chat:' + roomCode);
            socket.emit('chat:room-joined', {
                code: roomCode,
                peerUser: { id: targetUser.id, username: targetUser.username, avatar: targetUser.avatar, online: targetUser.online, lastSeen: targetUser.lastSeen },
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
                        peerUser: { id: me.id, username: me.username, avatar: me.avatar, online: me.online, lastSeen: me.lastSeen },
                        messages: room.messages
                    });
                    targetSocket.emit('random:matched');
                }
            }

            socket.emit('random:matched');

            // Broadcast updated lobby
            io.to('random-lobby').emit('random:lobby-update', getLobbyList());
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
