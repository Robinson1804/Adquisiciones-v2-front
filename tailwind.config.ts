import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#03224d",
        "primary-container": "#1f3864",
        surface: "#f8f9ff",
        "surface-content": "#f8fafc",
        "on-surface": "#0b1c30",
        outline: "#e2e8f0",
        error: "#ba1a1a",
        "table-header": "#f1f5f9",
      },
      fontFamily: {
        // Resolves to --font-sans CSS variable (local Geist in offline builds,
        // Inter via system install when available), with system-ui fallback.
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        sm: "0.25rem",
        md: "0.75rem",
        lg: "1rem",
      },
      spacing: {
        sidebar: "260px",
      },
      maxWidth: {
        container: "1440px",
      },
      boxShadow: {
        card: "0px 1px 3px rgba(0,0,0,0.1),0px 1px 2px rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
