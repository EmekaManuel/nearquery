import type { Metadata } from "next"
import { ChartGrid } from "@/components/ChartGrid"
import { PageHead } from "@/components/PageHead"
import { inGroup } from "@/lib/charts"
import { loadDashboard } from "@/lib/data"

export const metadata: Metadata = { title: "Market structure" }

export default function Page() {
  return (
    <>
      <PageHead title="Market structure" lede="Who settles the swaps, which chains they connect, and how much of it involves NEAR itself." />
      <ChartGrid charts={inGroup("market")} d={loadDashboard()} />
    </>
  )
}
