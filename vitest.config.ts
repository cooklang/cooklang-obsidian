import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';

export default defineConfig({
    plugins: [svelte(), svelteTesting({ autoCleanup: false })],
    resolve: {
        // The published Obsidian package contains type declarations only, so
        // provide its tiny runtime surface when unit tests import plugin code.
        alias: {
            obsidian: fileURLToPath(new URL('./src/test/obsidianMock.ts', import.meta.url)),
        },
    },
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
    },
});
