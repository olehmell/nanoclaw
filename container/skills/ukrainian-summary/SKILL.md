---
name: ukrainian-summary
description: Use when user pastes or forwards a URL, article link, YouTube link, or raw text block for summarization in Ukrainian. Also triggers on phrases like "конспект", "summarize this", "save this", "зроби саммарі", or when content is shared without explicit instruction. When saving to Obsidian, pair this skill with obsidian for vault writes.
---

# Ukrainian Summary

## Overview

Summarize any content — URL or pasted text — in Ukrainian and save to Obsidian via the `obsidian` skill. Always output Ukrainian regardless of source language.

## Trigger Conditions

- User pastes a URL (article, blog, YouTube)
- User pastes a long text block or transcript
- User says: "конспект", "summarize", "save this", "зроби саммарі", "збережи"
- Content forwarded without explicit instruction (Telegram-style)

## Workflow

1. **Identify input**
   - URL → load `WebFetch` via `ToolSearch` (query: "select:WebFetch"), then fetch full content
     - If the article returns a paywall, redirect, login page, or broken content, inform the user and stop
   - YouTube URL → always use the bundled `yt-dlp` helper, never `WebFetch`
     ```bash
     node scripts/youtube_transcript.mjs "<youtube_url>"
     ```
     - Read the JSON output fully before summarizing
     - Use `transcript` as the primary source when `transcript_available` is `true`
     - Use `description` and metadata only as fallback context when captions are unavailable
     - If `yt-dlp` is missing or the video is private, unavailable, age-restricted, or blocked, inform the user and stop
     - Do not summarize a YouTube video from the watch page HTML alone
   - Raw text → use directly

2. **Analyze content** — read fully before summarizing

3. **Classify quality**
   - `READ` — clear argument, specific insights, novel framing or data
   - `SKIM` — real point buried under fluff; core idea extractable in 1-2 bullets
   - `SKIP` — no clear argument, recycled opinions, no actionable insight
   - SKIP if content makes no claim that could not be inferred from the title alone

4. **Write Ukrainian summary** using `template.md` structure:
   - Title translated to Ukrainian
   - Source = original URL or "Переданий текст"
   - Date = today in YYYY-MM-DD format
   - Utility = READ / SKIM / SKIP (from classification above)
   - All body text in Ukrainian — translate from any source language
   - 2–4 subsections under Головний конфлікт (scale to content depth)
   - 2–5 bullets under Ключові інсайти
   - For YouTube videos without captions, explicitly say the summary is based on metadata/description only and keep claims conservative

5. **Add tags** — 2–5 tags, lowercase, hyphenated English:
   - Examples: `#ai`, `#product-management`, `#ukraine`, `#engineering`, `#leadership`, `#economics`, `#security`, `#geopolitics`, `#startups`, `#design`
   - Invent new tags as needed — the list above is not exhaustive
   - Be specific over generic; pick what the content is actually about

6. **Generate filename** — capitalize key title words, join with underscores
   - "Get Good at Agents" → `Get_Good_at_Agents.md`
   - "Копінги та допінги" → `Kopingy_ta_Dopingy.md`
   - For Cyrillic titles: transliterate phonetically (и/і→i, е→e, о→o, а→a, г→h, ж→zh, etc.)

7. **Save to Obsidian via `obsidian`**
   - When this skill writes into an Obsidian vault, also follow the `obsidian` skill for the vault operation details
   - Prefer the `obsidian` skill's default MCP path for note writes: save the note to `Resources/summaries/<filename>` with overwrite semantics
   - Keep the note path vault-relative; do not write directly to an absolute vault filesystem path
   - Do not create helper temp files with `Write`, `apply_patch`, shell redirection, `tee`, `sed`, or other raw filesystem note I/O just to save the note
   - If the user specified a vault, use it; if no default vault is configured and no explicit vault is provided, ask the user which vault to use instead of guessing
   - Verify the saved note through the `obsidian` skill after writing
   - If the Obsidian backend is unavailable or misconfigured, tell the user and stop instead of silently falling back to shell-based note writes

8. **Output summary in chat** — after saving, output the full summary text directly in the chat (the same content that was saved to Obsidian)

9. **Confirm save** — after the summary, add a short line: "Збережено: Resources/summaries/<filename> [Utility: READ/SKIM/SKIP]"

## Classification Notes

Even SKIM and SKIP articles get saved — the rating itself is useful signal.
For SKIP: keep summary short (Головний конфлікт only, no subsections needed).
For SKIM: one tight subsection summarizing the buried point.
For YouTube videos summarized from metadata only: default to `SKIM` or `SKIP` unless the description itself contains concrete substance.

## YouTube Helper Output

`scripts/youtube_transcript.mjs` wraps the `yt-dlp` CLI and returns JSON with:

- `title`
- `webpage_url`
- `channel`
- `duration`
- `upload_date`
- `description`
- `transcript`
- `transcript_available`
- `transcript_source`

Use `transcript` as the main evidence when present. Use metadata only to frame or sanity-check the summary, not to invent missing content.

## Language Rules

- ALL generated text must be in Ukrainian
- Keep embedded English terms where natural: `AI`, `product manager`, `startup`, brand names, tool names
- Do not translate proper nouns, product names, or technical acronyms
