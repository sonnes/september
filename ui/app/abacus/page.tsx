"use client"

import { useState } from "react"
import { AbacusDictation } from "@/components/abacus/dictation"

export default function AbacusPage() {
  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Abacus Dictation</h1>
          <p className="text-muted-foreground mt-2">
            Practice mental arithmetic with audio dictation
          </p>
        </div>
        <AbacusDictation />
      </div>
    </div>
  )
} 