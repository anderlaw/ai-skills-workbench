/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border) / <alpha-value>)",
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        muted: "hsl(var(--muted) / <alpha-value>)",
        "muted-foreground": "hsl(var(--muted-foreground) / <alpha-value>)",
        primary: "hsl(var(--primary) / <alpha-value>)",
        "primary-foreground": "hsl(var(--primary-foreground) / <alpha-value>)",
        surface: "hsl(var(--surface) / <alpha-value>)",
        "surface-muted": "hsl(var(--surface-muted) / <alpha-value>)",
        "surface-soft": "hsl(var(--surface-soft) / <alpha-value>)",
        line: "hsl(var(--line) / <alpha-value>)",
        "line-subtle": "hsl(var(--line-subtle) / <alpha-value>)",
        content: "hsl(var(--content) / <alpha-value>)",
        "content-strong": "hsl(var(--content-strong) / <alpha-value>)",
        "content-muted": "hsl(var(--content-muted) / <alpha-value>)",
        brand: "hsl(var(--brand) / <alpha-value>)",
        "brand-strong": "hsl(var(--brand-strong) / <alpha-value>)",
        "brand-muted": "hsl(var(--brand-muted) / <alpha-value>)",
        "on-brand": "hsl(var(--on-brand) / <alpha-value>)",
        accent: "hsl(var(--accent) / <alpha-value>)",
        "accent-strong": "hsl(var(--accent-strong) / <alpha-value>)",
        "accent-muted": "hsl(var(--accent-muted) / <alpha-value>)",
        danger: "hsl(var(--danger) / <alpha-value>)",
        "danger-muted": "hsl(var(--danger-muted) / <alpha-value>)",
        "danger-line": "hsl(var(--danger-line) / <alpha-value>)",
        info: "hsl(var(--info) / <alpha-value>)",
        "info-muted": "hsl(var(--info-muted) / <alpha-value>)",
        "info-line": "hsl(var(--info-line) / <alpha-value>)"
      }
    }
  },
  plugins: []
};
