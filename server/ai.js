// The employees' brains, plus Felix's favourite thing: a hard spending limit.
import Anthropic from '@anthropic-ai/sdk';
import { config } from './config.js';
import { all, get, run } from './db.js';
import { localDay, localMonth, daysLeftInMonth } from './time.js';

export const client = config.anthropicKey ? new Anthropic({ apiKey: config.anthropicKey }) : null;

// US dollars per million tokens (Anthropic first-party API pricing).
const PRICES = {
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2 },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.2 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5, cacheRead: 0.01 },
};
const WEB_SEARCH_COST = 0.01; // per search

export function costOf(model, usage) {
  const p = PRICES[model] || PRICES['claude-opus-5-5'];
  const cacheWrite = usage.cache_creation_input_tokens || 0;
  const cacheRead = usage.cache_read_input_tokens || 0;
  const searches = usage.server_tool_use?.web_search_requests || 0;
  return (
    ((usage.input_tokens || 0) * p.input +
      cacheWrite * p.input * 1.25 +
      cacheRead * p.cacheRead +
      (usage.output_tokens || 0) * p.output) /
      1e6 +
    searches * WEB_SEARCH_COST
  );
}

function recordUsage(staffId, model, usage) {
  const cost = costOf(model, usage);
  run(
    'INSERT INTO usage (day, staff_id, model, input_tokens, output_tokens, cost_usd) VALUES (?, ?, ?, ?, ?, ?)',
    localDay(), staffId, model,
    (usage.input_tokens || 0) + (usage.cache_read_input_tokens || 0) + (usage.cache_creation_input_tokens || 0),
    usage.output_tokens || 0,
    cost,
  );
  return cost;
}

export function budgetStatus() {
  const month = localMonth();
  const today = localDay();
  const spentMonth = get("SELECT COALESCE(SUM(cost_usd), 0) AS s FROM usage WHERE day LIKE ? || '%'", month).s;
  const spentToday = get('SELECT COALESCE(SUM(cost_usd), 0) AS s FROM usage WHERE day = ?', today).s;
  const remainingBeforeToday = Math.max(0, config.monthlyBudget - (spentMonth - spentToday));
  const dailyAllowance = remainingBeforeToday / daysLeftInMonth();
  const byStaff = all(
    "SELECT staff_id, ROUND(SUM(cost_usd), 4) AS cost FROM usage WHERE day LIKE ? || '%' GROUP BY staff_id",
    month,
  );
  return {
    monthlyBudget: config.monthlyBudget,
    spentMonth,
    spentToday,
    dailyAllowance,
    byStaff,
    // Routine and self-started work stops for the day once today's share is used.
    routineAllowed: spentToday < dailyAllowance && spentMonth < config.monthlyBudget * 0.95,
    // Briefings and things the owner explicitly asked for keep going until the month's hard cap.
    priorityAllowed: spentMonth < config.monthlyBudget,
  };
}

export class BudgetExceeded extends Error {}

/**
 * One request to Claude, with spend recorded against the employee.
 * `priority` work (briefings, owner requests) may use the month's reserve;
 * routine work is limited to today's allowance.
 */
export async function think(staffId, params, { priority = false, signal } = {}) {
  if (!client) throw new Error('No Anthropic API key configured.');
  const budget = budgetStatus();
  if (!(priority ? budget.priorityAllowed : budget.routineAllowed)) {
    throw new BudgetExceeded(priority ? 'Monthly AI budget reached.' : "Today's AI allowance is used up.");
  }

  const response = await client.beta.messages.create({
    model: config.model,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    ...params,
  }, { signal });

  recordUsage(staffId, response.model || config.model, response.usage);
  return response;
}
