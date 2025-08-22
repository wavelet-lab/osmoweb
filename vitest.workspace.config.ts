import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
    './packages/core',
    './packages/backend-core',
    './packages/nestjs-microservice',
    './packages/frontend-core',
    './packages/vue3-components',
]);
