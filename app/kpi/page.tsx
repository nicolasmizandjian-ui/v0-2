import { Suspense } from "react"
import { KpiCards } from "@/components/kpi/kpi-cards"

export default function KpiPage() {
  return (
    <div className="flex h-screen flex-col">
      <div className="border-b border-border bg-card px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground">Indicateurs clés de performance</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <Suspense fallback={<div>Chargement...</div>}>
          <KpiCards />
        </Suspense>
      </div>
    </div>
  )
}
