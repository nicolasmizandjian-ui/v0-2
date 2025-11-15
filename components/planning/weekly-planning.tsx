"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Collaborateur {
  id: number
  nom: string
  prenom: string
  poste: string
}

interface ProduitAtelier {
  id: number
  client: string
  reference_article_sonefi: string
  quantite: number
  unite: string
  statut: string
}

interface GroupedProducts {
  [client: string]: ProduitAtelier[]
}

function getWeekNumber(date: Date): number {
  const target = new Date(date.valueOf())
  const dayNr = (date.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNr + 3)
  const firstThursday = target.valueOf()
  target.setMonth(0, 1)
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7)
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000)
}

function getMondayOfWeek(weekOffset: number): Date {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff + (weekOffset * 7))
  return monday
}

function formatDayHeader(date: Date): string {
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
  const day = days[date.getDay()]
  const dateNum = date.getDate()
  const month = date.getMonth() + 1
  return `${day} ${dateNum}/${month}`
}

export function WeeklyPlanning() {
  const [collaborateurs, setCollaborateurs] = useState<Collaborateur[]>([])
  const [produits, setProduits] = useState<ProduitAtelier[]>([])
  const [weekOffset, setWeekOffset] = useState(0)
  const [assignments, setAssignments] = useState<{
    [key: string]: number[]
  }>({})

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      console.log("[v0] Fetching planning data...")
      
      const [collabRes, produitsRes] = await Promise.all([
        fetch("/api/collaborateurs"),
        fetch("/api/planning/produits"),
      ])

      console.log("[v0] Collaborateurs response status:", collabRes.status)
      console.log("[v0] Produits response status:", produitsRes.status)

      const collabData = await collabRes.json()
      const produitsData = await produitsRes.json()

      console.log("[v0] Collaborateurs data:", collabData)
      console.log("[v0] Produits data:", produitsData)

      setCollaborateurs(collabData.collaborateurs || [])
      setProduits(produitsData.produits || [])
      
      console.log("[v0] Set produits count:", produitsData.produits?.length || 0)
    } catch (error) {
      console.error("[v0] Error fetching planning data:", error)
    }
  }

  function toggleOperator(productId: number, dayIndex: number, operatorId: number) {
    const key = `${productId}-${dayIndex}`
    const current = assignments[key] || []
    
    if (current.includes(operatorId)) {
      setAssignments({
        ...assignments,
        [key]: current.filter(id => id !== operatorId)
      })
    } else {
      setAssignments({
        ...assignments,
        [key]: [...current, operatorId]
      })
    }
  }

  function getAssignedOperators(productId: number, dayIndex: number): number[] {
    const key = `${productId}-${dayIndex}`
    return assignments[key] || []
  }

  const groupedProducts: GroupedProducts = produits.reduce((acc, product) => {
    if (!acc[product.client]) {
      acc[product.client] = []
    }
    acc[product.client].push(product)
    return acc
  }, {} as GroupedProducts)

  const currentWeekNumber = getWeekNumber(getMondayOfWeek(weekOffset))
  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const monday = getMondayOfWeek(weekOffset)
    const day = new Date(monday)
    day.setDate(monday.getDate() + i)
    return day
  })

  return (
    <Card className="bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground">Planning d'Atelier</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekOffset(weekOffset - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-foreground px-3">
              Semaine {currentWeekNumber}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekOffset(weekOffset + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Assignez les opérateurs aux articles par jour de la semaine
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-1 bg-muted/50 font-semibold text-foreground sticky left-0 z-10 min-w-[200px]">
                  Client / Article
                </th>
                {weekDays.map((day, idx) => (
                  <th
                    key={idx}
                    className="text-center p-1 bg-muted/50 font-semibold text-foreground min-w-[130px]"
                  >
                    {formatDayHeader(day)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedProducts).map(([client, products]) => (
                <>
                  <tr key={`client-${client}`} className="bg-muted/30">
                    <td
                      colSpan={6}
                      className="py-0.5 px-1 text-xs font-semibold text-foreground sticky left-0 z-10"
                    >
                      {client}
                    </td>
                  </tr>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b hover:bg-muted/20">
                      <td className="py-0.5 px-1 sticky left-0 bg-card z-10">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-foreground">
                            {product.reference_article_sonefi}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({product.quantite} {product.unite})
                          </span>
                        </div>
                      </td>
                      {weekDays.map((_, dayIdx) => {
                        const assignedIds = getAssignedOperators(product.id, dayIdx)
                        const assignedNames = assignedIds
                          .map(id => {
                            const collab = collaborateurs.find(c => c.id === id)
                            return collab ? collab.prenom : ''
                          })
                          .filter(Boolean)
                          .join(', ')

                        return (
                          <td key={dayIdx} className="py-0.5 px-1 text-center">
                            <Select
                              value={assignedIds.length > 0 ? 'assigned' : ''}
                              onValueChange={(value) => {
                                if (value && value !== 'assigned') {
                                  toggleOperator(product.id, dayIdx, parseInt(value))
                                }
                              }}
                            >
                              <SelectTrigger className="h-[14px] text-xs py-0 px-1 w-full max-w-[150px] leading-none">
                                <SelectValue>
                                  {assignedIds.length > 0 ? (
                                    <span className="truncate text-xs leading-none">{assignedNames}</span>
                                  ) : (
                                    '—'
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {collaborateurs.map((collab) => {
                                  const isAssigned = assignedIds.includes(collab.id)
                                  return (
                                    <SelectItem
                                      key={collab.id}
                                      value={collab.id.toString()}
                                      className="flex items-center gap-2 text-xs"
                                    >
                                      <span className={isAssigned ? "font-semibold" : ""}>
                                        {isAssigned ? "✓ " : ""}{collab.prenom}
                                      </span>
                                    </SelectItem>
                                  )
                                })}
                              </SelectContent>
                            </Select>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>

          {Object.keys(groupedProducts).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Aucun produit à planifier pour le moment
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
