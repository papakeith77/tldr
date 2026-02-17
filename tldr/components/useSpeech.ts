"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ThreadSegment } from "./types";

type SpeechStatus = "idle" | "playing" | "paused" | "ended" | "error";

export function useSpeech(segments: ThreadSegment[]) {
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [rate, setRate] = useState(1.0);
  const [voiceURI, setVoiceURI] = useState<string | null>(null);
  const [index, setIndex] = useState(0);

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const voices = useMemo(() => {
    if (typeof window === "undefined") return [];
    return window.speechSynthesis?.getVoices?.() ?? [];
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    synthRef.current = window.speechSynthesis;

    // Some browsers populate voices async.
    const handler = () => {
      // trigger re-render by toggling state
      setVoiceURI((v) => v ?? null);
    };
    window.speechSynthesis?.addEventListener?.("voiceschanged", handler as any);
    return () => window.speechSynthesis?.removeEventListener?.("voiceschanged", handler as any);
  }, []);

  function stop() {
    const synth = synthRef.current;
    if (!synth) return;
    synth.cancel();
    utterRef.current = null;
    setStatus("idle");
  }

  function speakFrom(startIndex: number) {
    const synth = synthRef.current;
    if (!synth) {
      setStatus("error");
      return;
    }
    synth.cancel();

    const seg = segments[startIndex];
    if (!seg) {
      setStatus("ended");
      return;
    }

    const u = new SpeechSynthesisUtterance(seg.text);
    u.rate = rate;

    if (voiceURI) {
      const v = (synth.getVoices?.() ?? []).find((vv) => vv.voiceURI === voiceURI);
      if (v) u.voice = v;
    }

    u.onstart = () => setStatus("playing");
    u.onend = () => {
      const next = startIndex + 1;
      if (next < segments.length) {
        setIndex(next);
        speakFrom(next);
      } else {
        setStatus("ended");
      }
    };
    u.onerror = () => setStatus("error");

    utterRef.current = u;
    setIndex(startIndex);
    synth.speak(u);
  }

  function play() {
    if (!segments.length) return;
    const synth = synthRef.current;
    if (!synth) {
      setStatus("error");
      return;
    }
    // If paused, resume; else start from current index.
    if (synth.paused) {
      synth.resume();
      setStatus("playing");
      return;
    }
    speakFrom(index);
  }

  function pause() {
    const synth = synthRef.current;
    if (!synth) return;
    synth.pause();
    setStatus("paused");
  }

  function restart() {
    stop();
    setIndex(0);
    speakFrom(0);
  }

  function skip(delta: number) {
    if (!segments.length) return;
    const next = Math.min(Math.max(index + delta, 0), segments.length - 1);
    stop();
    speakFrom(next);
  }

  return {
    status,
    rate,
    setRate,
    voiceURI,
    setVoiceURI,
    voices: (typeof window !== "undefined" ? window.speechSynthesis?.getVoices?.() ?? voices : voices),
    index,
    setIndex,
    play,
    pause,
    restart,
    skip,
    stop,
  };
}
