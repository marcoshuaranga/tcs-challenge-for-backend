import tseslint from 'typescript-eslint';

export default [
  { ignores: ['**/dist', '**/node_modules', '**/cdk.out', '**/coverage'] },
  ...tseslint.configs.recommended,
];
