"use client"
import * as ToggleGroup from "@radix-ui/react-toggle-group"
import { useEffect, useState } from "react"

type Mode = "system" | "light" | "dark"
const KEY = "nearquery-theme"

function apply(m: Mode) {
  if (m === "system") document.documentElement.removeAttribute("data-theme")
  else document.documentElement.setAttribute("data-theme", m)
}

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system")
  useEffect(() => {
    try { const s = localStorage.getItem(KEY) as Mode | null; if (s) { setMode(s); apply(s) } } catch { /* storage unavailable */ }
  }, [])
  return (
    <ToggleGroup.Root className="seg" type="single" value={mode} aria-label="Theme" onValueChange={(v) => {
      if (!v) return
      setMode(v as Mode); apply(v as Mode)
      try { localStorage.setItem(KEY, v) } catch { /* ignore */ }
    }}>
      {(["system", "light", "dark"] as Mode[]).map((m) => <ToggleGroup.Item key={m} value={m} aria-label={m === "light" ? "Paper (light)" : m === "dark" ? "Terminal (dark)" : "System"}>{m === "light" ? "Paper" : m === "dark" ? "Terminal" : "System"}</ToggleGroup.Item>)}
    </ToggleGroup.Root>
  )
}
