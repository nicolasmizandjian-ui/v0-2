"use client"

import { useState, useEffect } from "react"
import { Search, Package } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Correspondence {
  reference_sonefi: string
  reference_sellsy: string
  categorie: string
  fournisseur: string
}

const categoryColors = [
  "bg-blue-50 border-blue-200",
  "bg-green-50 border-green-200",
  "bg-purple-50 border-purple-200",
  "bg-orange-50 border-orange-200",
  "bg-pink-50 border-pink-200",
  "bg-cyan-50 border-cyan-200",
  "bg-amber-50 border-amber-200",
  "bg-indigo-50 border-indigo-200",
]

export default function CorrespondancePage() {
  const [correspondences, setCorrespondences] = useState<Correspondence[]>([])
  const [filteredData, setFilteredData] = useState<Correspondence[]>([])
  const [searchSonefi, setSearchSonefi] = useState("")
  const [searchSellsy, setSearchSellsy] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCorrespondences()
  }, [])

  useEffect(() => {
    filterData()
  }, [searchSonefi, searchSellsy, selectedCategory, correspondences])

  const fetchCorrespondences = async () => {
    try {
      console.log("[v0] Fetching correspondences from API...")
      const response = await fetch("/api/supabase/correspondance")
      console.log("[v0] Response status:", response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Received correspondences:", data.length)
        setCorrespondences(data)
        setFilteredData(data)
      } else {
        console.error("[v0] Failed to fetch correspondences:", response.statusText)
      }
    } catch (error) {
      console.error("[v0] Erreur lors du chargement des correspondances:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterData = () => {
    let filtered = correspondences

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((item) => item.categorie === selectedCategory)
    }

    // Filter by SONEFI reference
    if (searchSonefi) {
      const query = searchSonefi.toLowerCase()
      filtered = filtered.filter((item) =>
        item.reference_sonefi?.toLowerCase().includes(query)
      )
    }

    // Filter by Sellsy reference
    if (searchSellsy) {
      const query = searchSellsy.toLowerCase()
      filtered = filtered.filter((item) =>
        item.reference_sellsy?.toLowerCase().includes(query)
      )
    }

    setFilteredData(filtered)
  }

  const categories = Array.from(new Set(correspondences.map((c) => c.categorie).filter(Boolean)))

  const groupedByCategory = filteredData.reduce(
    (acc, item) => {
      const cat = item.categorie || "Non catégorisé"
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(item)
      return acc
    },
    {} as Record<string, Correspondence[]>,
  )

  const getCategoryColor = (category: string) => {
    const sortedCategories = Object.keys(groupedByCategory).sort()
    const index = sortedCategories.indexOf(category)
    return categoryColors[index % categoryColors.length]
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Chargement des correspondances...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">Correspondance des références</h1>
          <p className="text-sm text-muted-foreground">Recherchez et consultez les références SONEFI et Sellsy</p>
        </div>

        <div className="mt-4 space-y-3">
          {/* Search fields */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher référence SONEFI..."
                value={searchSonefi}
                onChange={(e) => setSearchSonefi(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher référence Sellsy..."
                value={searchSellsy}
                onChange={(e) => setSearchSellsy(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Category dropdown */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-[320px]">
              <SelectValue placeholder="Sélectionner une catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        <div className="mt-4 text-sm text-muted-foreground">
          {filteredData.length} résultat(s) trouvé(s)
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {Object.keys(groupedByCategory).length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-12">
            <Package className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">Aucune correspondance trouvée</p>
            <p className="text-sm text-muted-foreground">Essayez de modifier vos critères de recherche</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByCategory).map(([category, items]) => (
              <div key={category}>
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="text-lg font-semibold">{category}</h2>
                  <Badge variant="secondary">{items.length}</Badge>
                </div>

                <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {items.map((item, index) => (
                    <Card 
                      key={`${item.reference_sonefi}-${index}`} 
                      className={`border-2 p-2 transition-shadow hover:shadow-md ${getCategoryColor(category)}`}
                    >
                      <div className="space-y-1.5">
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">SONEFI</p>
                          <p className="text-sm font-bold text-foreground">
                            {item.reference_sonefi || "—"}
                          </p>
                        </div>

                        <div className="flex items-center justify-center">
                          <div className="h-px flex-1 bg-border" />
                          <div className="mx-1 text-xs text-muted-foreground">↔</div>
                          <div className="h-px flex-1 bg-border" />
                        </div>

                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Sellsy</p>
                          <p className="text-sm font-bold text-foreground">
                            {item.reference_sellsy || "—"}
                          </p>
                        </div>

                        {item.fournisseur && (
                          <div className="border-t border-border pt-1.5">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Fournisseur</p>
                            <p className="text-xs text-foreground">{item.fournisseur}</p>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
