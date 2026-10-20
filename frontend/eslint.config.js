import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    files: ['src/**/*.{js,jsx}'],
    rules: {
      'no-restricted-syntax': ['error',
        { selector: 'JSXText[value=/[✓✕✖✗○●→←↑↓▶▼▲◀×✚✎✏⚠✅❌]/]', message: 'Usare le icone Lucide dal catalogo config/icone.js, non glifi testuali.' },
        { selector: 'Literal[value=/^[✓✕✖✗○●→←↑↓▶▼▲◀×✚✎✏⚠✅❌]$/]', message: 'Le icone appartengono al catalogo config/icone.js.' },
      ],
    },
  },
  {
    files: ['src/**/*.{js,jsx}'],
    ignores: ['src/config/icone.js'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{
        group: ['lucide-react', 'lucide-react/**', 'react-icons', 'react-icons/**', '@heroicons/**', '@fortawesome/**', '@phosphor-icons/**', '@tabler/icons*', 'react-feather', 'feather-icons', '@mui/icons-material', '@mui/icons-material/**', '@ant-design/icons'],
        message: 'Unico set consentito: Lucide. Importare da config/icone.js e aggiungere lì eventuali nuove icone.',
      }] }],
    },
  },
  {
    files: ['src/components/**/*.{js,jsx}', 'src/hooks/**/*.{js,jsx}'],
    rules: {
      'no-restricted-syntax': ['error',
        { selector: 'Literal[value=/(duration|delay)-[0-9]|cubic-bezier\\(/]', message: 'Durate e curve appartengono ai token movimento e alle ricette condivise.' },
        { selector: 'TemplateElement[value.cooked=/(duration|delay)-[0-9]|cubic-bezier\\(/]', message: 'Durate e curve appartengono ai token movimento e alle ricette condivise.' },
        { selector: 'JSXText[value=/[✓✕✖✗○●→←↑↓▶▼▲◀×✚✎✏⚠✅❌]/]', message: 'Usare le icone Lucide dal catalogo config/icone.js, non glifi testuali.' },
        { selector: 'Literal[value=/^[✓✕✖✗○●→←↑↓▶▼▲◀×✚✎✏⚠✅❌]$/]', message: 'Le icone appartengono al catalogo config/icone.js.' },
      ],
    },
  },
])
