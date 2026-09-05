import React, { useState, useEffect, useRef } from "react";
import { 
  FiSearch, FiArrowLeft, FiArrowRight, FiFolder, FiZap, FiFileText, 
  FiRefreshCw, FiEdit3, FiLock, FiSliders, FiGitMerge, 
  FiScissors, FiTrash2, FiArchive, FiTool, 
  FiShield, FiImage, FiCode, FiTv, FiGrid, 
  FiCamera, FiCrop, FiColumns, FiUnlock, FiEyeOff, 
  FiDroplet, FiHash, FiRotateCw, FiPenTool, FiCpu, FiLayers 
} from "react-icons/fi";
import "../pdf.css";

// ── Categories Definition ──
const CATEGORIES = [
  { id: "organize", name: "ORGANIZE", icon: FiFolder, tools: ["merge", "split", "remove-pages", "organize"] },
  { id: "optimize", name: "OPTIMIZE", icon: FiZap, tools: ["compress", "repair", "pdfa", "ocr"] },
  { id: "to-pdf", name: "CONVERT TO PDF", icon: FiFileText, tools: ["word-to-pdf", "jpg-to-pdf", "html-to-pdf", "ppt-to-pdf", "excel-to-pdf", "create-pdf"] },
  { id: "from-pdf", name: "CONVERT FROM PDF", icon: FiRefreshCw, tools: ["pdf-to-word", "pdf-to-jpg", "pdf-to-excel", "pdf-to-ppt"] },
  { id: "edit", name: "EDIT", icon: FiEdit3, tools: ["edit", "crop", "compare"] },
  { id: "security", name: "SECURITY", icon: FiLock, tools: ["protect", "unlock", "redact"] },
  { id: "personalize", name: "PERSONALIZE", icon: FiSliders, tools: ["watermark", "page-numbers", "rotate"] },
  { id: "advanced", name: "ADVANCED", icon: FiLayers, tools: ["sign", "batch"] },
];

// ── Tools Definition & Icon Mapping ──
const TOOLS = {
  "merge":        { name: "Merge PDF",        icon: FiGitMerge,  desc: "Combine multiple PDFs into one document",       keywords: ["merge", "combine", "join"] },
  "split":        { name: "Split PDF",        icon: FiScissors,  desc: "Divide a PDF into smaller files",             keywords: ["split", "divide", "cut", "separate"] },
  "remove-pages": { name: "Remove Pages",     icon: FiTrash2,    desc: "Delete unwanted pages from a PDF",           keywords: ["remove", "delete", "erase", "pages"] },
  "organize":     { name: "Organize PDF",     icon: FiSliders,   desc: "Reorder, rotate and rearrange pages",        keywords: ["organize", "reorder", "rearrange", "sort"] },
  "compress":     { name: "Compress PDF",     icon: FiArchive,   desc: "Reduce PDF file size",                        keywords: ["compress", "reduce", "shrink", "size"] },
  "repair":       { name: "Repair PDF",       icon: FiTool,      desc: "Fix corrupted or damaged PDF files",         keywords: ["repair", "fix", "corrupt", "damaged"] },
  "pdfa":         { name: "Convert to PDF/A", icon: FiShield,    desc: "Convert to PDF/A for long-term archiving",   keywords: ["pdfa", "archive", "iso"] },
  "word-to-pdf":  { name: "Word to PDF",      icon: FiFileText,  desc: "Convert DOC/DOCX files to PDF",              keywords: ["word", "doc", "docx", "convert"] },
  "jpg-to-pdf":   { name: "JPG to PDF",       icon: FiImage,     desc: "Convert images into a PDF document",        keywords: ["jpg", "jpeg", "png", "image", "photo"] },
  "html-to-pdf":  { name: "HTML to PDF",      icon: FiCode,      desc: "Convert HTML content to PDF",                keywords: ["html", "web", "url", "code"] },
  "ppt-to-pdf":   { name: "PPT to PDF",       icon: FiTv,        desc: "Convert presentations to PDF",              keywords: ["ppt", "powerpoint", "presentation", "slides"] },
  "excel-to-pdf": { name: "Excel to PDF",     icon: FiGrid,      desc: "Convert spreadsheet data to PDF",            keywords: ["excel", "xls", "xlsx", "spreadsheet", "sheet", "table"] },
  "create-pdf":   { name: "Create PDF",       icon: FiCamera,    desc: "Scan documents, edit images & create PDFs",   keywords: ["create", "scan", "camera", "new"] },
  "pdf-to-word":  { name: "PDF to Word",      icon: FiFileText,  desc: "Extract text from PDF to editable document", keywords: ["word", "doc", "docx", "convert", "extract"] },
  "pdf-to-jpg":   { name: "PDF to JPG",       icon: FiImage,     desc: "Convert PDF pages into images",              keywords: ["jpg", "jpeg", "png", "image", "photo", "convert"] },
  "pdf-to-excel": { name: "PDF to Excel",     icon: FiGrid,      desc: "Extract data from PDF to spreadsheet",       keywords: ["excel", "xls", "xlsx", "spreadsheet", "sheet", "table"] },
  "pdf-to-ppt":   { name: "PDF to PPT",       icon: FiTv,        desc: "Convert PDF pages for presentations",       keywords: ["ppt", "powerpoint", "presentation", "slides"] },
  "edit":         { name: "Edit PDF",         icon: FiEdit3,     desc: "Add text, images and annotations",           keywords: ["edit", "annotate", "text", "draw"] },
  "crop":         { name: "Crop PDF",         icon: FiCrop,      desc: "Trim margins and adjust page area",          keywords: ["crop", "trim", "margins", "resize"] },
  "compare":      { name: "Compare PDF",      icon: FiColumns,   desc: "Compare two PDFs side by side",              keywords: ["compare", "side-by-side", "diff"] },
  "protect":      { name: "Protect PDF",      icon: FiShield,    desc: "Add password encryption to PDF",             keywords: ["protect", "password", "encrypt", "security", "lock"] },
  "unlock":       { name: "Unlock PDF",       icon: FiUnlock,    desc: "Remove password from protected PDF",         keywords: ["unlock", "password", "decrypt", "security"] },
  "redact":       { name: "Redact PDF",       icon: FiEyeOff,    desc: "Permanently hide sensitive content",         keywords: ["redact", "hide", "blackout", "security", "sensitive"] },
  "watermark":    { name: "Add Watermark",    icon: FiDroplet,   desc: "Add text or image watermark to pages",       keywords: ["watermark", "stamp", "text", "logo"] },
  "page-numbers": { name: "Page Numbers",     icon: FiHash,      desc: "Add page numbers to your document",         keywords: ["numbers", "page", "header", "footer"] },
  "rotate":       { name: "Rotate PDF",       icon: FiRotateCw,  desc: "Rotate pages 90°, 180° or 270°",            keywords: ["rotate", "turn", "orientation"] },
  "sign":         { name: "Sign PDF",         icon: FiPenTool,   desc: "Draw and place your signature on PDF",       keywords: ["sign", "signature", "draw", "autograph"] },
  "ocr":          { name: "OCR",              icon: FiCpu,       desc: "Extract text from scanned documents or images", keywords: ["ocr", "scan", "extract", "text", "recognize"] },
  "batch":        { name: "Batch Process",    icon: FiLayers,    desc: "Process multiple PDFs at once",              keywords: ["batch", "bulk", "multiple"] },
};

const QUICK_SEARCH_CHIPS = [
  { label: "Merge", query: "Merge PDF", toolId: "merge" },
  { label: "Compress", query: "Compress PDF", toolId: "compress" },
  { label: "Convert", query: "to PDF", toolId: "word-to-pdf" },
  { label: "Edit", query: "Edit", toolId: "edit" },
  { label: "Security", query: "Protect", toolId: "protect" }
];

export default function PDFToolkit() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [highlightedToolId, setHighlightedToolId] = useState(null);
  
  const searchInputRef = useRef(null);
  const cardRefs = useRef({});

  // Initialize PDF Toolkit script
  useEffect(() => {
    window.scrollTo(0, 0);

    const initScript = () => {
      if (window.initPDFToolkit) {
        window.initPDFToolkit();
      }
    };

    if (window.initPDFToolkit) {
      initScript();
    } else {
      const checkScript = setInterval(() => {
        if (window.initPDFToolkit) {
          initScript();
          clearInterval(checkScript);
        }
      }, 100);
      return () => clearInterval(checkScript);
    }
  }, []);

  // Keyboard shortcut Ctrl + K / Cmd + K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Open tool trigger
  const handleOpenTool = (toolId) => {
    setIsWorkspaceOpen(true);
    if (window.openPDFTool) {
      window.openPDFTool(toolId);
    } else if (window.initPDFToolkit) {
      window.initPDFToolkit();
      setTimeout(() => window.openPDFTool && window.openPDFTool(toolId), 50);
    }
  };

  // Close workspace trigger
  const handleCloseWorkspace = () => {
    setIsWorkspaceOpen(false);
    if (window.closePDFWorkspace) {
      window.closePDFWorkspace();
    }
  };

  // Handle Quick Search Chip Click (Scroll + Brief Highlight)
  const handleChipClick = (chip) => {
    setSearchQuery(chip.query);
    setHighlightedToolId(chip.toolId);

    const el = cardRefs.current[chip.toolId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    setTimeout(() => {
      setHighlightedToolId(null);
    }, 2000);
  };

  // Instant Search Filter Logic
  const q = searchQuery.trim().toLowerCase();

  const filteredCategories = CATEGORIES.map((cat) => {
    const matchingTools = cat.tools.filter((tId) => {
      if (!q) return true;
      const t = TOOLS[tId];
      if (!t) return false;
      const matchName = t.name.toLowerCase().includes(q);
      const matchDesc = t.desc.toLowerCase().includes(q);
      const matchCategory = cat.name.toLowerCase().includes(q);
      const matchKeywords = t.keywords?.some((k) => k.toLowerCase().includes(q));
      return matchName || matchDesc || matchCategory || matchKeywords;
    });

    return { ...cat, tools: matchingTools };
  }).filter((cat) => cat.tools.length > 0);

  const totalResults = filteredCategories.reduce((acc, cat) => acc + cat.tools.length, 0);

  return (
    <div className="pt-0 pb-12 relative z-10 w-full max-w-[1720px] mx-auto pl-6 md:pl-8 pr-4 md:pr-8">
      
      {/* ── WORKSPACE VIEWPORT (When active tool is opened) ── */}
      <div id="tool-workspace" hidden className="mt-0 pt-2 pl-4">
        <button
          onClick={handleCloseWorkspace}
          className="flex items-center gap-2 px-4 py-2 bg-[#111317] text-xs font-semibold border border-white/[0.08] text-[#9AA1AE] hover:text-white rounded-xl mb-6 hover:bg-[#161920] transition-colors"
          id="ws-back"
        >
          <FiArrowLeft size={14} /> Back to All Tools
        </button>

        <div className="bg-[#111317] border border-white/[0.08] rounded-[20px] p-6 md:p-8">
          <div className="flex items-center gap-4 border-b border-white/[0.08] pb-6 mb-8">
            <span className="w-12 h-12 rounded-[14px] bg-[#7864FF]/[0.08] text-[#8B7DFF] flex items-center justify-center text-2xl font-bold" id="ws-icon"></span>
            <div>
              <h2 className="font-sans font-bold text-2xl text-white tracking-tight" id="ws-title"></h2>
              <p className="text-[#9AA1AE] text-xs font-medium mt-0.5" id="ws-desc"></p>
            </div>
          </div>
          
          <div className="text-white" id="ws-body">
            {/* Tool Workspace rendered by pdf-tools.js */}
          </div>
        </div>
      </div>

      {/* ── DESKTOP SPLIT LAYOUT ── */}
      {!isWorkspaceOpen && (
        <div className="w-full flex flex-col lg:flex-row items-start gap-8 lg:gap-10 pt-0">

          {/* ── LEFT COLUMN (Fixed width 300-320px) ── */}
          <div className="w-full lg:w-[320px] flex-shrink-0 lg:sticky lg:top-[75px] flex flex-col select-none">
            
            {/* Heading & Shortened Description */}
            <h1 className="font-sans font-bold text-[40px] md:text-[42px] text-white tracking-tight leading-[1.1] mb-3 mt-0">
              PDF Toolkit
            </h1>
            
            <p className="text-[#B5BAC7] text-[16px] leading-[24px] mb-6 font-normal">
              Edit, convert, compress & sign PDFs locally. 100% private.
            </p>

            {/* High-Visibility Search Bar */}
            <div className="w-full flex flex-col gap-4">
              <div className={`w-full h-[54px] rounded-[16px] bg-[#181C24] border ${
                isSearchFocused ? "border-[#6C63FF] shadow-[0_0_15px_rgba(108,99,255,0.25)]" : "border-white/15 hover:border-white/25"
              } flex items-center px-4 gap-3 transition-all duration-200`}>
                <FiSearch className="text-[#A0A0AA] text-[20px] flex-shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search PDF tools..."
                  className="w-full bg-transparent border-none text-white text-[15px] font-medium focus:outline-none placeholder:text-[#9AA1AE]"
                />
                <span className="hidden xl:flex items-center gap-0.5 bg-white/[0.08] border border-white/15 px-1.5 py-0.5 rounded text-[10px] font-mono text-[#D0D5E0] flex-shrink-0 select-none">
                  ⌘K
                </span>
              </div>

              {/* Quick Search Chips */}
              <div className="flex flex-wrap items-center gap-2">
                {QUICK_SEARCH_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    onClick={() => handleChipClick(chip)}
                    className={`px-3 flex items-center h-[30px] rounded-lg text-[13px] font-medium transition-colors border ${
                      searchQuery.toLowerCase() === chip.query.toLowerCase()
                        ? "bg-[#6C63FF] border-[#6C63FF] text-white"
                        : "bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-[#9AA1AE] hover:text-white"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Navigation Links to Categories */}
            <div className="hidden lg:flex flex-col mt-8">
              <p className="text-[12px] font-bold tracking-[2px] text-[#5A5F6E] uppercase mb-3">Categories</p>
              <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2D35 transparent' }}>
                {CATEGORIES.map(cat => (
                   <div 
                     key={cat.id} 
                     className="text-[#9AA1AE] text-[13px] font-medium hover:text-[#8B7DFF] cursor-pointer py-1 transition-colors" 
                     onClick={() => {
                       setSearchQuery("");
                       const el = document.getElementById(`category-${cat.id}`);
                       if (el) {
                         const y = el.getBoundingClientRect().top + window.scrollY - 100;
                         window.scrollTo({ top: y, behavior: 'smooth' });
                       }
                     }}
                   >
                     {cat.name}
                   </div>
                ))}
              </div>
            </div>

          </div>

          {/* ── THIN VERTICAL DIVIDER (1px) ── */}
          <div className="hidden lg:block w-[1px] bg-white/[0.08] self-stretch flex-shrink-0" />

          {/* ── RIGHT COLUMN (Tools Grid) ── */}
          <div className="w-full flex-1 flex flex-col min-w-0 pt-0 lg:pl-6">
            
            {/* Empty Search State */}
            {totalResults === 0 ? (
              <div className="w-full bg-[#111317] border border-white/[0.08] rounded-[20px] p-8 text-center flex flex-col items-center select-none my-2">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#9AA1AE] text-xl mb-4">
                  <FiSearch />
                </div>
                <h3 className="text-white font-semibold text-[18px] mb-2 tracking-tight">No PDF tools found</h3>
                <p className="text-[#9AA1AE] text-[14px] leading-relaxed mb-4">
                  Try searching "Merge", "Word", "Compress", "OCR", "Security"...
                </p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="px-4 py-2 bg-[#161920] border border-white/[0.08] text-xs font-semibold text-white rounded-xl hover:border-[#6C63FF] transition-colors"
                >
                  Clear Search Filter
                </button>
              </div>
            ) : (
              filteredCategories.map((cat, idx) => {
                const CatIcon = cat.icon;
                return (
                  <section key={cat.id} id={`category-${cat.id}`} className="mb-[44px] flex flex-col">
                    {/* Category Section Label */}
                    <div className="w-full pb-2.5 flex items-center gap-2.5 select-none border-b border-white/[0.04] mb-[18px]">
                      <CatIcon className="text-[#A0A0AA] text-[16px]" />
                      <h2 className="text-[15px] font-semibold tracking-[2px] text-[#A0A0AA] uppercase">
                        {cat.name}
                      </h2>
                    </div>

                    {/* Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[18px]">
                      {cat.tools.map((toolId) => {
                        const tool = TOOLS[toolId];
                        if (!tool) return null;
                        const ToolIcon = tool.icon;
                        const isHighlighted = highlightedToolId === toolId;

                        return (
                          <div
                            key={toolId}
                            ref={(el) => (cardRefs.current[toolId] = el)}
                            onClick={() => handleOpenTool(toolId)}
                            className={`group min-h-[150px] p-[18px] rounded-[18px] bg-[#111317] border ${
                              isHighlighted ? "border-[#6C63FF] bg-[#161920]" : "border-white/[0.05] hover:border-[#6C63FF]/30 hover:bg-[#15171C] hover:-translate-y-[2px]"
                            } cursor-pointer flex flex-col justify-between transition-all duration-[200ms] ease-out relative select-none`}
                          >
                            {/* Top Row: Icon + Arrow */}
                            <div className="flex items-center justify-between w-full">
                              <div className="w-[38px] h-[38px] rounded-[12px] bg-white/[0.03] text-[#A0A0AA] group-hover:text-[#8B7DFF] transition-colors flex items-center justify-center text-[18px]">
                                <ToolIcon />
                              </div>
                              <FiArrowRight className="text-[#858A96] text-[16px] group-hover:text-[#8B7DFF] group-hover:translate-x-1 transition-transform duration-[200ms] ease-out" />
                            </div>

                            {/* Bottom Text Details */}
                            <div className="mt-[14px]">
                              <h3 className="text-[#F5F6F8] font-semibold text-[17px] leading-[22px] tracking-tight truncate">
                                {tool.name}
                              </h3>
                              <p className="text-[13px] text-[#858A96] leading-[18px] line-clamp-2 mt-[3px] font-normal">
                                {tool.desc}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })
            )}

          </div>

        </div>
      )}

      {/* Hidden container for legacy JS grid target */}
      <div id="tools-grid" hidden />
    </div>
  );
}
