import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(process.cwd(), "..")
export const readRepoFile = (rel: string): string => readFileSync(join(root, rel), "utf8")
export const readSql = (file: string): string => readRepoFile(`pipeline/sql/${file}`).trimEnd()
