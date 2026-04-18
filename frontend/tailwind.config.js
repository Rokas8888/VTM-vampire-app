/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        blood: {
          dark: "#8B0000",
          DEFAULT: "#DC143C",
          light: "#FF2952",
        },
        void: {
          DEFAULT: "#0a0a0a",
          light: "#141414",
          mid: "#1e1e1e",
          border: "#2a2a2a",
        },
      },
      fontFamily: {
        gothic: ["Cinzel", "serif"],
        body: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
}
