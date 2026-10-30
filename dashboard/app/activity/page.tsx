import type { Metadata } from "next"
import { ChartGrid } from "@/components/ChartGrid"
import { PageHead } from "@/components/PageHead"
import { inGroup } from "@/lib/charts"
import { loadDashboard } from "@/lib/data"

export const metadata: Metadata = { title: "Activity" }

export default function Page() {
  return (
    <>
      <PageHead title="Activity" lede="Volume and intent counts on the public side, and why account counts cannot stand in for users." />
      <ChartGrid charts={inGroup("activity")} d={loadDashboard()} />
    </>
  )
}
