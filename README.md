# nevermind

A small company in a glass skyscraper with one client: you.

Nevermind is a personal AI company you watch and direct from your iPhone. Seven employees work in a 3D office. Behind each one is an AI agent doing real work: reading your inbox, keeping your client list, drafting follow-ups, proposals and captions. Master Ren briefs you every morning and evening.

**Getting it running:** see [SETUP.md](SETUP.md).

## Phase 1: The Office Opens (this version)

| Who | Status | What they do now |
|---|---|---|
| Master Ren, Director of Life | Working | 7:00 AM briefing (deeper on Mondays), 7:00 PM wrap-up, takes requests and hands them to the right person |
| Washington Mercer, Chief Career Officer | Working | Shifts around the clock: reads new email, checks the calendar, tracks clients and follow-ups, researches prospects, assigns production work to Milo |
| Milo Reyes, Producer | Working | Drafts emails, proposals, ad copy, captions and content plans into your Review inbox |
| Felix Ledger, Ollie Park | In the office, starting Phase 2 | Finance |
| Cleo March, Wren Vale | In the office, starting Phase 2 | Creative |

## The rules the code enforces

- Nevermind **cannot send email**. Gmail access is read-only (IMAP), and there's no sending code. Drafts go to **Review**, where you edit them and send them from your own mail app.
- Nothing is posted, purchased or paid.
- Employees may draft, research, plan, revise and start their own ideas without asking; everything is logged and reported through Ren.
- Email and web content is treated as information, never as instructions.
- A monthly AI budget with a daily allowance keeps spending under control.
- You can stop a task, pause an employee, or pause the whole company at any time.
- In the office, characters have personalities. In the work itself (anything a client might see), they don't.

## How it's built

- `server/`: Nevermind HQ, a Node.js server that runs around the clock.
  - `staff.js`: the seven employees, their jobs and tools.
  - `agents/runner.js`: how an employee works (think → use tools → repeat), with stop and pause.
  - `agents/tools.js`: everything they can do. Read-only where it touches your accounts.
  - `scheduler.js`: shifts, inbox checks and briefings, in Eastern Time.
  - `briefings.js`: Ren's briefings.
  - `ai.js`: Claude API calls and the budget guard.
  - `integrations/`: Gmail (read-only IMAP) and Google Calendar (read-only iCal).
- `web/`: the iPhone app (React and Three.js), installed from Safari to the Home Screen.
  - `src/office/`: the 3D office, characters and speech bubbles.
  - `src/ui/`: employee panel, Review inbox, briefings, activity log, settings.

Running locally: `npm install`, copy `.env.example` to `.env` and fill it in, then `npm run build && npm start` and open http://localhost:3000.

## Coming next

- **Phase 2**: Felix and Ollie (USAA balances and transactions, bills calendar, budgets, investing and side-hustle ideas, all suggestions only), Cleo and Wren (screenplays, app and business ideas, research), and image generation for Milo.
- **Phase 3**: polished characters and animation, voice, approved one-tap posting to Instagram, Facebook, YouTube and TikTok, and simple video edits.
