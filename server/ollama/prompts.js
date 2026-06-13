/**
 * Prompt templates for Phi-4 Mini tasks.
 * Keep these in a separate file so they can be easily tuned.
 */

export const FILE_SUMMARY_PROMPT = `You are a code documentation assistant. Analyze this file and return a JSON object with these exact fields:
{
  "purpose": "one sentence describing what this file does",
  "exports": ["list of exported functions, classes, or variables"],
  "depends_on": ["list of imports or dependencies"],
  "gotchas": ["list of anything tricky, incomplete, or important to know before editing this file"]
}

Return only valid JSON. No markdown, no explanation, no backticks.

File path: {path}
File content:
{content}`;

export const CHANGELOG_ENRICHMENT_PROMPT = `You are a code review assistant. Analyze this git diff and suggest DECISION and WATCH OUT entries for a changelog. Return a JSON object with these exact fields:
{
  "decisions": ["list of non-obvious decisions made in this diff, explain the why"],
  "watch_out": ["list of things the next developer should know before touching these files"]
}

Return only valid JSON. No markdown, no explanation, no backticks.
Keep each entry concise (one sentence). Only include entries that are genuinely useful.
If there are no decisions or watch outs, return empty arrays.

Git diff:
{diff}`;

export const SNAPSHOT_UPDATE_PROMPT = `You are a project documentation assistant. Review the current project snapshot and the recent changes, then suggest an updated snapshot. Return a JSON object with:
{
  "file_map_additions": [{"path": "...", "description": "one line purpose"}],
  "file_map_removals": ["paths to remove from file map if deleted or renamed"],
  "key_decisions_additions": ["new architectural decisions to add"],
  "todos_to_complete": ["todo titles that appear to be done based on recent changes"]
}

Return only valid JSON. No markdown, no explanation, no backticks.

Current snapshot:
{snapshot}

Recent changelog entries:
{recent_changes}`;
