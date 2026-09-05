import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import io from "socket.io-client";
import { 
  FiSend, FiPaperclip, FiMic, FiPlus, FiSearch, FiSettings, 
  FiUser, FiTrash2, FiEdit2, FiCornerUpLeft, 
  FiCheck, FiVolume2, FiMoon, FiSun, FiBookmark, FiLogOut,
  FiMessageCircle, FiUsers, FiShield, FiGlobe, FiImage, FiZap,
  FiMusic, FiFilm, FiBookOpen, FiCode, FiLayers, FiSmile, FiArrowRight, FiTv
} from "react-icons/fi";

// Vector Illustrated Avatars (DiceBear Open Peeps style SVG seeds)
const AVATAR_SEEDS = [
  { id: "av1", name: "Casual Male", url: "https://api.dicebear.com/7.x/open-peeps/svg?seed=Felix&backgroundColor=b6e3f4" },
  { id: "av2", name: "Casual Female", url: "https://api.dicebear.com/7.x/open-peeps/svg?seed=Bella&backgroundColor=ffd5dc" },
  { id: "av3", name: "Gamer", url: "https://api.dicebear.com/7.x/open-peeps/svg?seed=Alex&backgroundColor=c0aede" },
  { id: "av4", name: "Anime Style", url: "https://api.dicebear.com/7.x/open-peeps/svg?seed=Luna&backgroundColor=d1d4f9" },
  { id: "av5", name: "Professional", url: "https://api.dicebear.com/7.x/open-peeps/svg?seed=Oliver&backgroundColor=b6e3f4" },
  { id: "av6", name: "Student", url: "https://api.dicebear.com/7.x/open-peeps/svg?seed=Maya&backgroundColor=ffd5dc" },
  { id: "av7", name: "Designer", url: "https://api.dicebear.com/7.x/open-peeps/svg?seed=Sam&backgroundColor=c0aede" },
  { id: "av8", name: "Developer", url: "https://api.dicebear.com/7.x/open-peeps/svg?seed=Ethan&backgroundColor=d1d4f9" },
  { id: "av9", name: "Creative", url: "https://api.dicebear.com/7.x/open-peeps/svg?seed=Sophie&backgroundColor=b6e3f4" },
  { id: "av10", name: "Minimal", url: "https://api.dicebear.com/7.x/open-peeps/svg?seed=Jack&backgroundColor=ffd5dc" },
];

const INTERESTS = [
  { label: "Music", icon: FiMusic },
  { label: "Gaming", icon: FiTv },
  { label: "Movies", icon: FiFilm },
  { label: "Books", icon: FiBookOpen },
  { label: "Coding", icon: FiCode },
  { label: "Design", icon: FiLayers },
];

const fontSizes = {
  small: "text-xs",
  medium: "text-sm",
  large: "text-base"
};

export default function Chat() {
  // Authentication & Registration
  const [me, setMe] = useState(null); // { id, username, avatar, code }
  const [registerName, setRegisterName] = useState("");
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState(AVATAR_SEEDS[0].url);

  // Socket
  const socketRef = useRef(null);

  // Chat State
  const [rooms, setRooms] = useState({}); // code -> { code, peerUser, messages[], unread, typing }
  const [currentRoomCode, setCurrentRoomCode] = useState("");
  const [typing, setTyping] = useState(false);

  // Input states
  const [inputText, setInputText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Panels
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showRandomLobby, setShowRandomLobby] = useState(false);
  
  // Settings Customize
  const [darkMode, setDarkMode] = useState(true);
  const [fontSize, setFontSize] = useState("medium");

  // Random lobby states
  const [lobbyUsers, setLobbyUsers] = useState([]);
  const [isInLobby, setIsInLobby] = useState(false);
  const [copiedText, setCopiedText] = useState("");

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  // Attachment upload
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // 1. Initial Load: user check
  useEffect(() => {
    try {
      const stored = localStorage.getItem("swiftchat-user");
      if (stored) {
        setMe(JSON.parse(stored));
      }
    } catch (_) {}

    const darkStored = localStorage.getItem("swiftchat-dark");
    if (darkStored !== null) {
      setDarkMode(darkStored === "1");
    }
  }, []);

  // 2. Connect socket when registered
  useEffect(() => {
    if (!me) return;

    socketRef.current = io();

    socketRef.current.emit("chat:register", {
      userId: me.id,
      username: me.username,
      avatar: me.avatar
    });

    socketRef.current.on("chat:registered", (data) => {
      setMe((prev) => {
        const updated = { ...prev, code: data.code };
        localStorage.setItem("swiftchat-user", JSON.stringify(updated));
        return updated;
      });
    });

    socketRef.current.on("chat:room-joined", (data) => {
      setRooms((prev) => {
        const key = data.code;
        return {
          ...prev,
          [key]: {
            code: key,
            peerUser: data.peerUser,
            messages: data.messages || [],
            isRandom: !!data.isRandom,
            unread: false,
            typing: false
          }
        };
      });
      setCurrentRoomCode(data.code);
      setShowNewChatModal(false);
      setShowRandomLobby(false);
    });

    socketRef.current.on("chat:new-message", (msg) => {
      setRooms((prev) => {
        const room = prev[msg.roomCode];
        if (!room) return prev;
        
        const isCurrent = msg.roomCode === currentRoomCode;
        return {
          ...prev,
          [msg.roomCode]: {
            ...room,
            messages: [...room.messages, msg],
            unread: !isCurrent
          }
        };
      });
    });

    socketRef.current.on("chat:typing", ({ roomCode, typing }) => {
      setRooms((prev) => {
        const room = prev[roomCode];
        if (!room) return prev;
        return { ...prev, [roomCode]: { ...room, typing } };
      });
    });

    socketRef.current.on("chat:reaction-updated", ({ roomCode, messageId, reactions }) => {
      setRooms((prev) => {
        const room = prev[roomCode];
        if (!room) return prev;
        const updatedMessages = room.messages.map((m) =>
          m.id === messageId ? { ...m, reactions } : m
        );
        return { ...prev, [roomCode]: { ...room, messages: updatedMessages } };
      });
    });

    socketRef.current.on("chat:message-edited", ({ roomCode, messageId, text }) => {
      setRooms((prev) => {
        const room = prev[roomCode];
        if (!room) return prev;
        const updatedMessages = room.messages.map((m) =>
          m.id === messageId ? { ...m, text } : m
        );
        return { ...prev, [roomCode]: { ...room, messages: updatedMessages } };
      });
    });

    socketRef.current.on("chat:message-deleted", ({ roomCode, messageId, deletedFor }) => {
      setRooms((prev) => {
        const room = prev[roomCode];
        if (!room) return prev;
        const updatedMessages = room.messages.map((m) =>
          m.id === messageId ? { ...m, deleted: deletedFor } : m
        );
        return { ...prev, [roomCode]: { ...room, messages: updatedMessages } };
      });
    });

    socketRef.current.on("chat:lobby-users", (users) => {
      setLobbyUsers(users);
    });

    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, [me]);

  // Auto scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [rooms, currentRoomCode]);

  // Handle register profile
  const handleRegister = (e) => {
    e.preventDefault();
    if (!registerName.trim()) return;

    const userObj = {
      id: "u_" + Math.random().toString(36).substr(2, 9),
      username: registerName.trim(),
      avatar: selectedAvatarUrl
    };

    setMe(userObj);
    localStorage.setItem("swiftchat-user", JSON.stringify(userObj));
  };

  const handleJoinRoom = () => {
    if (!joinCodeInput.trim() || !socketRef.current) return;
    socketRef.current.emit("chat:join-room", { code: joinCodeInput.trim().toUpperCase() });
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || !currentRoomCode || !socketRef.current) return;

    if (editingMsg) {
      socketRef.current.emit("chat:edit-message", {
        roomCode: currentRoomCode,
        messageId: editingMsg.id,
        text: inputText.trim()
      });
      setEditingMsg(null);
      setInputText("");
      return;
    }

    const payload = {
      roomCode: currentRoomCode,
      senderId: me.id,
      text: inputText.trim(),
      replyToId: replyTo ? replyTo.id : null,
      type: "text"
    };

    socketRef.current.emit("chat:send-message", payload);
    setInputText("");
    setReplyTo(null);

    if (typing) {
      setTyping(false);
      socketRef.current.emit("chat:typing", { roomCode: currentRoomCode, typing: false });
    }
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (!currentRoomCode || !socketRef.current) return;

    if (!typing) {
      setTyping(true);
      socketRef.current.emit("chat:typing", { roomCode: currentRoomCode, typing: true });
    }

    clearTimeout(window.typingTimeout);
    window.typingTimeout = setTimeout(() => {
      setTyping(false);
      socketRef.current?.emit("chat:typing", { roomCode: currentRoomCode, typing: false });
    }, 2000);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !currentRoomCode || !socketRef.current) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/chat/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        const payload = {
          roomCode: currentRoomCode,
          senderId: me.id,
          text: `[${data.type.toUpperCase()}] ${data.name}`,
          type: data.type,
          media: data
        };
        socketRef.current.emit("chat:send-message", payload);
      }
    } catch (_) {
      alert("Attachment upload failed.");
    }
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([audioBlob], `voice_${Date.now()}.webm`, { type: "audio/webm" });

        const formData = new FormData();
        formData.append("file", file);

        try {
          const res = await fetch("/api/chat/upload", { method: "POST", body: formData });
          if (res.ok) {
            const data = await res.json();
            socketRef.current.emit("chat:send-message", {
              roomCode: currentRoomCode,
              senderId: me.id,
              text: "Voice Message",
              type: "voice",
              media: data
            });
          }
        } catch (_) {}

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (_) {
      alert("Microphone permission denied.");
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  const handleDeleteMessage = (messageId) => {
    if (!currentRoomCode || !socketRef.current) return;
    socketRef.current.emit("chat:delete-message", {
      roomCode: currentRoomCode,
      messageId
    });
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(type);
      setTimeout(() => setCopiedText(""), 2000);
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("swiftchat-user");
    setMe(null);
    setRooms({});
    setCurrentRoomCode("");
  };

  const handleWatchLobby = () => {
    setShowRandomLobby(true);
    if (socketRef.current) {
      socketRef.current.emit("chat:join-lobby");
      setIsInLobby(true);
    }
  };

  const handleToggleLobbyJoin = () => {
    if (!socketRef.current) return;
    if (isInLobby) {
      socketRef.current.emit("chat:leave-lobby");
      setIsInLobby(false);
    } else {
      socketRef.current.emit("chat:join-lobby");
      setIsInLobby(true);
    }
  };

  const handleConnectStranger = (targetUserId) => {
    if (!socketRef.current) return;
    socketRef.current.emit("chat:match-stranger", { targetUserId });
  };

  const handleCloseRandomLobby = () => {
    setShowRandomLobby(false);
    if (isInLobby && socketRef.current) {
      socketRef.current.emit("chat:leave-lobby");
      setIsInLobby(false);
    }
  };

  const activeRoom = rooms[currentRoomCode];
  const filteredRooms = Object.values(rooms).filter((r) =>
    r.peerUser?.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative w-full max-w-[1600px] mx-auto pt-4 pb-16 px-4 md:px-8 lg:px-12 xl:px-16">
      
      {/* ─── Two-Column Split Layout (Left 65% | Right 35%) ─── */}
      <section className="w-full flex flex-col-reverse lg:flex-row items-start justify-between gap-8 md:gap-12">

        {/* ── LEFT COLUMN: Profile Creation or Active Chat Viewport (65%) ── */}
        <div className="w-full lg:w-[65%] flex-shrink-0">
          
          {/* PROFILE CREATION CARD (When not registered) */}
          {!me && (
            <div className="rounded-[24px] border border-white/[0.06] bg-[#15171E] p-8 shadow-xl">
              
              {/* Header */}
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-[#7C5CFF]/10 border border-[#7C5CFF]/20 flex items-center justify-center text-[#7C5CFF]">
                  <FiUser size={20} />
                </div>
                <div>
                  <h2 className="font-sans font-bold text-2xl text-white tracking-tight">Create Your Profile</h2>
                  <p className="text-xs text-textSec">Choose a display name and profile picture to start chatting with people around the world.</p>
                </div>
              </div>

              <form onSubmit={handleRegister} className="flex flex-col gap-6 mt-6">
                
                {/* Username Input */}
                <div>
                  <label className="text-xs font-semibold text-textSec uppercase tracking-wider mb-2 block">Display Name</label>
                  <input
                    type="text"
                    required
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="Enter your display name"
                    maxLength={20}
                    className="w-full h-[54px] bg-white/[0.03] border border-white/[0.08] text-white text-sm rounded-[16px] px-4.5 focus:border-[#7C5CFF] focus:outline-none placeholder:text-muted/60"
                  />
                </div>

                {/* Vector Illustrated Avatars Grid */}
                <div>
                  <label className="text-xs font-semibold text-textSec uppercase tracking-wider mb-3 block">Choose Avatar</label>
                  <div className="grid grid-cols-5 gap-4 bg-white/[0.015] border border-white/[0.06] p-4 rounded-2xl max-h-[200px] overflow-y-auto">
                    {AVATAR_SEEDS.map((av) => {
                      const isSelected = selectedAvatarUrl === av.url;
                      return (
                        <button
                          key={av.id}
                          type="button"
                          onClick={() => setSelectedAvatarUrl(av.url)}
                          className={`relative w-16 h-16 rounded-full overflow-hidden border transition-all ${
                            isSelected ? "border-[#7C5CFF] ring-2 ring-[#7C5CFF]" : "border-white/10 hover:border-white/30"
                          }`}
                        >
                          <img src={av.url} alt={av.name} className="w-full h-full object-cover bg-secondary" />
                          {isSelected && (
                            <span className="absolute bottom-0 right-0 w-5 h-5 bg-[#7C5CFF] text-white rounded-full flex items-center justify-center text-[10px]">
                              <FiCheck />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full h-[54px] bg-[#7C5CFF] hover:bg-[#6b4ae6] text-white text-sm font-semibold rounded-[16px] shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
                >
                  Continue <FiArrowRight size={16} />
                </button>
              </form>

            </div>
          )}

          {/* ACTIVE CHAT MESSENGER DASHBOARD (When registered) */}
          {me && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 min-h-[640px] min-w-[320px] max-w-full border border-white/[0.06] bg-[#15171E] p-3 rounded-[24px] shadow-xl resize overflow-hidden relative">
              
              {/* Sidebar Rooms */}
              <div className="md:col-span-1 border-r border-white/[0.06] pr-2 flex flex-col justify-between h-[610px]">
                <div>
                  {/* Profile Header */}
                  <div className="flex items-center justify-between pb-4 pt-2 px-3 border-b border-white/[0.06] mb-4">
                    <div className="flex items-center gap-3 overflow-hidden flex-1 mr-2">
                      <img src={me.avatar} alt="Me" className="w-[38px] h-[38px] rounded-full border border-white/10 object-cover bg-secondary flex-shrink-0" />
                      <span className="text-[14.5px] font-semibold text-white truncate min-w-0" title={me.username}>{me.username}</span>
                    </div>
                    <div className="flex items-center text-[#9AA1AE] gap-1 flex-shrink-0">
                      <button onClick={() => setShowSettingsPanel(true)} className="p-1.5 hover:text-white rounded-lg transition-colors" title="Settings">
                        <FiSettings size={18} />
                      </button>
                      <button onClick={handleLogout} className="p-1.5 hover:text-red-400 rounded-lg transition-colors" title="Logout">
                        <FiLogOut size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 px-2 mb-3">
                    <button
                      onClick={() => setShowNewChatModal(true)}
                      className="w-full py-2 bg-[#7C5CFF]/15 border border-[#7C5CFF]/30 text-[#7C5CFF] text-xs font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#7C5CFF]/25 transition-colors"
                    >
                      <FiPlus size={14} /> New Private Chat
                    </button>
                    <button
                      onClick={handleWatchLobby}
                      className="w-full py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-500/20 transition-colors"
                    >
                      <FiGlobe size={14} /> Random Lobby
                    </button>
                  </div>

                  {/* Room Search */}
                  <div className="px-2 mb-3 relative">
                    <FiSearch className="absolute left-4 top-2.5 text-textSec" size={13} />
                    <input
                      type="text"
                      placeholder="Search active rooms..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-muted focus:outline-none"
                    />
                  </div>

                  {/* Rooms list */}
                  <div className="flex flex-col gap-1 px-2 max-h-[310px] overflow-y-auto">
                    <span className="text-[10px] font-semibold text-textSec uppercase tracking-wider pl-1 mb-1 block">Conversations</span>
                    {filteredRooms.length === 0 ? (
                      <span className="text-xs text-muted pl-1">No active rooms</span>
                    ) : (
                      filteredRooms.map((room) => {
                        const isSelected = room.code === currentRoomCode;
                        return (
                          <button
                            key={room.code}
                            onClick={() => {
                              setCurrentRoomCode(room.code);
                              setRooms(prev => ({ ...prev, [room.code]: { ...prev[room.code], unread: false } }));
                            }}
                            className={`w-full flex items-center justify-between p-2 rounded-xl transition-colors ${
                              isSelected ? "bg-[#7C5CFF]/20 border border-[#7C5CFF]/30 text-white" : "text-textSec hover:bg-white/[0.04] hover:text-white"
                            }`}
                          >
                            <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                              <img src={room.peerUser.avatar} alt="Peer" className="w-7 h-7 rounded-full object-cover bg-secondary" />
                              <div className="text-left overflow-hidden min-w-0">
                                <div className="text-xs font-semibold text-white truncate min-w-0" title={room.peerUser.username}>{room.peerUser.username}</div>
                                <div className="text-[10px] text-textSec truncate">
                                  {room.typing ? "typing..." : room.messages[room.messages.length - 1]?.text || "Connected"}
                                </div>
                              </div>
                            </div>
                            {room.unread && <span className="w-2 h-2 rounded-full bg-[#7C5CFF]" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="p-2 text-[10px] text-muted border-t border-white/[0.04] select-none">
                  Peer-to-peer encrypted sessions.
                </div>
              </div>

              {/* Chat Messages Viewport */}
              <div className="md:col-span-3 flex flex-col justify-between h-[610px] relative">
                {!activeRoom ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 select-none">
                    <FiMessageCircle size={44} className="text-muted/60 mb-3 animate-pulse" />
                    <h3 className="font-sans text-base font-bold text-white mb-1">No Active Conversation</h3>
                    <p className="text-xs text-textSec max-w-[300px] leading-relaxed">
                      Start a private room using a peer code or connect in the random lobby.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/[0.06] p-3">
                      <div className="flex items-center gap-2.5 overflow-hidden flex-1 mr-4">
                        <img src={activeRoom.peerUser.avatar} alt="Peer" className="w-9 h-9 rounded-full object-cover bg-secondary border border-white/10 flex-shrink-0" />
                        <div className="overflow-hidden min-w-0">
                          <h4 className="text-xs font-bold text-white leading-none truncate max-w-[300px]" title={activeRoom.peerUser.username}>{activeRoom.peerUser.username}</h4>
                          <span className="text-[10px] text-textSec flex items-center gap-1 mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setRooms((prev) => {
                            const updated = { ...prev };
                            delete updated[currentRoomCode];
                            return updated;
                          });
                          setCurrentRoomCode("");
                        }}
                        className="p-1.5 hover:text-red-400 rounded-lg text-textSec transition-colors"
                        title="Delete room"
                      >
                        <FiTrash2 size={15} />
                      </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-3">
                      {activeRoom.messages.map((msg, i) => {
                        const isMe = msg.senderId === me.id;
                        return (
                          <div
                            key={msg.id || i}
                            className={`flex flex-col gap-1 max-w-[75%] ${isMe ? "self-end items-end" : "self-start items-start"}`}
                          >
                            <div className={`p-3 rounded-2xl text-xs ${
                              isMe ? "bg-[#7C5CFF] text-white rounded-tr-none" : "bg-white/[0.04] text-textSec border border-white/[0.06] rounded-tl-none"
                            }`}>
                              {msg.type === "text" && <span>{msg.text}</span>}
                              {msg.type === "image" && (
                                <img src={msg.media?.url} alt="Shared" className="max-w-[180px] max-h-[180px] rounded-lg mt-1" />
                              )}
                              {msg.type === "voice" && (
                                <audio src={msg.media?.url} controls className="h-7 max-w-[150px]" />
                              )}
                            </div>
                            <span className="text-[9.5px] text-muted px-1">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="border-t border-white/[0.06] p-3 flex items-center gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2.5 bg-white/[0.03] border border-white/[0.08] text-textSec hover:text-white rounded-xl transition-colors"
                        title="Attach file"
                      >
                        <FiPaperclip size={15} />
                      </button>
                      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

                      <input
                        type="text"
                        value={inputText}
                        onChange={handleInputChange}
                        onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                        placeholder="Type a message..."
                        className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none placeholder:text-muted"
                      />

                      <button
                        onClick={handleSendMessage}
                        className="p-2.5 bg-[#7C5CFF] text-white rounded-xl hover:bg-[#6b4ae6] transition-colors"
                      >
                        <FiSend size={15} />
                      </button>
                    </div>

                  </>
                )}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Information Panel & Social Preview (35%) */}
        <div className="w-full lg:w-[35%] flex flex-col items-start text-left lg:pl-4">
          
          {/* Heading */}
          <h1 className="font-sans font-extrabold text-[28px] md:text-[34px] tracking-tight leading-[1.1] text-white mb-3">
            Meet New People <br />
            <span className="text-[#8B7DFF]">Instantly</span>
          </h1>

          {/* Subtitle */}
          <p className="text-[#9AA1AE] text-[15px] leading-[1.6] mb-8">
            Join public chat rooms, discover communities, make new friends and enjoy meaningful conversations in a secure environment.
          </p>

          {/* Overlapping Decorative Profile Cards (Refined) */}
          <div className="w-full mb-10 relative h-[100px] select-none">
            <div className="absolute top-0 left-0 bg-[#161920] border border-white/[0.06] py-2.5 px-4 rounded-[14px] flex items-center gap-3 shadow-lg z-10 transition-transform hover:-translate-y-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
              <span className="text-[13px] font-semibold text-white">Emma</span>
              <span className="text-[11px] text-emerald-400 font-mono tracking-wide">Online</span>
            </div>
            
            <div className="absolute top-6 left-[80px] bg-[#161920] border border-[#8B7DFF]/30 py-2.5 px-4 rounded-[14px] flex items-center gap-3 shadow-xl z-20 transition-transform hover:-translate-y-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#8B7DFF] animate-pulse shadow-[0_0_8px_rgba(139,125,255,0.4)]" />
              <span className="text-[13px] font-semibold text-white">Lucas</span>
              <span className="text-[11px] text-[#8B7DFF] font-mono tracking-wide">Typing...</span>
            </div>

            <div className="absolute top-12 left-[180px] bg-[#161920] border border-white/[0.06] py-2.5 px-4 rounded-[14px] flex items-center gap-3 shadow-lg z-10 transition-transform hover:-translate-y-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
              <span className="text-[13px] font-semibold text-white">Sofia</span>
              <span className="text-[11px] text-emerald-400 font-mono tracking-wide">Online</span>
            </div>
          </div>

          {/* Feature List (Cleaned Up) */}
          <div className="w-full">
            <h3 className="text-[12px] font-bold tracking-[2px] text-[#5A5F6E] uppercase mb-4">Core Features</h3>
            <ul className="flex flex-col gap-3">
              {[
                { icon: <FiMessageCircle size={16} />, text: "Instant P2P Chat" },
                { icon: <FiUsers size={16} />, text: "Public & Private Lobbies" },
                { icon: <FiShield size={16} />, text: "Encrypted Privacy" },
                { icon: <FiMic size={16} />, text: "Voice Notes & Audio" },
                { icon: <FiImage size={16} />, text: "Media & Image Sharing" },
                { icon: <FiGlobe size={16} />, text: "Global Community" },
              ].map((item) => (
                <li key={item.text} className="flex items-center gap-3 text-[14px] text-[#858A96] font-medium transition-colors hover:text-[#B5BAC7]">
                  <span className="w-7 h-7 rounded-lg bg-white/[0.04] text-[#8B7DFF] flex items-center justify-center flex-shrink-0">
                    {item.icon}
                  </span>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>

        </div>

      </section>

      {/* ── NEW PRIVATE CHAT MODAL ── */}
      <AnimatePresence>
        {showNewChatModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-[420px] bg-[#15171E] border border-white/[0.08] p-6 rounded-[22px]"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-6">
                <h3 className="font-sans font-bold text-lg text-white">Join / Create Room</h3>
                <button onClick={() => setShowNewChatModal(false)} className="text-textSec hover:text-white">&times;</button>
              </div>

              {me.code && (
                <div className="flex flex-col items-center border border-white/[0.06] bg-white/[0.015] p-4 rounded-xl mb-6">
                  <span className="text-[10px] font-semibold text-textSec uppercase tracking-wider mb-2">Your Session Code</span>
                  <div className="text-2xl font-extrabold tracking-widest text-[#7C5CFF] font-mono mb-2">
                    {me.code}
                  </div>
                  <button
                    onClick={() => copyToClipboard(me.code, "mycode")}
                    className="px-3 py-1 bg-white/[0.04] text-xs font-medium text-white border border-white/[0.08] rounded-lg hover:bg-white/[0.08]"
                  >
                    {copiedText === "mycode" ? "Copied!" : "Copy Code"}
                  </button>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-textSec uppercase">Enter Peer Code</label>
                <div className="flex items-center gap-2 border border-white/[0.08] bg-white/[0.02] rounded-xl p-1.5 pl-3">
                  <input
                    type="text"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value)}
                    placeholder="Enter code..."
                    className="bg-transparent border-none text-white text-xs flex-1 focus:outline-none"
                  />
                  <button
                    onClick={handleJoinRoom}
                    className="px-4 py-2 bg-[#7C5CFF] rounded-lg text-xs font-semibold text-white hover:bg-[#6b4ae6]"
                  >
                    Join
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

        {/* ── SETTINGS PANEL MODAL ── */}
        <AnimatePresence>
          {showSettingsPanel && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-[420px] bg-[#15171E] border border-white/[0.08] p-6 rounded-[22px]"
              >
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-6">
                  <h3 className="font-sans font-bold text-lg text-white">Settings</h3>
                  <button onClick={() => setShowSettingsPanel(false)} className="text-textSec hover:text-white text-2xl leading-none">&times;</button>
                </div>
  
                <div className="flex flex-col gap-6">
                  {/* Theme Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[14px] font-semibold text-white block">Theme Mode</span>
                      <span className="text-[12px] text-textSec">Toggle dark or light mode.</span>
                    </div>
                    <button
                      onClick={() => setDarkMode(!darkMode)}
                      className={`w-12 h-6 rounded-full p-1 transition-colors ${darkMode ? 'bg-[#7C5CFF]' : 'bg-white/[0.1]'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Font Size Select */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[14px] font-semibold text-white block">Chat Text Size</span>
                      <span className="text-[12px] text-textSec">Adjust message font size.</span>
                    </div>
                    <select
                      value={fontSize}
                      onChange={(e) => setFontSize(e.target.value)}
                      className="bg-[#111317] border border-white/[0.08] text-white text-xs font-semibold rounded-[10px] px-3 py-2 focus:outline-none focus:border-[#7C5CFF]"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>

      {/* ── RANDOM LOBBY MODAL ── */}
      <AnimatePresence>
        {showRandomLobby && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-[440px] bg-[#15171E] border border-white/[0.08] p-6 rounded-[22px]"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-5">
                <h3 className="font-sans font-bold text-lg text-white">Random Matching Lobby</h3>
                <button onClick={handleCloseRandomLobby} className="text-textSec hover:text-white">&times;</button>
              </div>

              <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.06] p-3.5 rounded-xl mb-5">
                <div className="flex items-center gap-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${isInLobby ? "bg-emerald-400 animate-ping" : "bg-yellow-500"}`} />
                  <span className="text-xs font-semibold text-white">{isInLobby ? "Online & Matching" : "Spectator Mode"}</span>
                </div>
                
                <button
                  onClick={handleToggleLobbyJoin}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold ${
                    isInLobby ? "bg-red-500/10 border border-red-500/20 text-red-400" : "bg-[#7C5CFF] text-white"
                  }`}
                >
                  {isInLobby ? "Go Offline" : "Go Online"}
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-semibold text-textSec uppercase tracking-wider pl-1 mb-1 block">
                  Available Members ({lobbyUsers.length})
                </span>

                <div className="max-h-[200px] overflow-y-auto flex flex-col gap-1.5 pr-1">
                  {lobbyUsers.length === 0 ? (
                    <span className="text-xs text-muted pl-1">No online strangers in lobby</span>
                  ) : (
                    lobbyUsers.map((user) => {
                      if (user.userId === me.id) return null;
                      return (
                        <div key={user.userId} className="flex items-center justify-between bg-white/[0.02] border border-white/[0.06] p-2 rounded-xl">
                          <div className="flex items-center gap-2">
                            <img src={user.avatar} alt="User" className="w-7 h-7 rounded-full object-cover bg-secondary" />
                            <span className="text-xs font-semibold text-white">{user.tag}</span>
                          </div>
                          <button
                            onClick={() => handleConnectStranger(user.userId)}
                            className="px-3 py-1 bg-[#7C5CFF]/20 border border-[#7C5CFF]/30 text-[#7C5CFF] text-xs font-bold rounded-lg hover:bg-[#7C5CFF]/30"
                          >
                            Chat
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
