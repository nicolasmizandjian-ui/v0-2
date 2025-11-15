"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface ChartData {
  name: string
  valeur: number
}

export function ProductionChart() {
  const [data, setData] = useState<ChartData[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const response = await fetch("/api/dashboard/metrics")
      const metrics = await response.json()

      const chartData = [
        { name: "À faire", valeur: metrics.production.commandesAFaire || 0 },
        { name: "Découpe", valeur: metrics.production.commandesDecoupeEnCours || 0 },
        { name: "Confection", valeur: metrics.production.commandesConfection || 0 },
        { name: "Assemblage", valeur: metrics.production.commandesAssemblage || 0 },
        { name: "À expédier", valeur: metrics.production.commandesAExpedier || 0 },
      ]

      setData(chartData)
    } catch (error) {
      console.error("[v0] Error fetching chart data:", error)
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Répartition des commandes par statut</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend />
            <Bar dataKey="valeur" fill="hsl(var(--primary))" name="Nombre de commandes" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
