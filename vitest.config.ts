import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
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
        workspace: './vitest.workspace.config.ts',
    }
});