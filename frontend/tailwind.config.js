/** @type {import("tailwindcss").Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        nen: {
          bg: "#000000",
          surface: "#1c1c1e",
          surface2: "#2c2c2e",
          surface3: "#3a3a3c",
          border: "#38383a",
          text: "#f5f5f7",
          text2: "#8e8e93",
          text3: "#636366",
          primary: "#0a84ff",
          success: "#30d158",
          danger: "#ff453a",
          warning: "#ffd60a",
          accent: "#5e5ce6",
          info: "#64d2ff",
          orange: "#ff9f0a",
        },
      },
      borderRadius: {
        nen: "12px",
        "nen-lg": "16px",
        "nen-xl": "20px",
        "nen-full": "9999px",
      },
      boxShadow: {
        nen: "0 1px 3px rgba(0,0,0,0.3)",
        "nen-lg": "0 4px 14px rgba(0,0,0,0.4)",
        "nen-glow": "0 0 20px rgba(10,132,255,0.15)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.35s cubic-bezier(0.16,1,0.3,1)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
