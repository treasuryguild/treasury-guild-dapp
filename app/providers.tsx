// app/providers.tsx
'use client'

import { MeshProvider } from "@meshsdk/react"
import "@meshsdk/react/styles.css"

export function Providers({ children }: { children: React.ReactNode }) {
  return <MeshProvider>{children}</MeshProvider>
}