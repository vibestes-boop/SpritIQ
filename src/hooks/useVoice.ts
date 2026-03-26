"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// Web Speech API Types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// ─── Sprachbefehl-Erkennung ───────────────────────────────────────────────────
export type VoiceCommand =
  | { type: "FUEL_TYPE"; value: "e10" | "e5" | "diesel" }
  | { type: "NAVIGATE_TO"; page: "karte" | "briefing" | "einstellungen" | "home" }
  | { type: "SORT"; by: "price" | "dist" }
  | { type: "REFRESH" }
  | { type: "UNKNOWN"; transcript: string };

function parseCommand(transcript: string): VoiceCommand {
  const t = transcript.toLowerCase().trim();

  // Kraftstoff-Befehle
  if (t.includes("e5") || t.includes("super plus")) return { type: "FUEL_TYPE", value: "e5" };
  if (t.includes("diesel")) return { type: "FUEL_TYPE", value: "diesel" };
  if (t.includes("e10") || t.includes("benzin") || t.includes("super")) return { type: "FUEL_TYPE", value: "e10" };

  // Navigation
  if (t.includes("karte") || t.includes("map") || t.includes("tankstellen zeigen")) return { type: "NAVIGATE_TO", page: "karte" };
  if (t.includes("briefing") || t.includes("nachrichten") || t.includes("analyse") || t.includes("ki")) return { type: "NAVIGATE_TO", page: "briefing" };
  if (t.includes("einstellungen") || t.includes("profil") || t.includes("fahrzeug")) return { type: "NAVIGATE_TO", page: "einstellungen" };
  if (t.includes("startseite") || t.includes("home") || t.includes("zurück")) return { type: "NAVIGATE_TO", page: "home" };

  // Sortierung
  if (t.includes("günstigste") || t.includes("preis") || t.includes("billigste")) return { type: "SORT", by: "price" };
  if (t.includes("nächste") || t.includes("nähe") || t.includes("entfernung")) return { type: "SORT", by: "dist" };

  // Aktualisieren
  if (t.includes("aktualisier") || t.includes("reload") || t.includes("neu laden")) return { type: "REFRESH" };

  return { type: "UNKNOWN", transcript };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export interface UseVoiceResult {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  command: VoiceCommand | null;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
}

export function useVoice(): UseVoiceResult {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [command, setCommand] = useState<VoiceCommand | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const isSupported = typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const startListening = useCallback(() => {
    if (!isSupported) return;

    const SpeechRecognitionCtor =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang             = "de-DE";
    recognition.continuous       = false;
    recognition.interimResults   = false;
    recognition.maxAlternatives  = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      setTranscript("");
      setCommand(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.resultIndex];
      const text   = result[0].transcript;
      setTranscript(text);
      setCommand(parseCommand(text));
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const msgs: Record<string, string> = {
        "no-speech":        "Keine Sprache erkannt.",
        "audio-capture":    "Kein Mikrofon gefunden.",
        "not-allowed":      "Mikrofon-Zugriff verweigert.",
        "network":          "Netzwerkfehler.",
      };
      setError(msgs[event.error] ?? `Fehler: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    command,
    error,
    startListening,
    stopListening,
  };
}
