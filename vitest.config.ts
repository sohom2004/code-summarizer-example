import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/__tests__/**/*.ts', '**/*.{test,spec}.ts'],
    globals: true,
    coverage: {
      include: ['index.ts'],
    },
    setupFiles: ['./vitest.setup.ts'],
  },
});