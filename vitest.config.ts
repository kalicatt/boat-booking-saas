import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    setupFiles: ['tests/setupTests.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
      'next-auth/lib/env': path.resolve(__dirname, 'tests/mocks/next-auth-env.ts'),
      'next-auth/lib/env.js': path.resolve(__dirname, 'tests/mocks/next-auth-env.ts'),
      '@react-email/render': path.resolve(__dirname, 'tests/mocks/react-email-render.ts'),
      'next/server': path.resolve(__dirname, 'tests/mocks/next-server.ts'),
      'next/server.js': path.resolve(__dirname, 'tests/mocks/next-server.ts'),
    },
  },
});
