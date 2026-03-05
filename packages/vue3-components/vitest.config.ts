import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
    plugins: [vue()],
    test: {
        name: 'vue3-components',
        environment: 'happy-dom',
        globals: true,
        include: [
            'src/tests/**/*.test.ts',
        ],
        setupFiles: ['src/tests/testSetup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/**',
                'dist/**',
                'build/**',
                'old/**',
                '**/tests/',
                '*.config.*',
                '**/index.ts',
                '**/*.d.ts',
                '**/*.css',
                '**/*.scss',
                '**/*.json'
            ],
            reportsDirectory: './coverage'
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    }
});
