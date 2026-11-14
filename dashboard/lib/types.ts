export interface DailyRow { date: string; legSum: number | null; netSwap: number | null; intents: number | null; usdPerIntent: number | null }
export interface MonthlyRow { month: string; top1: number | null; top5: number | null; solvers: number | null; users: number | null; repeatPct: number | null; nearTouchPct: number | null; highFreqPct: number | null; roundTripPct: number | null }
export interface WeeklyRow { week: string; confidentialPct: number }
export interface Scenario { case: string; volumeMultiple: number; annualBuyback: number; pctOfMarketCap: number; takeBps: number }
export interface Dashboard {
  meta: { cutoff: string; cacheStart: string; windowStart: string; windowEnd: string; generated: string }
  daily: DailyRow[]
  monthly: MonthlyRow[]
  weekly: WeeklyRow[]
  flows: { month: string; rows: { pair: string; usd: number }[] }
  peers: { rows: { pair: string; usd: number }[] }
  obs: { netSwap30d: number; legSum30d: number; confidentialShare: number; grossBps: number; capturedBps: number; capturedShare: number; revenueAnnual: number; buybackYield: number; gasBurnAnnual: number; nearPrice: number; marketCap: number }
  scenarios: Scenario[]
  accounts: { implicitOneDayShare: number; implicitSingleEntryShare: number; implicitAccounts: number }
  facts: { intentsAugToOctChange: number; confidentialBreakDate: string; yieldTrigger: number }
}
