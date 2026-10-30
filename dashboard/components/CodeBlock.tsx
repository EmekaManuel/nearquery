"use client"
import { useState } from "react"

const KW = /\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|JOIN|LEFT JOIN|ON|AS|WITH|CASE|WHEN|THEN|ELSE|END|AND|OR|NOT|IN|IS|NULL|FILTER|OVER|PARTITION BY|CREATE OR REPLACE TABLE|UNION ALL|HAVING|USING|DISTINCT|BY|LIMIT|CROSS JOIN|EXCLUDE)\b/g

function highlight(line: string) {
  const c = line.indexOf("--")
  const code = c >= 0 ? line.slice(0, c) : line
  const out: React.ReactNode[] = []
  let last = 0
  for (const m of code.matchAll(KW)) {
    out.push(code.slice(last, m.index))
    out.push(<span key={m.index} className="k">{m[0]}</span>)
    last = (m.index ?? 0) + m[0].length
  }
  out.push(code.slice(last))
  if (c >= 0) out.push(<span key="c" className="c">{line.slice(c)}</span>)
  return out
}

export function CodeBlock({ code, name, sql = true }: { code: string; name: string; sql?: boolean }) {
  const [done, setDone] = useState(false)
  async function copy() {
    try { await navigator.clipboard.writeText(code); setDone(true); setTimeout(() => setDone(false), 1500) } catch { /* clipboard blocked: select manually */ }
  }
  return (
    <div className="code">
      <div className="code-bar"><span>{name}</span><button onClick={copy}>{done ? "Copied" : "Copy"}</button></div>
      <pre tabIndex={0}><code>{code.split("\n").map((l, i) => <div key={i} className="ln"><span className="no">{i + 1}</span><span>{sql ? highlight(l) : l}</span></div>)}</code></pre>
    </div>
  )
}
