# Setting up Nevermind

This takes about 45 minutes, once. You'll create two accounts (Anthropic and Railway), copy a few secret values from Google, and paste them into Railway. No coding.

Keep a note open (Apple Notes is fine) to hold the values as you collect them. You'll need:

| Name | What it is | Where it comes from |
|---|---|---|
| `APP_PASSCODE` | The password to open your office | You make it up (Step 5) |
| `ANTHROPIC_API_KEY` | The team's AI | Step 2 |
| `GMAIL_ADDRESS` | Your Gmail address | You know this one |
| `GMAIL_APP_PASSWORD` | A read-access password just for Nevermind | Step 3 |
| `GOOGLE_CALENDAR_ICS_URL` | A private, read-only link to your calendar | Step 4 |

Never paste these into a chat, an email or the code. They only go into Railway.

---

## Step 1: Make the repository private

Your code is on GitHub. It contains no passwords, but it does describe your setup, so keep it private.

1. Open **github.com/carterglight-ui/nevermind/settings** (on iPhone, use Safari and tap **aA → Request Desktop Website** if the page looks cramped).
2. Scroll to the bottom to **Danger Zone**.
3. Tap **Change visibility → Change to private**, then confirm by typing the repository name.

## Step 2: Anthropic API key (the team's brains)

1. Go to **console.anthropic.com** and sign up (or sign in).
2. **Billing**: add a payment method and buy credits. $25 is plenty to start.
3. **Limits**: set a monthly spend limit of about **$90**. That's a second safety net. Nevermind also stops itself at its own budget (below).
4. **API Keys → Create Key**. Name it `Nevermind`, then copy the key (it starts with `sk-ant-`). It's shown only once; put it in your note as `ANTHROPIC_API_KEY`.

## Step 3: Gmail app password (read-only inbox access)

Nevermind reads your inbox. It has **no ability to send**: there is no sending code anywhere in the project.

1. Go to **myaccount.google.com → Security**.
2. Make sure **2-Step Verification** is **On** (app passwords require it).
3. Go to **myaccount.google.com/apppasswords**.
4. Name it `Nevermind` and tap **Create**.
5. Copy the 16-letter password. In your note, save it as `GMAIL_APP_PASSWORD` (spaces don't matter).

To cut Nevermind off from your email at any time, delete this app password on the same page.

## Step 4: Your calendar's private address (read-only)

This step needs the desktop version of Google Calendar. On iPhone, open Safari and go to **calendar.google.com**, then tap **aA → Request Desktop Website**.

1. Tap the **gear icon → Settings**.
2. In the left column under **Settings for my calendars**, tap your calendar (usually your name).
3. Scroll to **Integrate calendar**.
4. Copy **Secret address in iCal format** (it ends in `basic.ics`). Save it as `GOOGLE_CALENDAR_ICS_URL`.

Anyone with this link can see your calendar, so treat it like a password. You can reset it on the same screen.

## Step 5: Put the office online with Railway

Railway runs Nevermind HQ around the clock. It costs about $5/month on the Hobby plan.

1. Go to **railway.com** and **sign in with GitHub**.
2. **New Project → Deploy from GitHub repo → `nevermind`**. Allow Railway to access the repo if it asks.
3. In the service's **Settings → Source**, set the branch to the one Claude tells you (normally `main`).
4. Open the service's **Variables** tab and add each of these (**New Variable**, name on the left, value on the right):

   ```
   APP_PASSCODE              (make up something long, e.g. three random words and a number)
   OWNER_NAME                (your first name)
   TIMEZONE                  America/New_York
   ANTHROPIC_API_KEY         (from Step 2)
   AI_MONTHLY_BUDGET         85
   GMAIL_ADDRESS             (your Gmail address)
   GMAIL_APP_PASSWORD        (from Step 3)
   GOOGLE_CALENDAR_ICS_URL   (from Step 4)
   ```

5. **Add a volume**. This is the office's filing cabinet; without it, everything resets whenever Railway restarts. Right-click the service (or use the **+ / Create** menu) → **Volume**, attach it to the service, and set the **mount path** to `/data`.
6. **Settings → Networking → Generate Domain**. You'll get an address like `nevermind-production.up.railway.app`.
7. Wait for the deploy to show **Active** (a few minutes the first time).

## Step 6: Put it on your iPhone

1. Open your Railway address in **Safari** (it has to be Safari for this step).
2. Enter your `APP_PASSCODE`.
3. Tap the **Share** button → **Add to Home Screen** → **Add**.
4. Open Nevermind **from the Home Screen icon**, not Safari.
5. Tap **More → Turn on notifications on this phone** and allow notifications. Ren's 7:00 AM and 7:00 PM briefings will arrive as notifications.

## Step 7: Brief the team

In **More**:

- **About you**: your name, what you do (marketing and ads for car dealerships, dentist offices and small businesses), your current clients, how you like emails to sound, and anything about family or schedule they should respect.
- **Ground rules**: anything they should always or never do (for example "keep client emails under 150 words", "no contact on Sundays").

Then tap **Run Washington's shift now**. Within a minute or two you'll see him go to his desk and start reading your inbox. Anything he wants written goes to Milo, and Milo's drafts land in **Review**.

---

## How the money works

- **Hosting**: about $5/month (Railway).
- **AI**: capped by `AI_MONTHLY_BUDGET` (default $85). Each day gets an even share of what's left in the month. Once today's share is used, routine and self-started work waits until tomorrow. Things you ask for directly, and Ren's briefings, still go through until the monthly cap.
- The **More** tab shows spend this month, today, and by employee. Felix will take this over in Phase 2.

## Your controls

- **Tap any employee**: see what they're doing, **Stop** the current task, **Pause** them, message them, **Assign** a task, and reorder or cancel their queue.
- **More → Pause everyone**: stops all work immediately.
- **Review**: every email draft and deliverable waits here. Edit it, then **Open in Gmail** to send it yourself, **Request changes** to send it back with notes, or **Dismiss** it.
- Nothing is ever sent, posted, purchased or paid by Nevermind.

## If something's wrong

- **"Setup needed" banner**: `ANTHROPIC_API_KEY` is missing or misspelled in Railway Variables.
- **Gmail shows grey in More**: check `GMAIL_ADDRESS` and `GMAIL_APP_PASSWORD`. Railway's **Deployments → View logs** will show `inbox sync failed` with the reason.
- **No notifications**: make sure you opened Nevermind from the Home Screen icon, then turned notifications on in **More**.
- **Everything reset**: the volume isn't attached at `/data` (Step 5.5).
