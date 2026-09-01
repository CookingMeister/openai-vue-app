# Vue AI App

A self-hosted chat client for the OpenAI [Responses API](https://platform.openai.com/docs/api-reference/responses): streaming conversations, web search, image generation, and retrieval over your own documents — with the document index and chat history kept in your browser, and your API key kept on your own server.

Vue 3 single-page app in front, small Express proxy behind. The browser never talks to OpenAI directly and never sees the key.

## Features

### Chat

- Streaming responses rendered incrementally as markdown, with syntax-highlighted code blocks (Prism grammars fetched on demand) and a copy button per block
- 18-model registry — o3 through the GPT-5 family — with per-model reasoning effort remembered across sessions
- Web search, run as a server-declared tool when you switch it on
- Per-response stats: token counts, cached and reasoning tokens, elapsed time, tokens/sec
- A live context estimate for the next request, broken down by history, draft, documents and RAG
- Regenerate, edit-and-resend, copy, and delete on any exchange

### Documents and retrieval

- Attach a file as plain context: `.txt`, `.md`, `.log`, `.htm(l)`, `.pdf`, `.docx`, and common source-code extensions
- Or embed files into a browser-side vector store and let the model search them. Embeddings use `text-embedding-3-small`; the index lives in IndexedDB and is never uploaded
- The model can call a `search_documents` tool mid-answer. The tool is *declared* on the server but *executed* in the browser, because that is where the index is — the call is streamed back, the client runs the search and returns the result on a follow-up request
- Answers cite the chunks they used, with source file and similarity score

### Images

- Generate with `gpt-image-1` by switching the composer to image mode and describing what you want
- Size and quality are picked in Image Settings, from the sidebar: square, landscape or portrait, and low / medium / high / auto quality. The choice is saved per browser, and the server validates it against the same lists before forwarding
- Images render at a readable size in the transcript; click one to open the full-resolution version in a new tab
- Refine any image you've generated: the button on it aims the composer at that image, and your next prompt becomes the edit instruction. The pill clears when you dismiss it or when the edit completes
- Refinements go through `/v1/images/edits`, which re-renders the whole frame from your instruction rather than patching a region, so successive passes drift from the original. Captions and download names keep the original subject alongside each instruction
- Images are stored as bytes in IndexedDB, in a separate object store so conversation records stay small

### Conversations

- Saved to IndexedDB and listed in the sidebar; titles are generated automatically from the first exchange
- Rename, delete, and switch between them without a round trip

## Requirements

- Node.js `^20.19.0 || >=22.12.0` (Vite 8's requirement; the server alone runs on 18+)
- An OpenAI API key

## Setup

```bash
git clone <this repo>
cd vue-ai-app2

npm install                          # root: concurrently, for the combined dev script
npm install --prefix server          # express, axios, multer, cors, dotenv
npm install --prefix openai-vue-app  # vue, vite, bootstrap, marked, prismjs
```

Create `server/.env`:

```ini
OPENAI_API_KEY=sk-...
PORT=3000
```

Then start both processes:

```bash
npm start
```

The API listens on `http://localhost:3000` and the app on `http://localhost:5173`, which is the one to open. Vite proxies `/api` through to the server, so there is no CORS hop in development.

## Scripts

| Where | Command | Does |
| --- | --- | --- |
| root | `npm start` | Runs the server and the Vite dev server together |
| `server/` | `npm start` | API only, on `PORT` (default 3000) |
| `openai-vue-app/` | `npm run dev` | App only, on 5173 |
| `openai-vue-app/` | `npm run build` | Production bundle into `dist/` |
| `openai-vue-app/` | `npm run preview` | Serves the built bundle |

## Layout

```text
openai-vue-app/          Vue 3 + Vite front end
  src/
    App.vue              Chat shell: message list, composer, sidebar, header
    main.js              Entry: vendor CSS, Bootstrap runtime, mount
    assets/main.css      Theme tokens, base styles, scrollbars
    components/          BaseModal, ConfirmModal, SurfacePopover
    composables/         Chat stream, conversations, models, RAG, tokens, toasts, confirm
    directives/          v-bs-tooltip
    utils/               IndexedDB, markdown, Prism, documents, images

server/                  Express proxy (MVC)
  routes/                Endpoint definitions
  controllers/           Request/response handling
  services/              OpenAI calls and streaming
  config/                Model registry, system prompt, context instructions
  utils/                 History sanitizing, token counting
```

The front end resolves `@` to `src/`, configured in `vite.config.js` and mirrored in `jsconfig.json` for the editor.

## API

Every route is proxied; none of them accept a model id the registry doesn't know.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/chat` | Streams a response (SSE passthrough), including tool calls |
| `GET` | `/api/models` | The model registry and defaults, cached 5 minutes |
| `POST` | `/api/title` | Generates a conversation title from the first exchange |
| `POST` | `/api/embeddings` | Batch-embeds text chunks |
| `POST` | `/api/image/generate-image` | Generates an image |
| `POST` | `/api/image/edit-image` | Refines one from a text instruction (multipart, in-memory, 25 MB cap) |

## Configuration

Most of what you'd want to change lives in `server/config/`:

- **`models.js`** — the registry. Each entry sets its output-token field, default cap, context window, and which reasoning efforts it accepts. `DEFAULT_MODEL_KEY` picks the startup model; `TITLE_MODEL` names the cheap model used for titles.
- **`systemPrompt.js`** — the standing system prompt.
- **`contextInstructions.js`** — how the model is told to treat attached documents and retrieved passages.

RAG defaults (chunk size, overlap, top-k, similarity floor, token budget) are in `composables/useRag.js` and adjustable per session from the RAG settings dialog. Overrides persist in `localStorage`; bumping `RAG_PRESET_VERSION` discards stale ones.

## Data and privacy

Conversations, generated images and document embeddings all live in your browser's IndexedDB (`PLBChatDB` and `embeddingsDB`) — there is no database on the server and no user accounts. The server holds the API key, forwards requests, and stores nothing.

What does leave the machine: your messages, the text of any document you attach or embed, and image prompts — all to OpenAI, as the API requires. Clearing site data deletes the local history irreversibly.

## Notes and limits

- **No authentication.** Anyone who reaches the server can spend your API credits, so keep it on localhost or put a proxy in front of it before exposing it.
- The edit endpoint accepts an optional mask, which would confine changes to one region. The app never sends one, so the plumbing is there but unused; region editing would need a brush UI producing a same-size PNG with alpha.
- pdf.js, mammoth and Prism grammars load from a CDN on first use, pinned by version with SRI hashes, rather than being bundled — the app needs network access for those features the first time.
- There is no test suite; changes are verified by building and exercising the app.

## License

MIT © Shawn Meister — see [LICENSE](LICENSE).
