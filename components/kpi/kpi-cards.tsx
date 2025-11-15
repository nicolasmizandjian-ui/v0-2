"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Package, ArrowDownRight, Calendar } from "lucide-react"

type KpiData = {
  stock_value_total: number
  ml_total: number
  sortants_7j: number
  sortants_30j: number
}

export function KpiCards() {
  const [kpi, setKpi] = useState<KpiData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchKpi() {
      try {
        const supabase = await createClient()
        const { data, error } = await supabase.from("v_kpi").select("*").single()

        if (error) throw error
        setKpi(data)
      } catch (error) {
        console.error("[v0] Error fetching KPI:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchKpi()
  }, [])

  if (loading) {
    return <div className="text-center py-8">Chargement des KPI...</div>
  }

  if (!kpi) {
    return <div className="text-center py-8">Données non disponibles</div>
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Valeur du stock</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {new Intl.NumberFormat("fr-FR", {
              style: "currency",
              currency: "EUR",
            }).format(kpi.stock_value_total)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">ML total</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{new Intl.NumberFormat("fr-FR").format(kpi.ml_total)} ML</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sorties 7j</CardTitle>
          <ArrowDownRight className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{new Intl.NumberFormat("fr-FR").format(kpi.sortants_7j)} ML</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sorties 30j</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{new Intl.NumberFormat("fr-FR").format(kpi.sortants_30j)} ML</div>
        </CardContent>
      </Card>
    </div>
  )
}
