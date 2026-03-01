/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class', // enable dark mode by default
    theme: {
        extend: {
            colors: {
                'glass': 'rgba(255, 255, 255, 0.1)',
                'glass-dark': 'rgba(0, 0, 0, 0.3)',
            }
        },
    },
    plugins: [],
}
