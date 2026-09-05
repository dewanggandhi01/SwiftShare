import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import io from "socket.io-client";
import { 
  FiUploadCloud, FiDownloadCloud, FiFile, FiTrash2, FiCopy, 
  FiCheck, FiRefreshCw, FiCheckCircle, FiShield, FiClock, FiLink, 
  FiArrowRight 
} from "react-icons/fi";

// Utility to format sizes
const formatSize = (bytes) => {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + " " + units[i];
};

export default function Home() {
  const [activeTab, setActiveTab] = useState("send"); // "send" | "receive"
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState("");
  const [transferData, setTransferData] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [countdown, setCountdown] = useState("");
  const [copiedText, setCopiedText] = useState("");
  const [p2pStatus, setP2pStatus] = useState("waiting"); // "waiting" | "connected"
  
  // Receive states
  const [receiveKey, setReceiveKey] = useState("");
  const [receiveError, setReceiveError] = useState("");
  const [searching, setSearching] = useState(false);
  const [receivedTransfer, setReceivedTransfer] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const fileInputRef = useRef(null);
  const socketRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const uploadXhrRef = useRef(null);

  // Initialize socket
  useEffect(() => {
    socketRef.current = io();

    socketRef.current.on("peer-joined", () => {
      setP2pStatus("connected");
    });

    return () => {
      if (socketRef.current) socketRef.current.close();
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  // Listen to P2P Status updates if code is active
  useEffect(() => {
    if (transferData && socketRef.current) {
      socketRef.current.emit("join-room", transferData.code);
    }
  }, [transferData]);

  // Expiry Timer countdown
  const startCountdown = (seconds) => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    let remaining = seconds;
    
    const updateTimer = () => {
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      setCountdown(`${m}:${s.toString().padStart(2, "0")}`);
      if (remaining <= 0) {
        clearInterval(countdownIntervalRef.current);
        setCountdown("Expired");
      }
      remaining--;
    };

    updateTimer();
    countdownIntervalRef.current = setInterval(updateTimer, 1000);
  };

  // Drag and Drop handlers
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearFiles = () => {
    setSelectedFiles([]);
  };

  // Copy helper
  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(type);
      setTimeout(() => setCopiedText(""), 2000);
    });
  };

  // Upload Logic
  const handleUpload = () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });

    const xhr = new XMLHttpRequest();
    uploadXhrRef.current = xhr;

    const startTime = Date.now();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        setUploadProgress(pct);

        const timeElapsed = (Date.now() - startTime) / 1000;
        const speed = e.loaded / timeElapsed;
        setUploadSpeed(`${formatSize(speed)}/s`);
      }
    });

    xhr.addEventListener("load", () => {
      setUploading(false);
      if (xhr.status === 200) {
        try {
          const data = JSON.parse(xhr.responseText);
          setTransferData(data);
          startCountdown(data.codeExpiresIn);

          fetch(`/api/qrcode/${encodeURIComponent(data.linkId)}`)
            .then((r) => r.json())
            .then((d) => setQrCodeUrl(d.qr))
            .catch(() => {});
        } catch (err) {
          alert("Failed to parse server response.");
        }
      } else {
        let msg = "Upload failed";
        try {
          msg = JSON.parse(xhr.responseText).error || msg;
        } catch (_) {}
        alert(msg);
      }
    });

    xhr.addEventListener("error", () => {
      setUploading(false);
      alert("Network error occurred during upload.");
    });

    xhr.open("POST", "/api/upload");
    xhr.send(formData);
  };

  // Cancel Upload
  const cancelUpload = () => {
    if (uploadXhrRef.current) {
      uploadXhrRef.current.abort();
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Reset Send Section
  const handleResetSend = () => {
    setSelectedFiles([]);
    setTransferData(null);
    setQrCodeUrl("");
    setCountdown("");
    setP2pStatus("waiting");
  };

  // Receive Files logic
  const handleReceiveSearch = (key) => {
    const rawKey = key.trim();
    if (!rawKey) return;

    setSearching(true);
    setReceiveError("");
    setReceivedTransfer(null);

    let finalKey = rawKey;
    if (rawKey.includes("link=")) {
      const urlParams = new URLSearchParams(rawKey.split("?")[1]);
      finalKey = urlParams.get("link") || rawKey;
    }

    fetch(`/api/info/${encodeURIComponent(finalKey)}`)
      .then((r) => {
        if (!r.ok) return r.json().then((d) => Promise.reject(d));
        return r.json();
      })
      .then((data) => {
        setReceivedTransfer({ key: finalKey, ...data });
        if (socketRef.current) {
          socketRef.current.emit("join-room", finalKey);
        }
      })
      .catch((err) => {
        setReceiveError(err.error || "Transfer session not found or expired.");
      })
      .finally(() => {
        setSearching(false);
      });
  };

  // Download Files
  const handleDownload = () => {
    if (!receivedTransfer) return;
    setDownloading(true);

    const a = document.createElement("a");
    a.href = `/api/download/${encodeURIComponent(receivedTransfer.key)}`;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      setDownloading(false);
    }, 2000);
  };

  const handleResetReceive = () => {
    setReceivedTransfer(null);
    setReceiveKey("");
    setReceiveError("");
  };

  // Quick select URL link check
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const linkParam = params.get("link") || params.get("code");
    if (linkParam) {
      setActiveTab("receive");
      setReceiveKey(linkParam);
      handleReceiveSearch(linkParam);
    }
  }, []);

  return (
    <div className="relative w-full">
      <style>
        {`
          @keyframes wave-spin {
            0% { transform: rotate(0deg) scale(1); }
            50% { transform: rotate(180deg) scale(1.1); }
            100% { transform: rotate(360deg) scale(1); }
          }
          .glassy-wave-1 {
            position: absolute;
            top: -40%;
            left: -10%;
            width: 90%;
            height: 180%;
            background: linear-gradient(135deg, rgba(124,92,255,0.45) 0%, transparent 70%);
            border-radius: 40% 60% 60% 40%;
            animation: wave-spin 16s linear infinite;
            filter: blur(25px);
            pointer-events: none;
          }
          .glassy-wave-2 {
            position: absolute;
            bottom: -40%;
            right: -10%;
            width: 85%;
            height: 180%;
            background: linear-gradient(135deg, rgba(59,130,246,0.35) 0%, transparent 70%);
            border-radius: 60% 40% 40% 60%;
            animation: wave-spin 20s linear infinite reverse;
            filter: blur(30px);
            pointer-events: none;
          }
        `}
      </style>
      
      {/* ─── Two-Column Hero Layout ─── */}
      <section className="w-full min-h-[calc(100vh-200px)] flex items-center py-4 md:py-0">
        <div className="w-full flex flex-col-reverse md:flex-row items-center md:items-center gap-8 md:gap-12">

          {/* ── LEFT COLUMN: File Transfer Card (62%) ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="w-full md:w-[62%] flex-shrink-0"
            id="share-card"
          >
            <div className="relative rounded-[20px] border border-white/[0.07] bg-[#0E1117] shadow-[0_16px_48px_rgba(0,0,0,0.35)] overflow-hidden">
                
                {/* Animated Glassy Waves Background */}
                <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#1E182D]/95 to-[#0E1117]/98">
                  <div className="glassy-wave-1" />
                  <div className="glassy-wave-2" />
                  {/* Glass Overlay Layer to make it feel glassy */}
                  <div className="absolute inset-0 backdrop-blur-[24px] bg-[rgba(14,17,23,0.4)]" />
                </div>

                <div className="relative z-10 w-full h-full p-5 md:p-6">

              {/* Segmented Tab Control */}
              <div className="flex items-center bg-white/[0.035] p-1 rounded-[12px] mb-5 border border-white/[0.05]">
                {[
                  { key: "send", label: "Send Files", icon: <FiUploadCloud size={14} /> },
                  { key: "receive", label: "Receive Files", icon: <FiDownloadCloud size={14} /> },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 relative py-2.5 text-[13px] font-semibold tracking-tight rounded-[9px] transition-all duration-300 ${
                      activeTab === tab.key
                        ? "text-white"
                        : "text-textSec hover:text-white/80"
                    }`}
                  >
                    {activeTab === tab.key && (
                      <motion.div
                        layoutId="activeSegment"
                        className="absolute inset-0 bg-primary/12 border border-primary/20 rounded-[9px]"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center justify-center gap-1.5">
                      {tab.icon} {tab.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <AnimatePresence mode="wait">
                {/* ── SEND TAB ── */}
                {activeTab === "send" && (
                  <motion.div
                    key="send-tab"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                  >
                    {!transferData && !uploading && (
                      <>
                        {/* Drag & Drop Area */}
                        <div
                          onDragOver={handleDragOver}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className="group border border-dashed border-white/[0.08] hover:border-primary/35 bg-white/[0.015] hover:bg-primary/[0.025] rounded-2xl py-12 px-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 select-none"
                        >
                          <input
                            type="file"
                            multiple
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                          />
                          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center text-primary text-lg mb-4 group-hover:scale-105 group-hover:bg-primary/15 transition-all duration-300">
                            <FiUploadCloud />
                          </div>
                          <p className="font-semibold text-white text-sm mb-0.5">Drag & Drop Files</p>
                          <p className="text-xs text-textSec/60">or click to browse</p>
                          <p className="text-[11px] text-muted/50 mt-3">Up to 5 GB</p>
                        </div>

                        {/* Selected Files List */}
                        {selectedFiles.length > 0 && (
                          <div className="mt-4 flex flex-col gap-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-textSec">
                                {selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""} selected
                              </span>
                              <button
                                onClick={clearFiles}
                                className="text-xs text-red-400/70 hover:text-red-300 font-medium flex items-center gap-1 transition-colors"
                              >
                                <FiTrash2 size={11} /> Clear
                              </button>
                            </div>

                            <ul className="max-h-[140px] overflow-y-auto border border-white/[0.05] bg-white/[0.015] rounded-xl divide-y divide-white/[0.04] px-3 py-0.5">
                              {selectedFiles.map((file, idx) => (
                                <li key={idx} className="py-2 flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <FiFile className="text-primary/60 flex-shrink-0" size={13} />
                                    <span className="text-xs font-medium text-white/85 truncate max-w-[220px]">
                                      {file.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-textSec/60 font-medium">
                                      {formatSize(file.size)}
                                    </span>
                                    <button
                                      onClick={() => removeFile(idx)}
                                      className="text-textSec/40 hover:text-red-400 transition-colors"
                                    >
                                      &times;
                                    </button>
                                  </div>
                                </li>
                              ))}
                            </ul>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-1 py-2.5 border border-white/[0.07] text-textSec hover:text-white hover:border-white/[0.12] rounded-xl text-[13px] font-semibold transition-all"
                              >
                                + Add More
                              </button>
                              <button
                                onClick={handleUpload}
                                className="flex-1 py-2.5 bg-gradient-accent rounded-xl text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(108,99,255,0.2)] hover:shadow-[0_4px_20px_rgba(108,99,255,0.3)] hover:brightness-110 active:scale-[0.97] transition-all flex items-center justify-center gap-1.5"
                              >
                                <FiArrowRight size={13} /> Share
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Upload Progress */}
                    {uploading && (
                      <div className="py-10 flex flex-col items-center justify-center">
                        <div className="w-11 h-11 rounded-full border-2 border-primary/25 border-t-primary animate-spin mb-5" />
                        <p className="font-semibold text-white text-sm mb-1">Uploading…</p>
                        <p className="text-xs text-textSec/70 mb-5">{uploadSpeed || "Estimating speed…"}</p>
                        <div className="w-full bg-white/[0.04] border border-white/[0.05] h-2 rounded-full overflow-hidden mb-3 max-w-[320px]">
                          <div
                            className="bg-gradient-accent h-full rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-white mb-5">{uploadProgress}%</span>
                        <button
                          onClick={cancelUpload}
                          className="px-5 py-1.5 border border-red-500/20 text-red-400/70 hover:bg-red-500/10 text-xs font-semibold rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {/* Upload Success */}
                    {transferData && (
                      <div className="py-3 flex flex-col items-center">
                        <div className="w-11 h-11 rounded-full bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center text-emerald-400 text-lg mb-3">
                          <FiCheckCircle />
                        </div>
                        <h3 className="font-grotesk text-base font-bold text-white mb-0.5">Ready to Share</h3>
                        <p className="text-xs text-textSec/70 mb-4">Expires in {countdown || "--:--"}</p>

                        {/* Code + QR */}
                        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 items-center mb-5 border border-white/[0.05] bg-white/[0.015] p-4 rounded-2xl">
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-semibold text-textSec/60 mb-1.5 uppercase tracking-widest">Code</span>
                            <div className="text-2xl font-extrabold tracking-[0.18em] text-primary font-grotesk bg-white/[0.025] border border-white/[0.05] px-5 py-2.5 rounded-xl select-all">
                              {transferData.code}
                            </div>
                            <button
                              onClick={() => copyToClipboard(transferData.code, "code")}
                              className="mt-2 text-[11px] text-primary/70 font-medium hover:text-primary flex items-center gap-1 transition-colors"
                            >
                              {copiedText === "code" ? <><FiCheck size={11} /> Copied</> : <><FiCopy size={11} /> Copy Code</>}
                            </button>
                          </div>

                          <div className="flex flex-col items-center border-t md:border-t-0 md:border-l border-white/[0.05] pt-4 md:pt-0 md:pl-4">
                            <span className="text-[10px] font-semibold text-textSec/60 mb-1.5 uppercase tracking-widest">QR Code</span>
                            {qrCodeUrl ? (
                              <img src={qrCodeUrl} alt="Share QR" className="w-[90px] h-[90px] rounded-lg border border-white/10 p-1 bg-white" />
                            ) : (
                              <div className="w-[90px] h-[90px] rounded-lg bg-white/[0.03] animate-pulse border border-white/[0.05]" />
                            )}
                          </div>
                        </div>

                        {/* Link */}
                        <div className="w-full flex flex-col gap-1 mb-4">
                          <span className="text-[10px] font-semibold text-textSec/50 uppercase tracking-wider">Direct Link</span>
                          <div className="flex items-center gap-1.5 border border-white/[0.05] bg-white/[0.015] rounded-xl p-1.5 pl-3">
                            <input
                              type="text"
                              readOnly
                              value={window.location.origin + "/?link=" + transferData.linkId}
                              className="bg-transparent border-none text-xs text-white/75 flex-1 focus:ring-0 focus:outline-none truncate"
                            />
                            <button
                              onClick={() => copyToClipboard(window.location.origin + "/?link=" + transferData.linkId, "link")}
                              className="px-3 py-1.5 bg-white/[0.04] text-[11px] font-semibold text-white/80 border border-white/[0.06] rounded-lg hover:bg-white/[0.07] active:scale-95 transition-all flex items-center gap-1"
                            >
                              {copiedText === "link" ? <FiCheck size={11} /> : <FiCopy size={11} />} Copy
                            </button>
                          </div>
                        </div>

                        {/* P2P Status */}
                        <div className="w-full py-2.5 px-3 bg-white/[0.015] border border-white/[0.05] rounded-xl flex items-center gap-2 text-xs mb-4">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p2pStatus === "connected" ? "bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.5)]" : "bg-yellow-500/60"}`} />
                          <span className="text-textSec/70">
                            {p2pStatus === "connected"
                              ? "Receiver connected — P2P active."
                              : "Waiting for receiver…"}
                          </span>
                        </div>

                        <button
                          onClick={handleResetSend}
                          className="py-2 px-5 bg-white/[0.03] border border-white/[0.07] text-white/70 hover:text-white hover:bg-white/[0.05] rounded-xl text-[13px] font-semibold transition-all active:scale-95 flex items-center gap-1.5"
                        >
                          <FiRefreshCw size={12} /> Send New Files
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ── RECEIVE TAB ── */}
                {activeTab === "receive" && (
                  <motion.div
                    key="receive-tab"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                  >
                    {!receivedTransfer && (
                      <div className="py-8 md:py-10">
                        <p className="text-[13px] font-medium text-textSec/70 mb-5 text-center">
                          Enter the 6-digit code or paste the sharing link.
                        </p>

                        <div className="flex flex-col gap-3 max-w-[420px] mx-auto">
                          <div className="flex items-center gap-2 border border-white/[0.07] bg-white/[0.015] rounded-xl p-1.5 pl-3.5 focus-within:border-primary/25 transition-all">
                            <input
                              type="text"
                              value={receiveKey}
                              onChange={(e) => setReceiveKey(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleReceiveSearch(receiveKey)}
                              placeholder="Code or link…"
                              className="bg-transparent border-none text-white text-sm flex-1 focus:ring-0 focus:outline-none placeholder:text-muted/50"
                            />
                            <button
                              onClick={() => handleReceiveSearch(receiveKey)}
                              disabled={searching}
                              className="px-5 py-2 bg-gradient-accent rounded-lg text-xs font-semibold text-white hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all"
                            >
                              {searching ? "Searching…" : "Fetch"}
                            </button>
                          </div>

                          {receiveError && (
                            <p className="text-[11px] text-red-400/70 font-medium text-center">{receiveError}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {receivedTransfer && (
                      <div className="py-3 flex flex-col items-center">
                        <div className="w-11 h-11 rounded-full bg-primary/10 border border-primary/12 flex items-center justify-center text-primary text-lg mb-3">
                          <FiDownloadCloud />
                        </div>
                        <h3 className="font-grotesk text-base font-bold text-white mb-0.5">Files Ready</h3>
                        <p className="text-xs text-textSec/60 mb-4">Encrypted and available for download.</p>

                        <div className="w-full border border-white/[0.05] bg-white/[0.015] p-4 rounded-2xl mb-5">
                          <div className="flex items-center justify-between text-[10px] text-textSec/50 font-semibold border-b border-white/[0.04] pb-2 mb-2 uppercase tracking-wider">
                            <span>File Name</span>
                            <span>Size</span>
                          </div>

                          <ul className="max-h-[160px] overflow-y-auto divide-y divide-white/[0.03]">
                            {receivedTransfer.files.map((file, idx) => (
                              <li key={idx} className="py-2 flex items-center justify-between gap-3 text-sm font-medium">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <FiFile className="text-primary/50 flex-shrink-0" size={12} />
                                  <span className="text-white/85 truncate max-w-[220px] text-xs">{file.name}</span>
                                </div>
                                <span className="text-textSec/50 text-[11px] flex-shrink-0">{formatSize(file.size)}</span>
                              </li>
                            ))}
                          </ul>

                          <div className="border-t border-white/[0.04] pt-2 mt-2 flex items-center justify-between text-[11px] text-textSec/50 font-semibold">
                            <span>Total: {formatSize(receivedTransfer.totalSize)}</span>
                            <span>Downloads: {receivedTransfer.downloads}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleResetReceive}
                            className="py-2 px-4 bg-white/[0.03] border border-white/[0.07] text-white/70 hover:text-white hover:bg-white/[0.05] rounded-xl text-[13px] font-semibold transition-all active:scale-95"
                          >
                            Back
                          </button>
                          <button
                            onClick={handleDownload}
                            disabled={downloading}
                            className="py-2 px-5 bg-gradient-accent rounded-xl text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(108,99,255,0.2)] hover:shadow-[0_4px_20px_rgba(108,99,255,0.3)] hover:brightness-110 active:scale-[0.97] disabled:opacity-50 transition-all flex items-center gap-1.5"
                          >
                            {downloading ? (
                              <>
                                <div className="w-3 h-3 rounded-full border-2 border-t-transparent border-white animate-spin" />
                                Downloading…
                              </>
                            ) : (
                              <>
                                <FiDownloadCloud size={13} /> Download
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
                </AnimatePresence>
  
                </div>
              </div>
            </motion.div>

          {/* ── RIGHT COLUMN: Heading + Description + Features (38%) ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full md:w-[38%] flex flex-col items-start text-left md:pl-4"
          >
            <h1 className="font-grotesk font-extrabold text-[2rem] md:text-[2.75rem] tracking-tight leading-[1.1] text-white mb-3">
              Share Files<br />
              <span className="text-gradient">Instantly</span>
            </h1>

            <p className="text-textSec/80 text-sm leading-relaxed mb-6 max-w-[320px]">
              Secure peer-to-peer file sharing between any device. No sign-up needed.
            </p>

            {/* Feature Checklist */}
            <ul className="flex flex-col gap-2.5 mb-6">
              {[
                { icon: <FiShield size={14} />, text: "End-to-End Secure" },
                { icon: <FiClock size={14} />, text: "Fast Transfers" },
                { icon: <FiLink size={14} />, text: "No Login Required" },
                { icon: <FiFile size={14} />, text: "Up to 5 GB per session" },
              ].map((item) => (
                <li key={item.text} className="flex items-center gap-2.5 text-[13px] text-textSec/70 font-medium">
                  <span className="text-primary/60">{item.icon}</span>
                  {item.text}
                </li>
              ))}
            </ul>

            <div className="hidden md:block w-10 h-[2px] rounded-full bg-gradient-to-r from-primary/30 to-transparent" />
          </motion.div>

        </div>
      </section>
    </div>
  );
}
