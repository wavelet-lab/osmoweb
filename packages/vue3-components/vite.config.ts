import path from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import pkg from './package.json'

export default defineConfig({
    plugins: [
        vue()
    ],
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/index.ts'),
            name: 'OsmoWebVue3Components',
            fileName: (format) => `index.${format}.js`,
            formats: ['es', 'cjs']
        },
        rollupOptions: {
            external: (id) => {
                if (!id || typeof id !== 'string') return false
                if (id === 'vue') return true
                if (id.startsWith('@websdr/')) return true
                return false
            },
            output: {
                globals: {
                    vue: 'Vue'
                },
            }
        },
        // disable inlining of large binaries
        assetsInlineLimit: 0
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    }
})
