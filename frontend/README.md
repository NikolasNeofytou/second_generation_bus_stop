# Frontend

This frontend uses **next-i18next** for internationalization.

## Translation workflow

### Editing translations
1. Translation files live under `public/locales/<locale>/common.json`.
2. Update the relevant JSON files for each locale (e.g., `en`, `el`).
3. Use the `t` function from `next-i18next` inside pages and components.
4. Pages that require translations should export `getStaticProps` and call `serverSideTranslations`.

### Adding a new language
1. Add the locale code to `locales` in `next-i18next.config.js`.
2. Create `public/locales/<locale>/common.json` with the necessary keys.
3. If needed, update UI elements like the language switcher.

### Development
```bash
npm install
npm run dev
```
