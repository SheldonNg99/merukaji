import tailwindConfig from './tailwind.config.mjs';

const config = {
  plugins: {
    "@tailwindcss/postcss": {
      config: tailwindConfig,
    },
  },
};

export default config;