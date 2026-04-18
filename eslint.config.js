import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    { ignores: ['dist/**', 'node_modules/**'] },
    eslint.configs.recommended,
    tseslint.configs.recommended,
    {
        rules: {
            'no-eval': 'error',
            'no-implied-eval': 'error',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/explicit-function-return-type': 'off',
        },
    },
);
