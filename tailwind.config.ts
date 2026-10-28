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
        forest: {
          sidebar: "#082F1B",
          deep: "#06351F",
          hover: "#12452C",
          active: "#175235",
          border: "#14482E",
          text: "#D2DFD7",
          muted: "#849E8E",
        },
        lime: {
          accent: "#20E34A",
          hover: "#1BC640",
          soft: "#E9FBEA",
          border: "#C6F5CB",
          text: "#064E24",
        },
        canvas: {
          main: "#FFFFFF",
          bg: "#F0F1F3",
          surface: "#F7F8F8",
          subtle: "#F3F5F4",
        },
        text: {
          primary: "#18251D",
          secondary: "#5E6962",
          muted: "#778079",
        },
        border: {
          subtle: "#E5E9E6",
          strong: "#CBD3CE",
        },
      },
      borderRadius: {
        "2xl": "16px",
        "xl": "12px",
        "lg": "10px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 16px -2px rgba(8, 47, 27, 0.03)",
        elevated: "0 10px 30px -4px rgba(8, 47, 27, 0.08)",
        modal: "0 20px 40px -10px rgba(8, 47, 27, 0.16)",
      },
    },
  },
  plugins: [],
};

export default config;

