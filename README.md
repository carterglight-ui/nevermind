# nevermind

A small company in a glass skyscraper with one client: you.

Nevermind is a personal AI company you watch and direct from your iPhone. Seven employees work in a 3D office. Behind each one is an AI agent doing real work: reading your inbox, keeping your client list, drafting follow-ups, proposals and captions. Master Ren briefs you every morning and evening.

**Getting it running:** see [SETUP.md](SETUP.md).

## How it plays

It's an office simulation you watch, styled like an old handheld RPG. You aren't a character in it: you're the client, looking in from above.

- **Watch.** The team works on their own: at their desks when they're on a task, walking over to hand each other work, gathering at the table for a daily huddle where their real brainstorm plays out in speech bubbles, and wandering when they're free. Drag to look around, pinch to zoom.
- **Talk to Ren.** The big button. Ask him anything, hand him your to-do list, call a team huddle, read his briefings. He tells the others.
- **Tap anyone** and they stop and turn to you: ASK, NEW TASK, MOVE (then tap where they should go), THEIR WORK, PAUSE/RESUME, STOP TASK.
- **Tap a station label:** the **Printer** (drafts waiting for you), **Ren's scroll** (briefings), **Bulletin board** (everything that happened), **Lead board** (Wren's prospects), **Mail terminal** (what the team can see of your accounts). A "!" means something is waiting.
- **Briefings** list what each employee did, person by person, every morning and evening.
- **XP only comes from real results:** finished tasks, work you approve, leads that turn into meetings and wins, briefings, and items you cross off your own list. As the company levels up, the office gets upgrades.

There are two builds of the same game:

| | Preview office (Claude link) | Your office (Railway server) |
|---|---|---|
| Brains | Your Claude plan | Your Anthropic API key |
| Gmail / calendar | No | Yes, read-only |
| Works when the app is closed | No | Yes, around the clock, with 7 AM / 7 PM briefings |
| Build | `npm run build:preview` | `npm run build` |

## Phase 1: The Office Opens (this version)

| Who | Status | What they do now |
|---|---|---|
| Master Ren, Director of Life | Working | 7:00 AM briefing (deeper on Mondays), 7:00 PM wrap-up, takes requests and hands them to the right person |
| Washington Mercer, Chief Career Officer | Working | Shifts around the clock: reads new email, checks the calendar, tracks clients and follow-ups, researches prospects, assigns production work to Milo |
| Milo Reyes, Producer | Working | Drafts emails, proposals, ad copy, captions and content plans into your Review inbox |
| Wren Vale, intern | Working (on loan to Washington) | Every weekday: finds and verifies local businesses whose marketing should be better, drafts a cold email for each, and lists natural ways to meet them. Her lead board tracks them from new to won. |
| Felix Ledger, Ollie Park | In the office, starting Phase 2 | Finance |
| Cleo March | In the office, starting Phase 2 | Creative |

**Your list.** Hand Ren your to-do list (typed, pasted, or a photo of a handwritten one). He gives the team what they can do and keeps what only you can do on **My List**, with tips. Crossing items off earns the company XP too.

**Weekly reviews.** Sunday evening, Washington looks for the highest-leverage improvements to your business and sends a report (ready for Monday's deep briefing). Wednesday, he reviews your website (`WEBSITE_URL`) and suggests fixes with exact copy.

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

- **LOOP** (your Alfa Dental work app): connect once we know where it keeps its data (a database, an export, or an API), so the team can see your work there.
- **Website changes**: today the team reviews American Optic and drafts fixes. Next, Milo prepares the actual change on GitHub and it goes live only when you approve it.

- **Phase 2**: Felix and Ollie (USAA balances and transactions, bills calendar, budgets, investing and side-hustle ideas, all suggestions only), Cleo and Wren (screenplays, app and business ideas, research), and image generation for Milo.
- **Phase 3**: polished characters and animation, voice, approved one-tap posting to Instagram, Facebook, YouTube and TikTok, and simple video edits.
