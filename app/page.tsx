import { MetricsGrid } from "@/components/dashboard/metrics-grid"
import { WeeklyPlanning } from "@/components/planning/weekly-planning"
import { ProductionChart } from "@/components/dashboard/production-chart"

export default function DashboardPage() {
  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Tableau de bord</h1>
        <p className="mt-2 text-muted-foreground">
          Vue d'ensemble de votre système de production et gestion d'atelier
        </p>
      </div>

      <MetricsGrid />

      <ProductionChart />

      <WeeklyPlanning />
    </div>
  )
}
