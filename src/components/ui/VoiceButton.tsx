"use client";

import { useEffect } from "react";
import { Mic, MicOff, Loader } from "lucide-react";
import { useVoice, type VoiceCommand } from "@/hooks/useVoice";
import { useRouter } from "next/navigation";

interface VoiceButtonProps {
  onCommand?: (cmd: VoiceCommand) => void;
  size?: "sm" | "md" | "lg";
}

export default function VoiceButton({ onCommand, size = "md" }: VoiceButtonProps) {
  const { isListening, isSupported, transcript, command, error, startListening, stopListening } = useVoice();
  const router = useRouter();

  const dim = size === "sm" ? 36 : size === "lg" ? 56 : 44;
  const iconSize = size === "sm" ? 14 : size === "lg" ? 22 : 18;

  // Befehl automatisch verarbeiten + an Parent weitergeben
  useEffect(() => {
    if (!command) return;

    // Navigation-Befehle direkt ausführen
    if (command.type === "NAVIGATE_TO") {
      const routes: Record<string, string> = {
        karte:        "/karte",
        briefing:     "/briefing",
        einstellungen:"/einstellungen",
        home:         "/",
      };
      router.push(routes[command.page]);
    }

    onCommand?.(command);
  }, [command, onCommand, router]);

  if (!isSupported) return null;

  return (
    <div style={{ position: "relative", display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
      <button
        onClick={isListening ? stopListening : startListening}
        aria-label={isListening ? "Spracheingabe stoppen" : "Spracheingabe starten"}
        style={{
          width:          `${dim}px`,
          height:         `${dim}px`,
          borderRadius:   "50%",
          border:         `1.5px solid ${isListening ? "#22C55E" : error ? "#EF4444" : "#2A2A3C"}`,
          background:     isListening
            ? "rgba(34,197,94,0.15)"
            : error
            ? "rgba(239,68,68,0.1)"
            : "#111118",
          cursor:         "pointer",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          transition:     "all 250ms ease",
          boxShadow:      isListening
            ? "0 0 0 4px rgba(34,197,94,0.15), 0 0 20px rgba(34,197,94,0.2)"
            : "none",
          // Pulsier-Animation wenn aktiv
          animation:      isListening ? "voice-pulse 1.5s ease-in-out infinite" : "none",
        }}
      >
        {isListening
          ? <Loader size={iconSize} color="#22C55E" style={{ animation: "spin 1s linear infinite" }} />
          : error
          ? <MicOff size={iconSize} color="#EF4444" />
          : <Mic size={iconSize} color="#64748B" />
        }
      </button>

      {/* Transkript / Fehler Bubble */}
      {(transcript || error) && (
        <div
          style={{
            position:       "absolute",
            top:            `${dim + 8}px`,
            left:           "50%",
            transform:      "translateX(-50%)",
            whiteSpace:     "nowrap",
            background:     error ? "rgba(239,68,68,0.12)" : "rgba(17,17,24,0.95)",
            border:         `1px solid ${error ? "rgba(239,68,68,0.3)" : "#2A2A3C"}`,
            borderRadius:   "8px",
            padding:        "6px 10px",
            fontSize:       "12px",
            color:          error ? "#EF4444" : "#94A3B8",
            fontFamily:     "'Inter', sans-serif",
            pointerEvents:  "none",
            zIndex:         100,
            maxWidth:       "220px",
            overflow:       "hidden",
            textOverflow:   "ellipsis",
          }}
        >
          {error || `"${transcript}"`}
        </div>
      )}
    </div>
  );
}
