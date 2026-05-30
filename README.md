# SwiftShare

A full-stack web application that combines file sharing, PDF tooling, real-time chat, language translation, media discovery, and multiplayer games into a single, zero-signup platform. Built with Node.js, Express, and Socket.IO on the backend, with a vanilla HTML/CSS/JS frontend -- no framework overhead, no build step.

**Live:** [https://swiftshare-rwio.onrender.com](https://swiftshare-rwio.onrender.com)

---

## Table of Contents

- [What This Does](#what-this-does)
- [Architecture Overview](#architecture-overview)
- [Feature Breakdown](#feature-breakdown)
  - [File Transfer](#file-transfer)
  - [PDF Toolkit](#pdf-toolkit)
  - [Document Scanner](#document-scanner)
  - [Real-Time Chat](#real-time-chat)
  - [Translation Engine](#translation-engine)
  - [StreamFinder](#streamfinder)
  - [Multiplayer Scribble Game](#multiplayer-scribble-game)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Security Considerations](#security-considerations)
- [License](#license)

---

## What This Does

SwiftShare is a utility-first web app designed for fast, ephemeral workflows. The core idea is simple: every tool a user might need during a quick collaboration session should be available in one tab, with no login, no installation, and no data retained beyond what is immediately necessary.

A user can upload files and get a 6-digit code or shareable link. Another user enters that code on any device and downloads immediately. In between, they can merge PDFs, scan documents with their phone camera, chat in real-time, translate text across 100+ languages, or play a drawing game with friends. Everything happens in the browser or through lightweight server-side processing -- nothing persists unless explicitly requested.

---

## Architecture Overview

```
Client (Browser)                       Server (Node.js)
-----------------                      -----------------
index.html    ---- HTTP/REST ------>   Express (server.js)
chat.html     ---- WebSocket ------>   Socket.IO (src/socket/index.js)
games.html    ---- WebSocket ------>       |
pdf.html      ---- Client-side ---->   Routes:
translate.html ---- REST ---------->     /api/upload, /api/download
streamfinder.html -- Client-side -->     /api/translate
                                         /api/chat/upload
                                       Storage:
                                         In-memory Maps (transfers, rooms, users)
                                         Disk (uploads/, chat-uploads/)
```

The server is intentionally stateless in the database sense. All transfer metadata, chat rooms, user sessions, and game state live in-memory Maps. Files land on disk temporarily and are cleaned up by a background interval every 60 seconds once their expiry window closes. This keeps the deployment footprint small enough to run on a free Render instance without any external database.

---

## Feature Breakdown

### File Transfer

The primary feature. Users upload one or more files through a drag-and-drop interface. The server stores them under a UUID-named directory and generates two access keys:

- **6-digit numeric code** -- expires after 10 minutes. Intended for quick, in-person sharing (read the code aloud, text it, etc.).
- **Hex link ID** -- expires after 48 hours. Generates a shareable URL and a QR code for cross-device transfers.

When a receiver enters the code or visits the link, the server returns file metadata. On download, single files are served directly; multiple files are zipped on the fly using `archiver`.

There is also a WebSocket-based peer-to-peer signaling layer. If both sender and receiver are on the page simultaneously, they can negotiate a direct P2P transfer through the browser's WebRTC stack, bypassing the server entirely for the actual data transfer.

**Max file size:** 5 GB per upload. Up to 100 files per transfer.

### PDF Toolkit

29 browser-side PDF tools running entirely on the client. No files are sent to the server. The toolkit uses:

- **pdf-lib** for PDF creation, merging, splitting, page manipulation, and metadata editing
- **PDF.js** for rendering and text extraction
- **Tesseract.js** for OCR (optical character recognition)
- **Mammoth.js** for DOCX-to-text conversion
- **JSZip** for batch export

Tools include merge, split, compress, rotate, reorder pages, add/remove password protection, watermarking, page numbering, PDF-to-image conversion, image-to-PDF, text extraction, and document signing. All processing happens in the browser tab -- the server never sees the file contents.

### Document Scanner

A dedicated document scanner that uses the device camera or uploaded images to create multi-page PDFs. Features include:

- Live camera capture with a shutter button
- Image editing: crop, rotate, perspective correction, brightness/contrast adjustment, sharpening
- Filter presets: original, black-and-white, enhanced color, grayscale, high-contrast scan mode
- Page management: drag-and-drop reorder, duplicate, delete
- PDF generation with configurable page size (A4, Letter, Legal, fit-to-image), orientation, margins, image quality, page numbers, watermarks, password protection, OCR text layer, and digital signatures
- Live preview before export

### Real-Time Chat

A full-featured messaging system built on Socket.IO. No account creation required -- users pick a display name and avatar, and the server assigns them a unique connection code.

How connections work:
1. User A opens the chat, gets code `XK7T9P`.
2. User B enters that code. A private chat room is created between them.
3. Messages flow through the server in real-time via WebSocket.

Message features:
- Text messages (up to 5,000 characters)
- File sharing (up to 25 MB per file, stored server-side)
- Voice message recording
- Reply-to-message threading
- Message reactions (emoji)
- Edit and delete (for sender / for everyone)
- Read receipts and delivery status indicators
- Typing indicators
- In-chat message search
- Emoji picker
- Message forwarding between rooms
- Dark/light mode toggle
- QR code generation for sharing connection codes

**Random Chat Lobby:** Users can go "online" in a public lobby, where other users can see available strangers and initiate anonymous conversations. Identities are masked with random tags like "Stranger #A4K7".

### Translation Engine

Server-side translation with a dual-provider fallback:

1. **Google Translate** (free `translate.googleapis.com` endpoint) -- tried first
2. **MyMemory API** -- used as a fallback if Google is unavailable or returns an error

The client supports three input modes:
- **Text translation** with auto-detect, 100+ target languages, character count, and copy-to-clipboard
- **File translation** -- upload a PDF, image (via Tesseract.js OCR), DOCX (via Mammoth.js), or TXT file. The client extracts text locally, sends it to the server for translation, and displays a side-by-side original/translated view. Results can be downloaded as PDF or TXT.
- **Batch translation** -- translate up to 10 files at once

Additional features: translation history (stored in localStorage), recent language pairs, editable output, and downloadable results.

### StreamFinder

A curated directory of 25 free streaming websites for movies and web series. This is a purely client-side feature -- no server interaction. The page renders a searchable, filterable card grid with:

- Search by site name
- Favorites (persisted in localStorage)
- Filter tabs (All / Favorites)
- Responsive card layout with site descriptions and direct links

The app does not host, proxy, or embed any streaming content. It is strictly a link directory.

### Multiplayer Scribble Game

A real-time drawing and guessing game for 2-8 players, powered by Socket.IO. One player draws a word on an HTML canvas; the others try to guess it in a chat sidebar.

Game flow:
1. Host creates a room, shares the 5-character room code (or a link/QR code).
2. Players join the lobby. The host configures rounds (1-10), draw time (30-180 seconds), and hint count (0-3).
3. Game starts. Each round, one player is selected to draw. They pick from 3 random words.
4. Other players type guesses. Correct guesses award points based on speed and guess order. The drawer earns a percentage of the guesser's points.
5. Hints are revealed at configurable intervals (letters from the word gradually appear).
6. "Close guess" detection alerts the guesser when they are within 2 characters of the answer.
7. After all rounds, a final scoreboard is displayed.

Drawing tools: pen, eraser, fill bucket, color picker with presets, brush size slider, undo, and clear canvas. Drawing data is streamed in real-time to all other players via Socket.IO.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js (>= 18) |
| Server | Express 4.x |
| Real-time | Socket.IO 4.x |
| File handling | Multer (disk storage), Archiver (zip), UUID |
| QR codes | `qrcode` (server-side generation) |
| Compression | `compression` middleware (gzip) |
| PDF (client) | pdf-lib, PDF.js, Tesseract.js, Mammoth.js, JSZip |
| Frontend | Vanilla HTML, CSS, JavaScript (no framework) |
| Typography | Inter (Google Fonts) |
| Deployment | Render (free tier) |

---

## Project Structure

```
.
├── server.js                  # Entry point: Express + Socket.IO setup
├── package.json
├── src/
│   ├── config.js              # Centralized constants (ports, limits, expiry times)
│   ├── routes/
│   │   ├── pages.js           # HTML page serving routes
│   │   ├── transfer.js        # File upload, download, info, QR code endpoints
│   │   ├── chat.js            # Chat file upload + QR generation
│   │   └── translate.js       # Translation proxy (Google + MyMemory)
│   ├── socket/
│   │   └── index.js           # All WebSocket event handlers (chat, lobby, games)
│   └── utils/
│       └── helpers.js         # Shared state (Maps), code generators, sanitizers
├── public/
│   ├── pages/
│   │   ├── index.html         # Landing page + file transfer UI
│   │   ├── pdf.html           # PDF toolkit (29 tools)
│   │   ├── createpdf.html     # Document scanner + PDF generator
│   │   ├── chat.html          # Real-time chat application
│   │   ├── translate.html     # Translation interface
│   │   ├── streamfinder.html  # Streaming site directory
│   │   └── games.html         # Multiplayer Scribble game
│   ├── css/                   # Per-page stylesheets + shared nav styles
│   └── js/                    # Per-page JavaScript modules
├── uploads/                   # Temporary file storage (auto-cleaned, gitignored)
└── chat-uploads/              # Chat file attachments (gitignored)
```

---

## Getting Started

**Prerequisites:** Node.js 18 or higher.

```bash
# Clone the repository
git clone https://github.com/dewanggandhi01/SwiftShare.git
cd SwiftShare

# Install dependencies
npm install

# Start the server
npm start
```

The server starts on `http://localhost:3000` by default. Set the `PORT` environment variable to change it.

For development, `npm run dev` runs the same command (`node server.js`). There is no hot-reload configured -- restart the process manually on changes.

---

## Configuration

All tunable parameters live in `src/config.js`:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `PORT` | 3000 | Server port (overridden by `process.env.PORT`) |
| `CODE_EXPIRY_MS` | 600,000 (10 min) | How long a 6-digit transfer code remains valid |
| `LINK_EXPIRY_MS` | 172,800,000 (48 hr) | How long a shareable link remains valid |
| `MAX_FILE_SIZE` | 5 GB | Maximum size per uploaded file |
| `MAX_CHAT_FILE` | 25 MB | Maximum size for chat file attachments |
| `MAX_UPLOAD_FILES` | 100 | Maximum number of files per transfer |
| `MAX_MESSAGES_PER_ROOM` | 500 | Message buffer limit per chat room |

Expired transfers are cleaned up from disk every 60 seconds by a background `setInterval` in `transfer.js`.

---

## Security Considerations

- **Security headers:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block` are set on all responses.
- **Path traversal protection:** Downloads validate that resolved file paths stay within the `uploads/` directory before serving.
- **Filename sanitization:** All uploaded filenames are stripped of special characters (`<>:"/\|?*` and control characters) and `..` sequences.
- **Input length limits:** Usernames, messages, room codes, and file names are truncated to configured maximums on the server side.
- **No persistent user data:** No database, no user accounts, no cookies beyond what the browser manages locally. Chat state is in-memory only and lost on server restart.
- **Static asset caching:** Static files are served with 7-day `max-age` headers and ETag support.
- **Gzip compression:** All responses are compressed via the `compression` middleware.

This is not a production-hardened system. There is no rate limiting, no CSRF protection, no authentication layer, and the translation endpoint proxies to external APIs without caching. It is designed for personal use, demos, and small-team collaboration where convenience outweighs strict security posture.

---

## License

This project is open source. See the repository for license details.
