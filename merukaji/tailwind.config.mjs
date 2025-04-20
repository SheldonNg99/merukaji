const tailwindConfig = {
    darkMode: 'class',
    content: [
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}'
    ],
    theme: {
        extend: {
            colors: {
                // Your custom colors here
            }
        },
    },
    plugins: [],
};

export default tailwindConfig;