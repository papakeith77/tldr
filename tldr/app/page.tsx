"use client";

import { useMemo, useState } from "react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import type { ThreadPayload, ThreadSegment } from "../components/types";
import { useSpeech } from "../components/useSpeech";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeDemoText(text: string): ThreadSegment[] {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  // If they pasted a thread with numbered items, keep them as separate segments.
  // Otherwise chunk by paragraph.
  const segments = lines.map((t, i) => ({ id: `demo-${i}`, text: t }));
  return segments.length ? segments : [{ id: "demo-0", text: text.trim() }];
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [demoText, setDemoText] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [payload, setPayload] = useState<ThreadPayload | null>(null);

  const segments = useMemo(() => payload?.segments ?? [], [payload]);
  const speech = useSpeech(segments);

  async function fetchThread() {
    setErr(null);
    setLoading(true);
    setPayload(null);
    speech.stop();

    try {
      const res = await fetch("/api/thread", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();

      if (!res.ok) {
        setErr(json?.error ?? "Something went wrong.");
        return;
      }
      setPayload(json);
    } catch (e: any) {
      setErr(e?.message ?? "Network error.");
    } finally {
      setLoading(false);
    }
  }

  function startDemo() {
    setErr(null);
    speech.stop();
    const segs = normalizeDemoText(demoText);
    setPayload({
      title: "Demo Mode",
      segments: segs,
    });
  }

  const canListen = (payload?.segments?.length ?? 0) > 0;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/20 shadow-glow grid place-items-center">
            <span className="text-lg font-black tracking-tight">T</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold tracking-tight">TLDR</h1>
            <p className="text-sm text-zinc-400">Paste an X thread link. Listen like a podcast.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge>Dark mode by default</Badge>
          <Badge>Web voice playback</Badge>
          <Badge>iPhone SwiftUI template included</Badge>
        </div>
      </header>

      <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5 shadow-glow">
          <h2 className="text-lg font-semibold">1) Paste an X link</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Example: https://x.com/username/status/123...
          </p>

          <div className="mt-4 flex flex-col gap-3">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste X post URL…"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400/40"
            />

            <div className="flex items-center gap-3">
              <Button onClick={fetchThread} disabled={!url || loading}>
                {loading ? "Fetching…" : "Fetch thread"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setUrl("");
                  setPayload(null);
                  setErr(null);
                  speech.stop();
                }}
              >
                Clear
              </Button>
            </div>

            {err ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                <div className="font-semibold">Couldn’t fetch</div>
                <div className="mt-1 text-red-200/90">{err}</div>
                <div className="mt-2 text-xs text-red-200/70">
                  Tip: use Demo Mode below to test the “podcast” reading UI without the X API.
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-6 border-t border-white/10 pt-5">
            <h3 className="text-sm font-semibold text-zinc-200">Demo Mode (no X API)</h3>
            <p className="mt-1 text-xs text-zinc-400">
              Paste the thread text here (or any text). TLDR will read it as queued segments.
            </p>
            <textarea
              value={demoText}
              onChange={(e) => setDemoText(e.target.value)}
              placeholder={"Paste text here…\n\nLine breaks become separate “segments.”"}
              className="mt-3 min-h-[140px] w-full resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400/40"
            />
            <div className="mt-3">
              <Button onClick={startDemo} disabled={!demoText.trim()}>
                Load Demo
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/30 p-5 shadow-glow">
          <h2 className="text-lg font-semibold">2) Listen</h2>

          <div className="mt-3 rounded-2xl border border-white/10 bg-zinc-950/40 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-zinc-400">Now loaded</div>
                <div className="mt-1 text-base font-semibold">
                  {payload?.title ?? "Nothing yet"}
                </div>
                {payload?.authorHandle ? (
                  <div className="mt-1 text-sm text-zinc-400">{payload.authorHandle}</div>
                ) : null}
                {payload?.sourceUrl ? (
                  <a
                    className="mt-2 inline-block text-xs text-indigo-300 hover:text-indigo-200"
                    href={payload.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open source ↗
                  </a>
                ) : null}
              </div>

              <Badge>{segments.length ? `${segments.length} segments` : "0 segments"}</Badge>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button onClick={speech.play} disabled={!canListen}>
                {speech.status === "playing" ? "Playing…" : "Play"}
              </Button>
              <Button onClick={speech.pause} variant="ghost" disabled={!canListen}>
                Pause
              </Button>
              <Button onClick={speech.restart} variant="ghost" disabled={!canListen}>
                Restart
              </Button>
              <Button onClick={() => speech.skip(-1)} variant="ghost" disabled={!canListen}>
                Prev
              </Button>
              <Button onClick={() => speech.skip(1)} variant="ghost" disabled={!canListen}>
                Next
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-zinc-400">Speed</div>
                <input
                  type="range"
                  min="0.8"
                  max="1.5"
                  step="0.05"
                  value={speech.rate}
                  onChange={(e) => speech.setRate(Number(e.target.value))}
                  className="mt-2 w-full"
                  disabled={!canListen}
                />
                <div className="mt-1 text-sm">{speech.rate.toFixed(2)}x</div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-zinc-400">Voice</div>
                <select
                  className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400/40"
                  value={speech.voiceURI ?? ""}
                  onChange={(e) => speech.setVoiceURI(e.target.value || null)}
                  disabled={!canListen}
                >
                  <option value="">Default</option>
                  {(speech.voices ?? []).map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-xs text-zinc-500">
                  Voice list depends on your browser/OS.
                </div>
              </div>
            </div>

            <div className="mt-4 text-sm text-zinc-300">
              <span className="text-zinc-500">Status:</span>{" "}
              <span className="font-medium">{speech.status}</span>{" "}
              {segments.length ? (
                <>
                  <span className="text-zinc-600">•</span>{" "}
                  <span className="text-zinc-500">Segment</span>{" "}
                  <span className="font-medium">{speech.index + 1}</span>
                  <span className="text-zinc-500">/{segments.length}</span>
                </>
              ) : null}
            </div>
          </div>

          <div className="mt-5">
            <h3 className="text-sm font-semibold text-zinc-200">Segments</h3>
            <div className="mt-2 max-h-[360px] overflow-auto rounded-2xl border border-white/10 bg-zinc-950/30">
              {segments.length ? (
                <ul className="divide-y divide-white/10">
                  {segments.map((s, i) => (
                    <li key={s.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-xs text-zinc-500">#{i + 1}</div>
                        <button
                          className={cx(
                            "text-left text-sm leading-relaxed text-zinc-200 hover:text-white",
                            i === speech.index && (speech.status === "playing" || speech.status === "paused")
                              ? "text-white"
                              : ""
                          )}
                          onClick={() => {
                            speech.stop();
                            speech.setIndex(i);
                            speech.play();
                          }}
                        >
                          {s.text}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-5 text-sm text-zinc-500">
                  Nothing loaded yet. Fetch a thread or use Demo Mode.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="mt-10 text-xs text-zinc-500">
        <div className="max-w-3xl">
          <span className="text-zinc-400">Heads up:</span> retrieving full threads reliably typically
          requires the official X API and the right access level. This starter app degrades gracefully
          and still lets you test the listening experience.
        </div>
      </footer>
    </main>
  );
}
