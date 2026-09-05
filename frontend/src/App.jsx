import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import Lenis from "lenis";
import { FiHome, FiFileText, FiMessageSquare, FiGlobe, FiTv, FiSmile, FiMenu, FiX } from "react-icons/fi";
import { AnimatePresence, motion } from "framer-motion";

// Import Pages
import Home from "./pages/Home";
import PDFToolkit from "./pages/PDFToolkit";
import Chat from "./pages/Chat";
import Translate from "./pages/Translate";
import StreamFinder from "./pages/StreamFinder";
import Games from "./pages/Games";

// Custom Spotlight Cursor Glow
function SpotlightGlow() {
  const [coords, setCoords] = useState({ x: -200, y: -200 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setCoords({ x: e.clientX, y: e.clientY });
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseLeave = () => setIsVisible(false);

    window.addEventListener("mousemove", handleMouseMove);
    document.body.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.body.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed pointer-events-none w-[500px] h-[500px] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-500 ease-out"
      style={{
        left: `${coords.x}px`,
        top: `${coords.y}px`,
        background: "radial-gradient(circle, rgba(108, 99, 255, 0.12) 0%, transparent 70%)",
        zIndex: -9999,
      }}
    />
  );
}

// Sticky Glass Navbar
function Navbar() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const lastScrollY = useRef(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrolled(currentScrollY > 20);

      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setVisible(false);
      } else {
        setVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const links = [
    { name: "File Transfer", path: "/", icon: <FiHome /> },
    { name: "PDF Toolkit", path: "/pdf", icon: <FiFileText /> },
    { name: "Chat Rooms", path: "/chat", icon: <FiMessageSquare /> },
    { name: "Translate", path: "/translate", icon: <FiGlobe /> },
    { name: "Movies", path: "/streamfinder", icon: <FiTv /> },
    { name: "Games", path: "/games", icon: <FiSmile /> },
  ];

  return (
    <motion.nav
      initial={{ y: 0 }}
      animate={{ y: visible ? 0 : -100 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 px-6 py-4 ${
        scrolled ? "bg-bg/40 backdrop-blur-md border-b border-border" : "bg-transparent"
      }`}
    >
      <div className="max-w-[1320px] mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2 font-grotesk text-2xl font-bold tracking-tight text-white select-none">
          <span className="text-primary text-glow font-extrabold">Ξ</span> DEBO
        </Link>

        {/* Navigation Menu (Desktop) */}
        <div className="hidden md:flex items-center gap-1 bg-secondary/80 backdrop-blur border border-border p-1.5 rounded-full shadow-lg">
          {links.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`relative px-4 py-2 text-sm font-medium tracking-tight rounded-full transition-colors ${
                  isActive ? "text-white" : "text-textSec hover:text-white"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-primary/20 border border-primary/30 rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                {link.name}
              </Link>
            );
          })}
        </div>

        {/* Action CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link to="/" className="px-5 py-2.5 text-sm font-medium bg-gradient-accent hover:opacity-90 active:scale-95 shadow-[0_4px_20px_rgba(108,99,255,0.35)] rounded-full text-white transition-all">
            Get Started
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-2 text-textSec hover:text-white glass-panel flex items-center justify-center rounded-lg"
        >
          {isOpen ? <FiX size={20} /> : <FiMenu size={20} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden mt-4 overflow-hidden rounded-2xl glass-panel p-4 flex flex-col gap-2"
          >
            {links.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive ? "bg-primary text-white" : "text-textSec hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {link.icon}
                  <span className="font-medium text-sm">{link.name}</span>
                </Link>
              );
            })}
            <Link
              to="/"
              onClick={() => setIsOpen(false)}
              className="mt-2 w-full py-3 text-center bg-gradient-accent rounded-xl text-white font-medium text-sm block"
            >
              Get Started
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

// Mobile Bottom Navigation Bar
function MobileBottomNav() {
  const location = useLocation();
  const links = [
    { name: "Home", path: "/", icon: <FiHome size={18} /> },
    { name: "PDF", path: "/pdf", icon: <FiFileText size={18} /> },
    { name: "Chat", path: "/chat", icon: <FiMessageSquare size={18} /> },
    { name: "Translate", path: "/translate", icon: <FiGlobe size={18} /> },
    { name: "Movies", path: "/streamfinder", icon: <FiTv size={18} /> },
    { name: "Games", path: "/games", icon: <FiSmile size={18} /> },
  ];

  return (
    <div className="md:hidden fixed bottom-6 left-6 right-6 z-50">
      <div className="glass-panel py-3 px-5 flex items-center justify-around rounded-full shadow-2xl">
        {links.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`flex flex-col items-center gap-1 ${
                isActive ? "text-primary text-glow scale-110" : "text-textSec hover:text-white"
              } transition-all duration-300`}
            >
              {link.icon}
              <span className="text-[10px] font-medium tracking-tight">{link.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// Global Footer
function Footer() {
  return (
    <footer className="w-full bg-secondary border-t border-border mt-[140px] px-6 py-16 text-textSec relative z-10">
      <div className="max-w-[1320px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
        <div className="flex flex-col gap-4">
          <Link to="/" className="font-grotesk text-2xl font-bold tracking-tight text-white select-none">
            <span className="text-primary font-extrabold">Ξ</span> DEBO
          </Link>
          <p className="text-sm leading-relaxed max-w-[280px]">
            The modern way to share files, edit PDFs, translate speech, chat securely, and play games locally. No sign-up required.
          </p>
        </div>
        <div>
          <h4 className="text-white font-semibold text-sm mb-4">Workspace</h4>
          <ul className="flex flex-col gap-2.5 text-sm">
            <li><Link to="/" className="hover:text-white transition-colors">File Transfer</Link></li>
            <li><Link to="/pdf" className="hover:text-white transition-colors">PDF Toolkit</Link></li>
            <li><Link to="/chat" className="hover:text-white transition-colors">Real-time Chat</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold text-sm mb-4">Utilities</h4>
          <ul className="flex flex-col gap-2.5 text-sm">
            <li><Link to="/translate" className="hover:text-white transition-colors">Translate Suite</Link></li>
            <li><Link to="/streamfinder" className="hover:text-white transition-colors">Movies directory</Link></li>
            <li><Link to="/games" className="hover:text-white transition-colors">Multiplayer Arena</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold text-sm mb-4">Security</h4>
          <p className="text-sm leading-relaxed">
            DEBO relies on local browser sandboxing and ephemeral P2P links. All processes occur directly in-browser. Your security is our product.
          </p>
        </div>
      </div>
      <div className="max-w-[1320px] mx-auto pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        <span>© 2026 DEBO Workspace. Built with Vercel, Apple, and Linear aesthetics.</span>
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-white transition-colors">Security Details</a>
        </div>
      </div>
    </footer>
  );
}

// Dynamic Main Container Outlet based on active route
function MainContentOutlet() {
  const location = useLocation();
  const isWide = location.pathname === "/pdf" || location.pathname === "/translate" || location.pathname === "/streamfinder" || location.pathname === "/chat";

  return (
    <main className={isWide ? "w-full max-w-[1750px] mx-auto px-2 md:px-4 pl-0 md:pl-0 mt-3 md:mt-4" : "max-w-[1320px] mx-auto px-6 mt-16 md:mt-24"}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/receive" element={<Home />} />
        <Route path="/pdf" element={<PDFToolkit />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/translate" element={<Translate />} />
        <Route path="/streamfinder" element={<StreamFinder />} />
        <Route path="/games" element={<Games />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </main>
  );
}

// App component wrapping all routes and settings
export default function App() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <Router>
      <div className="relative min-h-screen bg-bg selection:bg-primary/20 select-text">
        <SpotlightGlow />
        
        {/* Navigation */}
        <Navbar />

        {/* Global animated background blobs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -9999 }}>
          <div 
            className="absolute top-1/4 left-1/4 w-[35rem] h-[35rem] rounded-full animate-pulse-slow" 
            style={{ background: "radial-gradient(circle, rgba(108, 99, 255, 0.05) 0%, transparent 70%)" }}
          />
          <div 
            className="absolute top-2/3 right-1/4 w-[40rem] h-[40rem] rounded-full animate-pulse-slow" 
            style={{ background: "radial-gradient(circle, rgba(139, 92, 246, 0.05) 0%, transparent 70%)" }}
          />
        </div>

        {/* Warning Banner */}
        <div className="w-full bg-yellow-500/10 border-b border-yellow-500/20 text-center py-2 px-4 text-xs text-yellow-500/90 font-medium tracking-tight mt-[70px]">
          ⚠ For a premium private experience, use this workspace in Incognito Mode. Chat history and active sessions are stored locally.
        </div>

        {/* Routing Outlet */}
        <MainContentOutlet />

        <Footer />
        <MobileBottomNav />
      </div>
    </Router>
  );
}
