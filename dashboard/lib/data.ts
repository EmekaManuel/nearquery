import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { Dashboard } from "./types"

// Read at build time only; the file is produced by `python -m dashboard.build`.
export function loadDashboard(): Dashboard {
  return JSON.parse(readFileSync(join(process.cwd(), "data", "dashboard.json"), "utf8")) as Dashboard
}
