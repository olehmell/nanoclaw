#!/usr/bin/env node

/**
 * Extract YouTube metadata and captions via yt-dlp.
 * Node.js port — no Python dependency required.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

const SUBTITLE_LANGS = "uk.*,uk,ru.*,ru,en.*,en,.*";
const TIMESTAMP_RE = /^\d{2}:\d{2}:\d{2}\.\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}\.\d{3}/;
const SRT_TIMESTAMP_RE =
  /^\d{2}:\d{2}:\d{2},\d{3}\s+-->\s+\d{2}:\d{2}:\d{2},\d{3}/;
const TAG_RE = /<[^>]+>/g;

function runCommand(args) {
  const [cmd, ...rest] = args;
  return execFileSync(cmd, rest, { encoding: "utf-8", maxBuffer: 50 * 1024 * 1024 });
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
}

function cleanCaptionLine(line) {
  return decodeHtmlEntities(line.replace(TAG_RE, ""))
    .replace(/\s+/g, " ")
    .trim();
}

function cleanSubtitleFile(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const lines = [];
  let previous = "";

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line === "WEBVTT" || line === "NOTE") continue;
    if (line.startsWith("Kind:") || line.startsWith("Language:")) continue;
    if (TIMESTAMP_RE.test(line) || SRT_TIMESTAMP_RE.test(line)) continue;
    if (/^\d+$/.test(line)) continue;

    const cleaned = cleanCaptionLine(line);
    if (!cleaned || cleaned === previous) continue;

    lines.push(cleaned);
    previous = cleaned;
  }

  return lines.join("\n");
}

function collectMetadata(url) {
  const stdout = runCommand([
    "yt-dlp",
    "--dump-single-json",
    "--no-download",
    url,
  ]);
  const data = JSON.parse(stdout);

  return {
    title: data.title ?? null,
    webpage_url: data.webpage_url ?? url,
    channel: data.channel ?? null,
    duration: data.duration ?? null,
    upload_date: data.upload_date ?? null,
    description: data.description ?? null,
    id: data.id ?? null,
  };
}

function collectTranscript(url) {
  const tmp = mkdtempSync(join(tmpdir(), "ukrainian-summary-"));

  try {
    runCommand([
      "yt-dlp",
      "--skip-download",
      "--write-sub",
      "--write-auto-sub",
      "--sub-langs",
      SUBTITLE_LANGS,
      "--convert-subs",
      "vtt",
      "--output",
      "%(id)s.%(ext)s",
      "--paths",
      tmp,
      url,
    ]);

    const files = readdirSync(tmp).sort();
    const candidates = [
      ...files.filter((f) => f.endsWith(".vtt")),
      ...files.filter((f) => f.endsWith(".srt")),
    ];

    for (const file of candidates) {
      const transcript = cleanSubtitleFile(join(tmp, file));
      if (transcript) {
        const ext = file.split(".").pop();
        return { transcript, source: ext };
      }
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }

  return { transcript: null, source: null };
}

function main() {
  const url = process.argv[2];
  if (!url) {
    process.stderr.write("Usage: youtube_transcript.mjs <youtube_url>\n");
    process.exit(1);
  }

  const metadata = collectMetadata(url);
  const { transcript, source } = collectTranscript(url);

  const payload = {
    ...metadata,
    transcript,
    transcript_available: Boolean(transcript),
    transcript_source: source,
  };

  console.log(JSON.stringify(payload, null, 2));
}

main();
