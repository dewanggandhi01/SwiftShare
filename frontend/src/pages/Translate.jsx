import React, { useState, useEffect, useRef } from "react";
import { 
  FiGlobe, FiFileText, FiRefreshCw, FiVolume2, FiMic, FiCopy, 
  FiCheck, FiTrash2, FiDownload, FiZap, FiShield, FiClock,
  FiArrowRight, FiFile
} from "react-icons/fi";
import { LANGUAGES } from "../assets/languages";
import { motion, AnimatePresence } from "framer-motion";

export default function Translate() {
  const [activeTab, setActiveTab] = useState("text"); // "text" | "file"
  const [langFrom, setLangFrom] = useState("auto");
  const [langTo, setLangTo] = useState("es"); // default target: Spanish
  
  // Text translation states
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [detectedLang, setDetectedLang] = useState("");
  const [translating, setTranslating] = useState(false);
  const [copiedType, setCopiedType] = useState(""); // "" | "source" | "translated"

  // Speech states
  const [listening, setListening] = useState(false);

  // File translation states
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileProgressMsg, setFileProgressMsg] = useState("");
  const [fileProgressPct, setFileProgressPct] = useState(0);
  const [fileTranslating, setFileTranslating] = useState(false);
  const [extractedFileText, setExtractedFileText] = useState("");
  const [translatedFileText, setTranslatedFileText] = useState("");
  const [showFileResult, setShowFileResult] = useState(false);
  
  // History and Recents
  const [history, setHistory] = useState([]);
  const [recents, setRecents] = useState([]);

  const recognitionRef = useRef(null);

  // Load history/recents
  useEffect(() => {
    try {
      const hist = JSON.parse(localStorage.getItem("tr_history") || "[]");
      setHistory(hist);
      const rec = JSON.parse(localStorage.getItem("tr_recent_langs") || "[]");
      setRecents(rec);
    } catch (_) {}
  }, []);

  const saveHistory = (entry) => {
    setHistory((prev) => {
      const updated = [entry, ...prev].slice(0, 50);
      localStorage.setItem("tr_history", JSON.stringify(updated));
      return updated;
    });
  };

  const addRecent = (code) => {
    if (code === "auto") return;
    setRecents((prev) => {
      const updated = [code, ...prev.filter((c) => c !== code)].slice(0, 6);
      localStorage.setItem("tr_recent_langs", JSON.stringify(updated));
      return updated;
    });
  };

  // Text Translation API call
  const triggerTranslation = async (text, from, to) => {
    if (!text.trim()) {
      setTranslatedText("");
      setDetectedLang("");
      return;
    }
    setTranslating(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          from: from === "auto" ? "" : from,
          to
        })
      });
      if (res.ok) {
        const data = await res.json();
        setTranslatedText(data.translated);
        if (data.detectedLang) {
          const matchedLang = LANGUAGES.find((l) => l.code === data.detectedLang);
          setDetectedLang(matchedLang ? matchedLang.name : data.detectedLang);
        } else {
          setDetectedLang("");
        }
        addRecent(to);

        saveHistory({
          original: text.substring(0, 100),
          translated: data.translated.substring(0, 100),
          from,
          to,
          isFile: false
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTranslating(false);
    }
  };

  // Manual Trigger or Auto-translate debounce
  const handleManualTranslate = () => {
    triggerTranslation(sourceText, langFrom, langTo);
  };

  // Speech-to-Text (STT) Recognition
  const startSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech Recognition is not supported in this browser.");
      return;
    }

    const rec = new SpeechRecognition();
    recognitionRef.current = rec;
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = langFrom === "auto" ? "en-US" : langFrom;

    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    
    rec.onresult = (e) => {
      const result = e.results[0][0].transcript;
      setSourceText((prev) => (prev ? prev + " " + result : result));
    };

    rec.start();
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current && listening) {
      recognitionRef.current.stop();
    }
  };

  // Text-to-Speech (TTS) Synthesis
  const handleSpeak = (text, langCode) => {
    if (!text || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    if (langCode && langCode !== "auto") {
      utterance.lang = langCode;
    }
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  // Copy Clipboard
  const handleCopy = (text, type) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedType(type);
      setTimeout(() => setCopiedType(""), 2000);
    });
  };

  // Switch Lang helper
  const handleSwapLanguages = () => {
    if (langFrom === "auto") return;
    const tmp = langFrom;
    setLangFrom(langTo);
    setLangTo(tmp);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  // Document file translation logic
  const handleFileDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
      setShowFileResult(false);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setShowFileResult(false);
    }
  };

  // Helper text extraction function
  const extractTextFromFile = async (file) => {
    const ext = file.name.split(".").pop().toLowerCase();
    
    if (ext === "txt") {
      return file.text();
    }
    
    if (ext === "docx") {
      if (!window.mammoth) throw new Error("mammoth library not loaded");
      const buf = await file.arrayBuffer();
      const result = await window.mammoth.extractRawText({ arrayBuffer: buf });
      return result.value.trim();
    }

    if (ext === "pdf") {
      if (!window.pdfjsLib) throw new Error("pdfjs library not loaded");
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      
      const buf = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const tc = await page.getTextContent();
        const pt = tc.items.map((it) => it.str).join(" ");
        text += pt + "\n\n";
      }
      return text.trim();
    }

    if (["png", "jpg", "jpeg", "gif", "bmp", "webp"].includes(ext)) {
      if (!window.Tesseract) throw new Error("Tesseract.js not loaded");
      setFileProgressMsg("OCR Initialization...");
      const url = URL.createObjectURL(file);
      try {
        const worker = await window.Tesseract.createWorker("eng");
        const { data } = await worker.recognize(url);
        await worker.terminate();
        return data.text.trim();
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    throw new Error("Unsupported file format.");
  };

  const handleFileTranslate = async () => {
    if (!selectedFile) return;
    setFileTranslating(true);
    setFileProgressPct(10);
    setFileProgressMsg("Reading document...");

    try {
      const extracted = await extractTextFromFile(selectedFile);
      setExtractedFileText(extracted);
      setFileProgressPct(40);
      setFileProgressMsg("Translating text...");

      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: extracted,
          from: langFrom === "auto" ? "" : langFrom,
          to: langTo
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTranslatedFileText(data.translated);
        setFileProgressPct(100);
        setShowFileResult(true);

        saveHistory({
          original: extracted.substring(0, 100) + "...",
          translated: data.translated.substring(0, 100) + "...",
          from: langFrom,
          to: langTo,
          isFile: true,
          fileName: selectedFile.name
        });
      } else {
        alert("File translation failed.");
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setFileTranslating(false);
    }
  };

  const handleDownloadTxt = () => {
    if (!translatedFileText) return;
    const blob = new Blob([translatedFileText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "translated_" + (selectedFile ? selectedFile.name : "text") + ".txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = async () => {
    if (!translatedFileText) return;
    if (!window.PDFLib) {
      alert("PDF Toolkit library is not loaded.");
      return;
    }

    try {
      const pdfDoc = await window.PDFLib.PDFDocument.create();
      const font = await pdfDoc.embedFont(window.PDFLib.StandardFonts.Helvetica);
      const fontSize = 11;
      const margin = 50;
      const pageW = 595;
      const pageH = 842;
      const maxW = pageW - 2 * margin;

      const wrapText = (text, f, sz, max) => {
        const words = text.split(" ");
        const lines = [];
        let current = "";
        words.forEach((w) => {
          const test = current ? current + " " + w : w;
          if (f.widthOfTextAtSize(test, sz) > max) {
            lines.push(current);
            current = w;
          } else {
            current = test;
          }
        });
        if (current) lines.push(current);
        return lines;
      };

      const paragraphs = translatedFileText.split("\n");
      let page = pdfDoc.addPage([pageW, pageH]);
      let y = pageH - margin;

      paragraphs.forEach((p) => {
        const lines = wrapText(p || " ", font, fontSize, maxW);
        lines.forEach((line) => {
          if (y < margin) {
            page = pdfDoc.addPage([pageW, pageH]);
            y = pageH - margin;
          }
          page.drawText(line, { x: margin, y, size: fontSize, font, color: window.PDFLib.rgb(0, 0, 0) });
          y -= fontSize * 1.5;
        });
        y -= fontSize * 0.5;
      });

      const bytes = await pdfDoc.save();
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "translated_" + (selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, "") : "doc") + ".pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("PDF creation failed: " + err.message);
    }
  };

  return (
    <div className="relative w-full max-w-[1600px] mx-auto pt-2 pb-16 px-4 md:px-8 lg:px-12 xl:px-16">
      
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

      {/* ─── Two-Column Layout (Matching File Transfer) ─── */}
      <section className="w-full flex flex-col-reverse md:flex-row items-start justify-between gap-8 md:gap-12">

        {/* ─── LEFT COLUMN: Translation Workspace Card (70%) ─── */}
        <div className="w-full md:w-[70%] flex-shrink-0">
          <div className="relative rounded-[24px] border border-white/[0.06] bg-[#111216] shadow-xl overflow-hidden">
            
            {/* Animated Glassy Waves Background */}
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#1E182D]/95 to-[#111216]/98">
              <div className="glassy-wave-1" />
              <div className="glassy-wave-2" />
              <div className="absolute inset-0 backdrop-blur-[24px] bg-[#111216]/40" />
            </div>

            <div className="relative z-10 w-full h-full p-6">

            {/* Mode Selector Segmented Tabs */}
            <div className="flex items-center bg-white/[0.03] p-1 rounded-xl mb-6 border border-white/[0.06]">
              {[
                { key: "text", label: "Text Translation", icon: <FiGlobe size={14} /> },
                { key: "file", label: "File Translation", icon: <FiFileText size={14} /> },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 relative py-2.5 text-xs font-semibold tracking-tight rounded-lg transition-all duration-200 ${
                    activeTab === tab.key
                      ? "bg-[#6C63FF] text-white shadow-md"
                      : "bg-transparent text-textSec hover:text-white"
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    {tab.icon} {tab.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Language Selection Row */}
            <div className="flex flex-col sm:flex-row items-center gap-3 mb-6 relative">
              <div className="flex-1 w-full">
                <select
                  value={langFrom}
                  onChange={(e) => setLangFrom(e.target.value)}
                  className="w-full h-[52px] bg-[#111216]/80 backdrop-blur-md border border-white/[0.08] text-white text-xs rounded-xl px-4 focus:outline-none focus:border-[#6C63FF]/50 shadow-sm"
                >
                  <option value="auto">Detect Language</option>
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>{l.name}</option>
                  ))}
                </select>
              </div>

              {/* Swap Button */}
              <button
                disabled={langFrom === "auto"}
                onClick={handleSwapLanguages}
                className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.08] text-textSec hover:text-white hover:bg-white/[0.08] flex items-center justify-center transition-all flex-shrink-0 disabled:opacity-40"
                title="Swap languages"
              >
                <FiRefreshCw size={14} />
              </button>

              <div className="flex-1 w-full">
                <select
                  value={langTo}
                  onChange={(e) => setLangTo(e.target.value)}
                  className="w-full h-[52px] bg-[#111216]/80 backdrop-blur-md border border-white/[0.08] text-white text-xs rounded-xl px-4 focus:outline-none focus:border-[#6C63FF]/50 shadow-sm"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>{l.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tab 1: Text Translation View */}
            {activeTab === "text" && (
              <div className="flex flex-col gap-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Source Text Box */}
                  <div className="rounded-2xl border border-white/[0.08] bg-[#111216]/80 backdrop-blur-xl p-5 flex flex-col justify-between min-h-[260px] relative focus-within:border-[#6C63FF]/40 transition-colors shadow-lg">
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-textSec uppercase tracking-wider mb-2">
                        <span>Source Text</span>
                        {detectedLang && <span className="text-[#6C63FF] lowercase">({detectedLang})</span>}
                      </div>
                      <textarea
                        value={sourceText}
                        onChange={(e) => setSourceText(e.target.value)}
                        placeholder="Type or paste text to translate..."
                        rows={7}
                        className="w-full bg-transparent border-none text-sm text-white focus:outline-none resize-none placeholder:text-muted/60"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
                      <div className="flex items-center gap-1 text-textSec">
                        <button
                          onClick={() => handleSpeak(sourceText, langFrom)}
                          disabled={!sourceText}
                          className="p-1.5 hover:bg-white/[0.06] hover:text-white rounded-lg transition-colors disabled:opacity-30"
                          title="Speak source text"
                        >
                          <FiVolume2 size={15} />
                        </button>
                        {listening ? (
                          <button
                            onClick={stopSpeechRecognition}
                            className="p-1.5 bg-red-500/20 text-red-400 rounded-lg animate-pulse"
                            title="Listening..."
                          >
                            <FiMic size={15} />
                          </button>
                        ) : (
                          <button
                            onClick={startSpeechRecognition}
                            className="p-1.5 hover:bg-white/[0.06] hover:text-white rounded-lg transition-colors"
                            title="Voice input"
                          >
                            <FiMic size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => handleCopy(sourceText, "source")}
                          disabled={!sourceText}
                          className="p-1.5 hover:bg-white/[0.06] hover:text-white rounded-lg transition-colors disabled:opacity-30"
                          title="Copy source text"
                        >
                          {copiedType === "source" ? <FiCheck size={15} /> : <FiCopy size={15} />}
                        </button>
                        {sourceText && (
                          <button
                            onClick={() => { setSourceText(""); setTranslatedText(""); }}
                            className="p-1.5 hover:bg-white/[0.06] hover:text-red-400 rounded-lg transition-colors"
                            title="Clear text"
                          >
                            <FiTrash2 size={15} />
                          </button>
                        )}
                      </div>

                      <span className="text-[11px] text-textSec/60 font-mono">
                        {sourceText.length.toLocaleString()} / 50,000
                      </span>
                    </div>
                  </div>

                  {/* Translation Output Box */}
                  <div className="rounded-2xl border border-white/[0.08] bg-[#111216]/80 backdrop-blur-xl p-5 flex flex-col justify-between min-h-[260px] relative shadow-lg">
                    <div>
                      <div className="text-[11px] font-semibold text-textSec uppercase tracking-wider mb-2">
                        Translation Output
                      </div>
                      {translating ? (
                        <div className="py-12 flex items-center justify-center">
                          <div className="w-7 h-7 rounded-full border-2 border-t-transparent border-[#6C63FF] animate-spin" />
                        </div>
                      ) : (
                        <div className="text-sm text-white whitespace-pre-wrap select-text leading-relaxed min-h-[140px]">
                          {translatedText || <span className="text-muted/50 italic">Translation will appear here...</span>}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-1 pt-3 border-t border-white/[0.04] text-textSec">
                      <button
                        onClick={() => handleSpeak(translatedText, langTo)}
                        disabled={!translatedText}
                        className="p-1.5 hover:bg-white/[0.06] hover:text-white rounded-lg transition-colors disabled:opacity-30"
                        title="Speak translation"
                      >
                        <FiVolume2 size={15} />
                      </button>
                      <button
                        onClick={() => handleCopy(translatedText, "translated")}
                        disabled={!translatedText}
                        className="p-1.5 hover:bg-white/[0.06] hover:text-white rounded-lg transition-colors disabled:opacity-30"
                        title="Copy translation"
                      >
                        {copiedType === "translated" ? <FiCheck size={15} /> : <FiCopy size={15} />}
                      </button>
                    </div>
                  </div>

                </div>

                {/* Primary Action Button */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleManualTranslate}
                    disabled={!sourceText.trim() || translating}
                    className="w-[220px] h-[52px] bg-[#6C63FF] hover:bg-[#5b52e0] text-white text-xs font-semibold rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {translating ? "Translating..." : "Translate"} <FiArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: File Translation View */}
            {activeTab === "file" && (
              <div className="flex flex-col gap-5">
                {!selectedFile && !fileTranslating && (
                  <div
                    onDragOver={handleFileDrop}
                    onDrop={handleFileDrop}
                    onClick={() => document.getElementById("trans-file-input").click()}
                    className="border-2 border-dashed border-white/[0.12] hover:border-[#6C63FF]/50 bg-[#111216]/70 backdrop-blur-md hover:bg-[#111216]/90 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all text-center select-none shadow-lg"
                  >
                    <input
                      type="file"
                      id="trans-file-input"
                      onChange={handleFileSelect}
                      accept=".pdf,.docx,.txt,image/*"
                      className="hidden"
                    />
                    <div className="w-12 h-12 rounded-xl bg-[#6C63FF]/10 border border-[#6C63FF]/20 flex items-center justify-center text-[#6C63FF] text-xl mb-4">
                      <FiFileText />
                    </div>
                    <p className="font-semibold text-white text-sm mb-1">Drag & Drop Document Here</p>
                    <p className="text-xs text-textSec/70 mb-3">Accepts PDF, DOCX, TXT, or images (Up to 10MB)</p>
                    <span className="px-4 py-1.5 bg-white/[0.04] border border-white/[0.08] text-xs font-medium text-white rounded-lg">Browse Files</span>
                  </div>
                )}

                {selectedFile && !fileTranslating && !showFileResult && (
                  <div className="flex flex-col items-center justify-center border border-white/[0.06] bg-white/[0.015] p-8 rounded-2xl text-center">
                    <FiFile className="text-3xl text-[#6C63FF] mb-3" />
                    <span className="text-sm font-semibold text-white truncate max-w-[280px] mb-1">{selectedFile.name}</span>
                    <span className="text-xs text-textSec/60 mb-6">{selectedFile.type || "Document"}</span>
                    
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="px-5 py-2.5 bg-white/[0.04] border border-white/[0.08] text-white hover:bg-white/[0.08] rounded-xl text-xs font-semibold transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleFileTranslate}
                        className="px-6 py-2.5 bg-[#6C63FF] hover:bg-[#5b52e0] text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-2"
                      >
                        Translate Document <FiArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                )}

                {fileTranslating && (
                  <div className="py-10 flex flex-col items-center justify-center">
                    <div className="w-10 h-10 rounded-full border-2 border-t-transparent border-[#6C63FF] animate-spin mb-4" />
                    <p className="font-semibold text-white text-sm mb-2">{fileProgressMsg}</p>
                    <div className="w-full bg-white/[0.04] border border-white/[0.06] h-2.5 rounded-full overflow-hidden max-w-[320px]">
                      <div className="bg-[#6C63FF] h-full transition-all duration-300" style={{ width: `${fileProgressPct}%` }} />
                    </div>
                  </div>
                )}

                {showFileResult && (
                  <div className="flex flex-col gap-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border border-white/[0.08] bg-[#111216]/80 backdrop-blur-md p-4 rounded-xl shadow-lg">
                        <span className="text-[10px] font-semibold text-textSec uppercase tracking-wider block mb-2">Original Extracted Text</span>
                        <div className="text-xs text-textSec p-3 max-h-[260px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                          {extractedFileText}
                        </div>
                      </div>
                      <div className="border border-white/[0.08] bg-[#111216]/80 backdrop-blur-md p-4 rounded-xl shadow-lg">
                        <span className="text-[10px] font-semibold text-textSec uppercase tracking-wider block mb-2">Translated Output</span>
                        <div className="text-xs text-white p-3 max-h-[260px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                          {translatedFileText}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/[0.06] pt-4">
                      <button
                        onClick={() => { setSelectedFile(null); setShowFileResult(false); }}
                        className="px-4 py-2 bg-white/[0.03] border border-white/[0.08] text-textSec hover:text-white rounded-xl text-xs font-semibold transition-all"
                      >
                        Translate Another File
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleDownloadTxt}
                          className="px-4 py-2 bg-white/[0.04] border border-white/[0.08] text-white hover:bg-white/[0.08] rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                        >
                          <FiDownload size={13} /> .TXT
                        </button>
                        <button
                          onClick={handleDownloadPdf}
                          className="px-4 py-2 bg-[#6C63FF] hover:bg-[#5b52e0] text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                        >
                          <FiDownload size={13} /> .PDF
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

        {/* ── RIGHT COLUMN: Information Panel (30%, Matching File Transfer) ── */}
        <div className="w-full md:w-[30%] flex flex-col items-start text-left md:pl-2">
          
          {/* Heading */}
          <h1 className="font-sans font-extrabold text-[2rem] md:text-[2.75rem] tracking-tight leading-[1.1] text-white mb-3">
            Translate<br />
            <span className="text-[#6C63FF]">Instantly</span>
          </h1>

          {/* Description */}
          <p className="text-[#B5BAC7] text-sm leading-[1.7] mb-6 max-w-[320px]">
            Translate text, documents and files instantly.<br />
            Fast, accurate and completely private.
          </p>

          {/* Feature List */}
          <ul className="flex flex-col gap-3 mb-6">
            {[
              { icon: <FiGlobe size={15} />, text: "100+ Languages Supported" },
              { icon: <FiZap size={15} />, text: "AI Powered Engine" },
              { icon: <FiFileText size={15} />, text: "PDF & Document Translation" },
              { icon: <FiClock size={15} />, text: "Instant Results" },
              { icon: <FiShield size={15} />, text: "100% Private Local Processing" },
              { icon: <FiCopy size={15} />, text: "Copy & Export Features" },
            ].map((item) => (
              <li key={item.text} className="flex items-center gap-2.5 text-[13px] text-textSec/80 font-medium">
                <span className="text-[#6C63FF]">{item.icon}</span>
                {item.text}
              </li>
            ))}
          </ul>

          {/* Small Purple Divider Line */}
          <div className="w-10 h-[2px] rounded-full bg-[#6C63FF]/40" />
        </div>

      </section>
    </div>
  );
}
