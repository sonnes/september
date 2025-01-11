import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./layouts/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  safelist: [
    {
      pattern:
        /(bg|text|border|hover:bg|ring-offset)-(indigo|blue|green|yellow|purple|pink|red|amber|lime|emerald|teal|cyan|sky|violet|fuchsia|rose)-(200|300|400|500|600|700)/,
    },
  ],
  plugins: [],
} satisfies Config;
