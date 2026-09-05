/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#08090F",
        secondary: "#0E1117",
        card: "#111827",
        border: "rgba(255,255,255,0.08)",
        primary: "#6C63FF",
        secondaryPurple: "#8B5CF6",
        accentBlue: "#3B82F6",
        accentGreen: "#10B981",
        textMain: "#FFFFFF",
        textSec: "#B7C0D0",
        muted: "#6B7280",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        grotesk: ["Space Grotesk", "sans-serif"],
        manrope: ["Manrope", "sans-serif"],
      },
      backgroundImage: {
        "gradient-accent": "linear-gradient(135deg, #6C63FF, #8B5CF6, #3B82F6)",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
}
