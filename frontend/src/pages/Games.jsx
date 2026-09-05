import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import io from "socket.io-client";
import { 
  FiCopy, FiCheck, FiPlay, FiLogOut, FiTrash2, 
  FiCheckCircle, FiChevronRight, FiEdit, FiTrash, FiRotateCcw
} from "react-icons/fi";

const AVATARS = ['😀','😎','🤩','🥳','🤖','👾','🦊','🐱','🐶','🦁','🐼','🐨','🦄','🌸','⭐','🔥','💎','🎮','🎵','🏀'];
const COLORS = ['#ffffff','#000000','#ef4444','#f97316','#f59e0b','#22c55e','#3b82f6','#6366f1','#a855f7','#ec4899','#78716c','#06b6d4'];

export default function Games() {
  const [me, setMe] = useState(null); // { id, name, avatar }
  const [registerName, setRegisterName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);

  // Game Room States
  const [roomCode, setRoomCode] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState([]);
  const [gameActive, setGameActive] = useState(false);
  const [lobbyMessages, setLobbyMessages] = useState([]);
  const [gameMessages, setGameMessages] = useState([]);
  const [lobbyChatText, setLobbyChatText] = useState("");
  const [gameChatText, setGameChatText] = useState("");

  // Lobby Settings
  const [settingsRounds, setSettingsRounds] = useState(5);
  const [settingsTime, setSettingsTime] = useState(80);
  const [settingsHints, setSettingsHints] = useState(2);

  // Active Game State
  const [gameState, setGameState] = useState({
    activeScreen: "setup", // "setup" | "lobby" | "game"
    round: 1,
    maxRounds: 5,
    drawerId: "",
    wordHint: "",
    timeLeft: 0,
    amDrawing: false,
    wordChoices: [], // Array of 3 words to choose from
    showWordSelect: false,
    showRoundEnd: false,
    roundEndData: null,
    showGameOver: false,
    gameOverData: null,
  });

  // Canvas local drawing states
  const [tool, setTool] = useState("pen"); // "pen" | "eraser" | "fill"
  const [brushColor, setBrushColor] = useState("#ffffff");
  const [brushSize, setBrushSize] = useState(5);

  // References
  const socketRef = useRef(null);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawingRef = useRef(false);
  const lastCoordsRef = useRef({ x: 0, y: 0 });
  const lobbyChatEndRef = useRef(null);
  const gameChatEndRef = useRef(null);

  // 1. Initial Load: Local player data check
  useEffect(() => {
    try {
      const stored = localStorage.getItem("debo-games-user");
      if (stored) {
        setMe(JSON.parse(stored));
      }
    } catch (_) {}

    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get("room");
    if (roomParam) {
      setRoomCode(roomParam.toUpperCase());
    }
  }, []);

  // 2. Connect Socket and bind room listeners
  useEffect(() => {
    if (!me) return;

    socketRef.current = io();

    socketRef.current.on("game:created", (data) => {
      setRoomCode(data.roomCode);
      setIsHost(true);
      setPlayers(data.players);
      setGameState((prev) => ({ ...prev, activeScreen: "lobby" }));
      window.history.replaceState(null, "", `/games?room=${data.roomCode}`);
    });

    socketRef.current.on("game:joined", (data) => {
      setRoomCode(data.roomCode);
      setIsHost(data.isHost);
      setPlayers(data.players);
      setGameState((prev) => ({ ...prev, activeScreen: "lobby" }));
      window.history.replaceState(null, "", `/games?room=${data.roomCode}`);
    });

    socketRef.current.on("game:players-updated", (playerList) => {
      setPlayers(playerList);
    });

    socketRef.current.on("game:lobby-message", (msg) => {
      setLobbyMessages((prev) => [...prev, msg]);
    });

    socketRef.current.on("game:message", (msg) => {
      setGameMessages((prev) => [...prev, msg]);
    });

    socketRef.current.on("game:started", (data) => {
      setGameState((prev) => ({
        ...prev,
        activeScreen: "game",
        round: data.round,
        maxRounds: data.maxRounds
      }));
    });

    socketRef.current.on("game:choose-word", (choices) => {
      setGameState((prev) => ({
        ...prev,
        wordChoices: choices,
        showWordSelect: true,
        amDrawing: true
      }));
    });

    socketRef.current.on("game:turn-start", (data) => {
      clearLocalCanvas();
      setGameState((prev) => ({
        ...prev,
        drawerId: data.drawerId,
        wordHint: data.hint,
        timeLeft: data.time,
        amDrawing: data.drawerId === me.id,
        showWordSelect: false,
        showRoundEnd: false
      }));
    });

    socketRef.current.on("game:timer-tick", (timeLeft) => {
      setGameState((prev) => ({ ...prev, timeLeft }));
    });

    socketRef.current.on("game:draw-data", (data) => {
      drawFromSocket(data);
    });

    socketRef.current.on("game:clear-canvas", () => {
      clearLocalCanvas();
    });

    socketRef.current.on("game:round-end", (data) => {
      setGameState((prev) => ({
        ...prev,
        showRoundEnd: true,
        roundEndData: data
      }));
    });

    socketRef.current.on("game:over", (data) => {
      setGameState((prev) => ({
        ...prev,
        showGameOver: true,
        gameOverData: data
      }));
    });

    socketRef.current.on("game:error", (msg) => {
      alert(msg);
    });

    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, [me]);

  // Handle Canvas init
  useEffect(() => {
    if (gameState.activeScreen === "game" && canvasRef.current) {
      const canvas = canvasRef.current;
      ctxRef.current = canvas.getContext("2d");
      ctxRef.current.lineCap = "round";
      ctxRef.current.lineJoin = "round";
    }
  }, [gameState.activeScreen]);

  // Scroll lobby / game chat
  useEffect(() => {
    lobbyChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lobbyMessages]);

  useEffect(() => {
    gameChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [gameMessages]);

  // Profile submission
  const handleProfileSubmit = (e) => {
    e.preventDefault();
    if (!registerName.trim()) return;

    const userObj = {
      id: "p_" + Math.random().toString(36).substr(2, 9),
      name: registerName.trim(),
      avatar: selectedAvatar
    };

    setMe(userObj);
    localStorage.setItem("debo-games-user", JSON.stringify(userObj));
  };

  const handleCreateGame = () => {
    if (!socketRef.current || !me) return;
    socketRef.current.emit("game:create", me);
  };

  const handleJoinGame = () => {
    if (!socketRef.current || !me || !roomCode.trim()) return;
    socketRef.current.emit("game:join", { roomCode: roomCode.trim().toUpperCase(), player: me });
  };

  const handleStartGame = () => {
    if (!isHost || !socketRef.current) return;
    socketRef.current.emit("game:start", {
      roomCode,
      rounds: settingsRounds,
      drawTime: settingsTime,
      hints: settingsHints
    });
  };

  const handleSendLobbyChat = () => {
    if (!lobbyChatText.trim() || !socketRef.current) return;
    socketRef.current.emit("game:lobby-message", {
      roomCode,
      name: me.name,
      text: lobbyChatText.trim()
    });
    setLobbyChatText("");
  };

  const handleSendGuessChat = () => {
    if (!gameChatText.trim() || !socketRef.current || gameState.amDrawing) return;
    socketRef.current.emit("game:guess", {
      roomCode,
      senderId: me.id,
      name: me.name,
      guess: gameChatText.trim()
    });
    setGameChatText("");
  };

  const handleSelectWord = (word) => {
    if (!socketRef.current) return;
    socketRef.current.emit("game:word-selected", { roomCode, word });
    setGameState((prev) => ({ ...prev, showWordSelect: false }));
  };

  // Canvas drawing listeners
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    if (!gameState.amDrawing) return;
    drawingRef.current = true;
    const coords = getCanvasCoords(e);
    lastCoordsRef.current = coords;
  };

  const draw = (e) => {
    if (!drawingRef.current || !gameState.amDrawing || !ctxRef.current) return;
    const coords = getCanvasCoords(e);

    const drawData = {
      x0: lastCoordsRef.current.x,
      y0: lastCoordsRef.current.y,
      x1: coords.x,
      y1: coords.y,
      color: tool === "eraser" ? "#ffffff" : brushColor,
      size: tool === "eraser" ? brushSize * 4 : brushSize
    };

    drawStroke(drawData);
    if (socketRef.current) {
      socketRef.current.emit("game:draw-data", { roomCode, ...drawData });
    }

    lastCoordsRef.current = coords;
  };

  const stopDrawing = () => {
    drawingRef.current = false;
  };

  const drawStroke = (data) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.beginPath();
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.size;
    ctx.moveTo(data.x0, data.y0);
    ctx.lineTo(data.x1, data.y1);
    ctx.stroke();
    ctx.closePath();
  };

  const drawFromSocket = (data) => {
    drawStroke(data);
  };

  const clearLocalCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleUndo = () => {
    if (!gameState.amDrawing) return;
    clearLocalCanvas();
    socketRef.current.emit("game:clear-canvas", { roomCode });
  };

  const handleClear = () => {
    if (!gameState.amDrawing) return;
    clearLocalCanvas();
    socketRef.current.emit("game:clear-canvas", { roomCode });
  };

  const handleLeaveLobby = () => {
    if (window.confirm("Leave game lobby?")) {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      setGameState((prev) => ({ ...prev, activeScreen: "setup" }));
      window.history.replaceState(null, "", "/games");
      setRoomCode("");
      setIsHost(false);
      setPlayers([]);
    }
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}/games?room=${roomCode}`;
    navigator.clipboard.writeText(link).then(() => {
      alert("Room invite link copied!");
    });
  };

  const timerPct = settingsTime > 0 ? (gameState.timeLeft / settingsTime) * 100 : 0;

  return (
    <div className="relative z-10 w-full pt-6">
      
      {/* ── 1. SETUP PROFILE SCREEN ── */}
      {gameState.activeScreen === "setup" && (
        <div className="flex justify-center py-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-[450px] glass-panel p-8"
          >
            <div className="text-4xl text-center mb-4">🎨</div>
            <h2 className="font-grotesk font-bold text-2xl text-white text-center mb-2 tracking-tight">Scribble Arena</h2>
            <p className="text-xs text-textSec text-center mb-6 leading-relaxed">
              Real-time multiplayer drawing. Choose a handle, avatar, and start drawing with friends!
            </p>

            <form onSubmit={handleProfileSubmit} className="flex flex-col gap-5">
              <div>
                <label className="text-xs font-semibold text-textSec uppercase tracking-wider mb-2 block">Your Name</label>
                <input
                  type="text"
                  required
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  placeholder="Enter a username..."
                  maxLength={15}
                  className="w-full px-4 py-3 bg-secondary/80 border border-border text-white text-sm rounded-xl focus:border-primary/50 focus:ring-0 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-textSec uppercase tracking-wider mb-3 block">Select Avatar</label>
                <div className="grid grid-cols-5 gap-3 max-h-[140px] overflow-y-auto border border-border bg-secondary/40 p-3.5 rounded-xl">
                  {AVATARS.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setSelectedAvatar(av)}
                      className={`text-2xl p-1 rounded-lg transition-transform ${
                        selectedAvatar === av ? "bg-primary/20 scale-125 border border-primary/30" : "hover:scale-110"
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              {me ? (
                <div className="flex flex-col gap-3 mt-4">
                  {roomCode ? (
                    <button
                      type="button"
                      onClick={handleJoinGame}
                      className="w-full py-3.5 bg-gradient-accent rounded-xl text-sm font-semibold text-white shadow-lg hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      Join Game Room {roomCode}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleCreateGame}
                        className="w-full py-3.5 bg-gradient-accent rounded-xl text-sm font-semibold text-white shadow-lg hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        🎮 Create New Game Lobbies
                      </button>

                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="text"
                          placeholder="Enter Room Code..."
                          value={roomCode}
                          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                          maxLength={6}
                          className="flex-1 px-4 py-3 bg-secondary border border-border text-white text-xs rounded-xl focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleJoinGame}
                          className="px-6 py-3 bg-secondary border border-border hover:bg-white/5 text-xs font-semibold rounded-xl text-white transition-all"
                        >
                          Join Room
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-accent rounded-xl text-sm font-semibold text-white shadow-lg hover:opacity-90 active:scale-95 transition-all mt-2"
                >
                  Create Game Session
                </button>
              )}
            </form>
          </motion.div>
        </div>
      )}

      {/* ── 2. MULTIPLAYER LOBBY SCREEN ── */}
      {gameState.activeScreen === "lobby" && (
        <div className="max-w-[860px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Settings and Code (left column) */}
          <div className="md:col-span-1 flex flex-col gap-6">
            <div className="glass-panel p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-grotesk font-bold text-white text-base">Game Details</h3>
                <button onClick={handleLeaveLobby} className="text-xs text-red-400 hover:text-red-300 font-semibold">
                  Leave
                </button>
              </div>

              <div>
                <span className="text-[10px] font-bold text-textSec uppercase block mb-1">Room Code</span>
                <div className="text-3xl font-extrabold tracking-widest text-primary font-grotesk bg-secondary/60 border border-border py-3 text-center rounded-2xl">
                  {roomCode}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  onClick={() => navigator.clipboard.writeText(roomCode)}
                  className="py-2.5 bg-secondary border border-border text-xs text-white rounded-xl hover:bg-white/5 transition-all"
                >
                  Copy Code
                </button>
                <button
                  onClick={copyRoomLink}
                  className="py-2.5 bg-secondary border border-border text-xs text-white rounded-xl hover:bg-white/5 transition-all"
                >
                  Copy Link
                </button>
              </div>
            </div>

            {/* Custom settings panel */}
            <div className="glass-panel p-6 flex flex-col gap-4">
              <h3 className="font-grotesk font-bold text-white text-base border-b border-border pb-3">Settings</h3>
              
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-textSec uppercase pl-0.5">Rounds</label>
                  <select
                    disabled={!isHost}
                    value={settingsRounds}
                    onChange={(e) => setSettingsRounds(parseInt(e.target.value))}
                    className="bg-secondary border border-border text-white text-xs py-2 px-3 rounded-xl focus:outline-none disabled:opacity-50"
                  >
                    {[3, 5, 8, 10].map((r) => (
                      <option key={r} value={r}>{r} Rounds</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-textSec uppercase pl-0.5">Draw Time</label>
                  <select
                    disabled={!isHost}
                    value={settingsTime}
                    onChange={(e) => setSettingsTime(parseInt(e.target.value))}
                    className="bg-secondary border border-border text-white text-xs py-2 px-3 rounded-xl focus:outline-none disabled:opacity-50"
                  >
                    {[60, 80, 90, 120].map((t) => (
                      <option key={t} value={t}>{t} seconds</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-textSec uppercase pl-0.5">Word Hints</label>
                  <select
                    disabled={!isHost}
                    value={settingsHints}
                    onChange={(e) => setSettingsHints(parseInt(e.target.value))}
                    className="bg-secondary border border-border text-white text-xs py-2 px-3 rounded-xl focus:outline-none disabled:opacity-50"
                  >
                    {[0, 1, 2].map((h) => (
                      <option key={h} value={h}>{h === 0 ? "No hints" : `${h} hint(s)`}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Lobby chat and player list (right column) */}
          <div className="md:col-span-2 flex flex-col gap-6">
            {/* Player list */}
            <div className="glass-panel p-6 flex flex-col gap-4">
              <h3 className="font-grotesk font-bold text-white text-base border-b border-border pb-3">
                Players ({players.length}/8)
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {players.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2.5 bg-secondary/40 border border-border p-3 rounded-xl overflow-hidden"
                  >
                    <span className="text-2xl select-none">{p.avatar}</span>
                    <div className="overflow-hidden text-left">
                      <div className="text-xs font-bold text-white truncate max-w-[90px]">{p.name}</div>
                      {p.isHost && <span className="text-[9px] text-primary font-semibold uppercase">Host</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Box */}
            <div className="glass-panel p-6 flex-1 flex flex-col justify-between min-h-[300px]">
              <div>
                <h3 className="font-grotesk font-bold text-white text-base border-b border-border pb-3 mb-4">
                  Lobby Chat
                </h3>
                <div className="max-h-[140px] overflow-y-auto flex flex-col gap-2 mb-4">
                  {lobbyMessages.map((msg, i) => {
                    const isSystem = msg.name === "system";
                    if (isSystem) {
                      return (
                        <div key={i} className="text-[10px] text-muted font-semibold uppercase tracking-wider text-center">
                          {msg.text}
                        </div>
                      );
                    }
                    return (
                      <div key={i} className="text-xs flex items-start gap-1.5 leading-relaxed">
                        <span className="font-bold text-white">{msg.name}:</span>
                        <span className="text-textSec">{msg.text}</span>
                      </div>
                    );
                  })}
                  <div ref={lobbyChatEndRef} />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={lobbyChatText}
                  onChange={(e) => setLobbyChatText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendLobbyChat();
                  }}
                  placeholder="Type in lobby chat..."
                  className="flex-1 bg-secondary/80 border border-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                />
                <button
                  onClick={handleSendLobbyChat}
                  className="px-5 py-2.5 bg-secondary border border-border text-xs text-white rounded-xl hover:bg-white/5 active:scale-95 transition-all"
                >
                  Send
                </button>
              </div>
            </div>

            {isHost && (
              <button
                onClick={handleStartGame}
                className="w-full py-4 bg-gradient-accent rounded-2xl font-bold text-sm text-white shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <FiPlay /> Start Match
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── 3. ACTIVE GAME SCREEN ── */}
      {gameState.activeScreen === "game" && (
        <div className="max-w-[1200px] mx-auto flex flex-col gap-6">
          
          {/* Game Top Navigation Info */}
          <div className="glass-panel p-4 px-6 flex items-center justify-between text-xs">
            <div className="flex items-center gap-6">
              <span className="font-bold text-white">
                Round {gameState.round} / {gameState.maxRounds}
              </span>
              <div className="flex items-center gap-2 font-mono text-sm font-bold text-primary">
                <FiRotateCcw />
                <span>{gameState.timeLeft}s</span>
              </div>
            </div>

            <div className="text-center font-mono font-bold text-base tracking-widest text-white">
              {gameState.amDrawing ? (
                <span className="text-primary">WORD: {gameState.wordHint}</span>
              ) : (
                <span>HINT: {gameState.wordHint || "Waiting..."}</span>
              )}
            </div>

            <button onClick={handleLeaveLobby} className="text-xs text-red-400 font-semibold hover:underline">
              Leave Game
            </button>
          </div>

          {/* Canvas + Players + Live Chat Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* Player Scores Sidebar (Left) */}
            <div className="md:col-span-1 glass-panel p-4 flex flex-col gap-3">
              <h4 className="text-xs font-bold text-textSec uppercase tracking-wider border-b border-border pb-2">
                Leaderboard
              </h4>
              <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto">
                {players.map((p) => {
                  const isDrawer = p.id === gameState.drawerId;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                        isDrawer ? "bg-primary/20 border-primary/40 text-white" : "bg-secondary/40 border-border text-textSec"
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-xl select-none">{p.avatar}</span>
                        <div className="overflow-hidden">
                          <div className="font-bold text-white truncate max-w-[85px]">{p.name}</div>
                          {isDrawer && <span className="text-[9px] text-primary font-semibold">Drawing</span>}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-white text-xs">{p.score || 0} pts</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Canvas Workspace (Center) */}
            <div className="md:col-span-2 glass-panel p-4 flex flex-col items-center gap-4 relative">
              
              {/* Word Select Overlay */}
              {gameState.showWordSelect && gameState.amDrawing && (
                <div className="absolute inset-0 bg-bg/90 backdrop-blur-md z-30 rounded-3xl flex flex-col items-center justify-center p-6 text-center">
                  <h3 className="font-grotesk font-bold text-xl text-white mb-4">Choose a Word to Draw</h3>
                  <div className="flex flex-wrap gap-3 justify-center">
                    {gameState.wordChoices.map((word) => (
                      <button
                        key={word}
                        onClick={() => handleSelectWord(word)}
                        className="px-6 py-3 bg-gradient-accent text-white font-bold text-sm rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-lg"
                      >
                        {word}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Round End Overlay */}
              {gameState.showRoundEnd && (
                <div className="absolute inset-0 bg-bg/90 backdrop-blur-md z-30 rounded-3xl flex flex-col items-center justify-center p-6 text-center">
                  <h3 className="font-grotesk font-bold text-2xl text-white mb-2">Round Ended!</h3>
                  <p className="text-sm text-textSec mb-4">The word was: <strong className="text-primary">{gameState.roundEndData?.word}</strong></p>
                  <div className="text-xs text-muted">Next round starting shortly...</div>
                </div>
              )}

              {/* Game Over Podiums Overlay */}
              {gameState.showGameOver && (
                <div className="absolute inset-0 bg-bg/95 backdrop-blur-md z-30 rounded-3xl flex flex-col items-center justify-center p-6 text-center">
                  <h3 className="font-grotesk font-bold text-3xl text-white mb-2">Match Finished! 🏆</h3>
                  <p className="text-sm text-textSec mb-6">Final Leaderboard Standings</p>
                  
                  <div className="flex items-end gap-4 mb-6">
                    {gameState.gameOverData?.podium?.slice(0, 3).map((p, i) => (
                      <div key={p.id} className="flex flex-col items-center">
                        <span className="text-3xl mb-1">{p.avatar}</span>
                        <div className="text-xs font-bold text-white">{p.name}</div>
                        <div className="text-[10px] text-primary font-mono">{p.score} pts</div>
                        <div className={`w-16 rounded-t-xl bg-primary/20 border border-primary/40 mt-2 flex items-center justify-center font-bold text-white ${
                          i === 0 ? "h-24" : i === 1 ? "h-16" : "h-12"
                        }`}>
                          #{i + 1}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setGameState((prev) => ({ ...prev, activeScreen: "lobby", showGameOver: false }))}
                    className="px-6 py-3 bg-gradient-accent text-white font-bold text-sm rounded-xl hover:opacity-90 transition-all"
                  >
                    Return to Lobby
                  </button>
                </div>
              )}

              {/* HTML5 Canvas */}
              <div className="w-full bg-white rounded-2xl overflow-hidden flex items-center justify-center border border-border">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={400}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-auto max-h-[380px] cursor-crosshair touch-none"
                />
              </div>

              {/* Canvas Controls Toolbar (Only active if amDrawing) */}
              {gameState.amDrawing && (
                <div className="w-full bg-secondary/80 border border-border p-3 rounded-xl flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => { setBrushColor(c); setTool("pen"); }}
                        className={`w-6 h-6 rounded-full border border-white/20 ${brushColor === c && tool === "pen" ? "ring-2 ring-primary scale-110" : ""}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTool("pen")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${tool === "pen" ? "bg-primary text-white" : "bg-secondary text-textSec"}`}
                    >
                      Pen
                    </button>
                    <button
                      onClick={() => setTool("eraser")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${tool === "eraser" ? "bg-primary text-white" : "bg-secondary text-textSec"}`}
                    >
                      Eraser
                    </button>
                    <button
                      onClick={handleClear}
                      className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 font-semibold"
                    >
                      Clear Canvas
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Live Guesses Chat Sidebar (Right) */}
            <div className="md:col-span-1 glass-panel p-4 flex flex-col justify-between h-[440px]">
              <div>
                <h4 className="text-xs font-bold text-textSec uppercase tracking-wider border-b border-border pb-2 mb-3">
                  Guesses & Chat
                </h4>
                <div className="max-h-[320px] overflow-y-auto flex flex-col gap-2">
                  {gameMessages.map((msg, i) => {
                    if (msg.type === "correct") {
                      return (
                        <div key={i} className="text-xs font-bold text-emerald-400 bg-emerald-500/10 p-2 rounded-lg text-center">
                          🎉 {msg.name} guessed the word!
                        </div>
                      );
                    }
                    if (msg.name === "system") {
                      return (
                        <div key={i} className="text-[10px] text-muted font-semibold uppercase text-center">
                          {msg.text}
                        </div>
                      );
                    }
                    return (
                      <div key={i} className="text-xs leading-relaxed flex items-start gap-1">
                        <span className="font-bold text-white truncate max-w-[80px]">{msg.name}:</span>
                        <span className="text-textSec break-all">{msg.text}</span>
                      </div>
                    );
                  })}
                  <div ref={gameChatEndRef} />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  disabled={gameState.amDrawing}
                  value={gameChatText}
                  onChange={(e) => setGameChatText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendGuessChat();
                  }}
                  placeholder={gameState.amDrawing ? "You are drawing!" : "Type your guess..."}
                  className="flex-1 bg-secondary/80 border border-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  onClick={handleSendGuessChat}
                  disabled={gameState.amDrawing}
                  className="px-3.5 py-2 bg-gradient-accent text-white text-xs font-semibold rounded-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
