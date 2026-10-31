import eslint from '@eslint/js';
import globals from 'globals';
import tslint from 'typescript-eslint';

export default tslint.config(
    {
        ignores: ['dist/**', 'node_modules/**'],
    },
    eslint.configs.recommended,
    ...tslint.configs.recommended,
    {
        files: ['src/**/*.ts'],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.jquery,
                toastr: 'readonly',
            },
        },
        rules: {
            '@typescript-eslint/ban-ts-comment': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': ['error', {
                argsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_',
            }],
        },
    },
    {
        files: ['src/**/*.d.ts'],
        rules: {
            'no-var': 'off',
        },
    },
);
