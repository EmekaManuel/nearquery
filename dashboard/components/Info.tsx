"use client"
import * as Tooltip from "@radix-ui/react-tooltip"
import type { ReactNode } from "react"

export function Info({ text }: { text: string }) {
  return (
    <Tooltip.Root delayDuration={100}>
      <Tooltip.Trigger asChild><button className="info" aria-label={text}>i</button></Tooltip.Trigger>
      <Tooltip.Portal><Tooltip.Content className="tip" sideOffset={6}>{text}</Tooltip.Content></Tooltip.Portal>
    </Tooltip.Root>
  )
}

export function Tip({ children }: { children: ReactNode }) {
  return <Tooltip.Provider>{children}</Tooltip.Provider>
}
