"use client";

import { useEffect } from "react";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const offline =
    typeof navigator !== "undefined" && navigator.onLine === false;

  useEffect(() => {
    if (offline) {
      window.location.replace("/~offline");
    }
  }, [offline]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f0f10",
          color: "#f5f5f5",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <p
            style={{
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              margin: "0 0 12px",
            }}
          >
            RapVault
          </p>
          <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>
            This page couldn&apos;t load
          </h1>
          <p style={{ color: "#a3a3a3", fontSize: 14, lineHeight: 1.5 }}>
            {offline
              ? "Taking you to your offline vault…"
              : "If you're offline, open your locally saved vault. Otherwise reload to try again."}
          </p>
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
              flexWrap: "wrap",
              marginTop: 20,
            }}
          >
            <button
              type="button"
              onClick={() => {
                window.location.href = "/~offline";
              }}
              style={{
                minHeight: 44,
                borderRadius: 12,
                border: 0,
                padding: "0 18px",
                background: "#8b5cf6",
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Open offline vault
            </button>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                minHeight: 44,
                borderRadius: 12,
                border: "1px solid #333",
                padding: "0 18px",
                background: "transparent",
                color: "#f5f5f5",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
