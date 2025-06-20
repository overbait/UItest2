"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vite_1 = require("vite");
const plugin_react_1 = __importDefault(require("@vitejs/plugin-react"));
const path_1 = __importDefault(require("path"));
// https://vitejs.dev/config/
exports.default = (0, vite_1.defineConfig)({
    base: './', // Ensure correct asset loading for Electron
    plugins: [(0, plugin_react_1.default)()],
    resolve: {
        alias: {
            '@': path_1.default.resolve(__dirname, './src'),
            '@components': path_1.default.resolve(__dirname, './src/components'),
            '@assets': path_1.default.resolve(__dirname, './src/assets'),
            '@hooks': path_1.default.resolve(__dirname, './src/hooks'),
            '@store': path_1.default.resolve(__dirname, './src/store'),
            '@types': path_1.default.resolve(__dirname, './src/types'),
            '@utils': path_1.default.resolve(__dirname, './src/utils'),
        },
    },
    server: {
        port: 3000,
        open: true,
        cors: true,
        proxy: {
            // Proxy API requests to aoe2cm.net
            '/api': {
                target: 'https://aoe2cm.net',
                changeOrigin: true,
                secure: false,
            },
        },
    },
    build: {
        outDir: 'dist', // Ensure output is in the 'dist' folder
        rollupOptions: {
            // Externalize Electron-specific modules if any are imported in renderer code
            external: ['electron'],
        },
    },
    // Exclude the electron directory from being processed by Vite
});
//# sourceMappingURL=vite.config.js.map