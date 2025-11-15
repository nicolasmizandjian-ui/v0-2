"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Filter } from "lucide-react"

export function StockFilters() {
  return (
    <div className="mb-6 flex items-center gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Rechercher par référence ou désignation..." className="pl-10" />
      </div>
      <Button variant="outline">
        <Filter className="h-4 w-4 mr-2" />
        Filtres
      </Button>
    </div>
  )
}
