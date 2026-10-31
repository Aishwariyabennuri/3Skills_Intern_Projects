# QuizUp Live

A real-time, team-based quiz game. One person hosts a quiz from a big screen, everyone else joins from their phone using a room code, and players team up by typing a shared **team code** — no accounts, no app install.

Built with **Node.js, Express, Socket.IO, and SQLite** (via Node's built-in `node:sqlite` module — no native/compiled dependencies at all). The frontend is plain HTML/CSS/JS — no build step required.

## Features

- **Quiz builder** — create quizzes with multiple-choice questions, a per-question time limit, and a per-question point value.
- **Shareable room codes** — hosting a quiz generates a short, easy-to-read 6-character room code.
- **Team codes** — players join by entering any team code. The first person to use a code creates the team; anyone else who enters the same code joins it. No pre-registration needed.
- **Live gameplay** — questions broadcast to every player at once, with a countdown ring, speed-based scoring (faster correct answers score more), and instant personal feedback.
- **Host control console** — start the game, watch answers come in live, reveal results, and advance questions from a separate host screen.
- **Live leaderboards** — a team leaderboard and a per-player leaderboard, updated after every question, plus a final podium.
- **Reconnect-friendly** — if a player's phone refreshes or drops connection mid-game, rejoining resumes them into the current question.

## Project structure

```
quiz-app/
├── server.js                # Express + Socket.IO entry point
├── db/
│   ├── schema.sql            # SQLite schema
│   └── database.js           # DB connection + prepared queries
├── routes/
│   ├── quizzes.js             # REST API: create/list/delete quizzes
│   └── rooms.js               # REST API: create a room, look up a room by code
├── sockets/
│   └── gameSocket.js          # All real-time game logic (Socket.IO events)
├── utils/
│   └── codeGenerator.js       # Room code generator
├── public/                    # Static frontend (served directly by Express)
│   ├── index.html              # Landing page
│   ├── host.html / js/host.js         # Quiz builder + your quiz list
│   ├── host-room.html / js/host-room.js  # Live host control console
│   ├── play.html / js/play.js         # Player join + gameplay screen
│   └── css/style.css           # Shared styling
└── data/                      # SQLite database file lives here at runtime
```

## Running it locally

Requirements: **Node.js 22.5 or later** (the app uses Node's built-in `node:sqlite` module, so there's no native compiler / Visual Studio / build-tools step — just `npm install`).

```bash
cd quiz-app
npm install
npm start
```

Then open **http://localhost:3000** in your browser.

- Click **Host a quiz** to build a quiz and open a room.
- Open **http://localhost:3000/play.html** (e.g. on your phone, or a second browser tab) to join with the room code.

The SQLite database file is created automatically at `data/quiz.db` the first time you run the server — no setup needed.

## How to play

**Hosting:**
1. Go to **Host a quiz**, click **+ New quiz**, add your questions (each with 2–4 options, the correct answer marked, a time limit, and a point value), and save.
2. Click **Host this quiz** — you'll get a room code and land on the host console.
3. Share the room code (and the site's `/play.html` URL) with players.
4. Once people have joined, click **Start game**. Use **Next question** / **Reveal answer now** to drive the game, and see the final podium at the end.

**Joining:**
1. Go to `/play.html`, enter the room code, your name, and a **team code**.
2. If your team code is new, you create that team. If a teammate already used it, you join them.
3. Wait for the host to start, then tap an answer as fast as you can — speed adds bonus points on top of getting it right.

## Scoring

For a correct answer, points are calculated as:

```
points = round(maxPoints * (0.5 + 0.5 * (1 - timeTaken / timeLimit)))
```

So a correct answer always earns at least half of the question's max points, with the other half awarded based on how quickly you answered. Wrong or missed answers score 0. A team's score is the sum of its members' points.

## Deploying it so anyone can play

This app is a single Node process — deploy it to any Node-friendly host (Render, Railway, Fly.io, a VPS, etc.). Notes:

1. **Persistent disk for SQLite**: `data/quiz.db` must live on persistent storage, or quizzes/scores will reset on every deploy/restart. Most platforms (Render, Railway, Fly) let you attach a small persistent volume mounted at `data/` — do this, or point `data/` at a mounted volume path.
2. **Start command**: `npm install && npm start` (the server reads `PORT` from the environment automatically, falling back to `3000`).
3. **WebSockets**: Socket.IO needs WebSocket support enabled on your host (this is on by default for Render/Railway/Fly/most VPS setups; if you put it behind a proxy like Nginx, make sure `Upgrade`/`Connection` headers are forwarded).
4. **HTTPS**: once deployed behind HTTPS, everything (fetch calls and Socket.IO) uses relative URLs, so no configuration changes are needed.
5. No environment variables are required beyond the optional `PORT`.

## Customization ideas

- Add a max number of teams/players per room.
- Add a "kick player" control to the host console.
- Export final results as a CSV from the game-over screen.
- Add music/sound effects for question start, countdown, and reveal.
