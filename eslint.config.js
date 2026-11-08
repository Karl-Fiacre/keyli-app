import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'video'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  // Logique partagée avec l'application mobile (docs/LOGIQUE_PARTAGEE.md) :
  // aucun accès au navigateur ni au code propre au web. Les services de
  // l'appareil passent par `@/plateforme`, le client Supabase par
  // `@/integrations/supabase/client` (fournis par chaque application).
  {
    files: ['src/partage/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-globals': [
        'error',
        ...['window', 'document', 'localStorage', 'sessionStorage', 'navigator', 'location', 'history', 'crypto',
          'matchMedia', 'IntersectionObserver', 'alert', 'confirm', 'google'].map((name) => ({
          name,
          message: 'Interdit dans src/partage : passer par @/plateforme (code commun au web et au mobile).',
        })),
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: ['react-dom', 'react-router-dom', 'lucide-react', 'motion'].map((name) => ({
            name,
            message: 'Bibliothèque propre au web : interdite dans src/partage.',
          })),
          patterns: [
            {
              group: ['@/components/*', '@/pages/*', '@/hooks/*', '@/lib/*', '@/styles/*', '@/App', 'motion/*', 'react-dom/*'],
              message: 'Code propre au web : interdit dans src/partage (le web dépend du partagé, jamais l’inverse).',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "MetaProperty[meta.name='import']",
          message: 'import.meta est propre à Vite : la configuration vient de chaque application.',
        },
      ],
    },
  },
)
