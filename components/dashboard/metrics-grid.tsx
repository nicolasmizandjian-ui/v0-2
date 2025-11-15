"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Package, TrendingUp, Clock } from 'lucide-react'

interface Metrics {
  production: {
    totalCommandes: number
    commandesAFaire: number
    commandesDecoupeEnCours: number
    commandesConfection: number
    commandesAssemblage: number
    commandesAExpedier: number
    commandesParStatut: Record<string, number>
  }
  stock: {
    valeurStockMatieres: number
    valeurStockProduitsFinis: number
    valeurTotale: number
  }
  performance: {
    produitsTraites7j: number
    tempsMoyenDecoupe: number
    tempsMoyenConfection: number
    tempsMoyenAssemblage: number
  }
}

export function MetricsGrid() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchMetrics() {
    try {
      const response = await fetch("/api/dashboard/metrics")
      const data = await response.json()
      setMetrics(data)
    } catch (error) {
      console.error("Error fetching metrics:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !metrics) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chargement...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const { production, stock, performance } = metrics

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Commandes en cours
          </CardTitle>
          <Activity className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">{production.totalCommandes}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {production.commandesAFaire} à faire, {production.commandesDecoupeEnCours} en découpe
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Valeur du stock
          </CardTitle>
          <Package className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">
            {stock.valeurTotale.toLocaleString("fr-FR")} €
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Matières: {stock.valeurStockMatieres.toLocaleString("fr-FR")} €
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Produits traités (7j)
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">{performance.produitsTraites7j}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Moyenne hebdomadaire
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Temps moyen découpe
          </CardTitle>
          <Clock className="h-4 w-4 text-violet-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">
            {performance.tempsMoyenDecoupe} min
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Confection: {performance.tempsMoyenConfection} min
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
