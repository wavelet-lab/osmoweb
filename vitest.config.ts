import { defineConfig, defineProject } from 'vitest/config';

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
                '**/*.d.ts',
                '**/*.css',
                '**/*.scss',
                '**/*.json'
            ],
            reportsDirectory: './coverage'
        },
        projects: [
            // workspace projects
            'packages/core/vitest.config.ts',
            'packages/backend-core/vitest.config.ts',
            'packages/nestjs-microservice/vitest.config.ts',
            'packages/frontend-core/vitest.config.ts',
            'packages/vue3-components/vitest.config.ts',
        ]
    }
});