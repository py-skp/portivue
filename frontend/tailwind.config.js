module.exports = {
    darkMode: ["class"],
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./features/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                border: "rgb(var(--border) / <alpha-value>)",
                background: "rgb(var(--background) / <alpha-value>)",
                foreground: "rgb(var(--foreground) / <alpha-value>)",
                primary: {
                    DEFAULT: "rgb(var(--primary) / <alpha-value>)",
                    foreground: "rgb(var(--primary-foreground) / <alpha-value>)",
                },
                surface: {
                    DEFAULT: "rgb(var(--surface) / <alpha-value>)",
                    hover: "rgb(var(--surface-hover) / <alpha-value>)",
                },
                brand: {
                    50: "rgb(var(--brand-50) / <alpha-value>)",
                    100: "rgb(var(--brand-100) / <alpha-value>)",
                    200: "rgb(var(--brand-200) / <alpha-value>)",
                    300: "rgb(var(--brand-300) / <alpha-value>)",
                    400: "rgb(var(--brand-400) / <alpha-value>)",
                    500: "rgb(var(--brand-500) / <alpha-value>)",
                    600: "rgb(var(--brand-600) / <alpha-value>)",
                    700: "rgb(var(--brand-700) / <alpha-value>)",
                    800: "rgb(var(--brand-800) / <alpha-value>)",
                    900: "rgb(var(--brand-900) / <alpha-value>)",
                    950: "rgb(var(--brand-950) / <alpha-value>)",
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
        },
    },
    plugins: [
        require('@tailwindcss/forms'),
        require('@tailwindcss/typography'),
        require('@tailwindcss/aspect-ratio'),
    ],
}

