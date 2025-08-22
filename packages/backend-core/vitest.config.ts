import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        name: 'nestjs-microservice',
        globals: true,
        environment: 'node',
        include: ['src/tests/**/*.test.ts'],
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
                '**/*.d.ts'
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
