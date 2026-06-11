# ⚡ Scintilla

Ask a question, get a short structured answer, and save it straight to Anki.

Scintilla is a small AI-powered search box. You type (or dictate) a prompt, Gemini answers in clean Markdown, and you copy the result either as plain text or as an Anki-ready flashcard.

**Live:** http://scintilla.cocchy.casa/

## What it does

- **AI search** — answers powered by Google Gemini, formatted as titles, lists and bold/italic.
- **Voice input** — dictate your question (language configurable in settings).
- **Copy to Anki** — the copy button outputs a `title⇥answer` note you can import as a Basic card. Or switch to plain text.
- **Settings** — speech language, Anki card front (answer title or your question), copy format, and dark/light theme. Everything is saved in your browser.
- **Keyboard shortcuts** — `Space` to focus the search bar, `Enter` to search, `Ctrl+M` for the mic.

## Run it locally

Requires Node.js and a [Gemini API key](https://aistudio.google.com/apikey).

```bash
npm install
```

Create a `.env` file:

```bash
GEMINI_API_KEY=your_key_here
# optional
AI_MODEL=gemini-2.5-flash-lite
WEB_UI_PORT=4005
RATE_LIMIT_MAX_REQUESTS=40
```

Then start it:

```bash
npm run dev
```

Open http://localhost:4005.

For production: `npm run build` then `npm start`.

## Importing into Anki

1. Copy a result (default format is the Anki note).
2. Paste it into a `.txt` file and save.
3. In Anki: **File → Import**, set the separator to **Tab**, enable **Allow HTML in fields**, and map the columns to Front / Back.

## Stack

[Moleculer](https://moleculer.services/) services (API gateway + AI service) with a vanilla JS + [BeerCSS](https://www.beercss.com/) frontend.
