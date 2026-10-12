// Every setting Nevermind reads from its environment lives here.
// On the server these are set in the hosting dashboard, never in the code.
import fs from 'node:fs';
import path from 'node:path';

// Load a local .env file when running on a computer (hosting platforms set real env vars).
const envFile = path.resolve('.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const env = process.env;

export const config = {
  port: Number(env.PORT || 3000),
  dataDir: env.DATA_DIR || path.resolve('data'),
  timezone: env.TIMEZONE || 'America/New_York',
  passcode: env.APP_PASSCODE || '',

  anthropicKey: env.ANTHROPIC_API_KEY || '',
  model: env.NEVERMIND_MODEL || 'claude-opus-5-5',

  // Whole-month ceiling for AI spend, in US dollars. Hosting is separate.
  monthlyBudget: Number(env.AI_MONTHLY_BUDGET || 85),

  gmailAddress: env.GMAIL_ADDRESS || '',
  gmailAppPassword: (env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, ''),
  calendarIcsUrl: env.GOOGLE_CALENDAR_ICS_URL || '',

  vapidPublicKey: env.VAPID_PUBLIC_KEY || '',
  vapidPrivateKey: env.VAPID_PRIVATE_KEY || '',
  vapidContact: env.VAPID_CONTACT || (env.GMAIL_ADDRESS ? `mailto:${env.GMAIL_ADDRESS}` : 'mailto:owner@example.com'),

  ownerName: env.OWNER_NAME || 'the client',
  // Where Wren looks for leads, and what kind of businesses.
  leadArea: env.LEAD_AREA || 'Jacksonville, Florida',
  leadTargets: env.LEAD_TARGETS || 'car dealerships, dentist offices and other local small businesses',
  leadsPerShift: Number(env.LEADS_PER_SHIFT || 4),
  // The owner's own website, reviewed weekly.
  websiteUrl: env.WEBSITE_URL || '',
};

export const integrations = {
  ai: Boolean(config.anthropicKey),
  gmail: Boolean(config.gmailAddress && config.gmailAppPassword),
  calendar: Boolean(config.calendarIcsUrl),
  push: false, // switched on by push.js once keys are ready
};
