"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronDown, ChevronUp, Package, MapPin, Search, Euro, TrendingUp } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type StockBatch = {
  id: string
  batch_sonefi: string
  quantite: number
  emplacement: string | null
  date_entree: string | null
  batch_fournisseur: string | null
  prix_unitaire_ht: number | null
}

type StockItem = {
  reference_sonefi: string
  reference_sellsy: string | null
  designation: string
  category: string
  supplier: string | null
  unit: string
  total_quantity: number
  batches: StockBatch[]
  prix_unitaire_ht: number | null
}

interface StockTableProps {
  category?: string
}

export function StockTable({ category = "matieres-premieres" }: StockTableProps) {
  const [stock, setStock] = useState<StockItem[]>([])
  const [filteredStock, setFilteredStock] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [suppliers, setSuppliers] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])

  const getCategoryParam = (tabId: string): string => {
    const mapping: Record<string, string> = {
      "matieres-premieres": "matieres-premieres",
      "produits-finis": "produits-finis",
      accessoires: "accessoires",
      outillages: "all",
      emballages: "all",
    }
    return mapping[tabId] || "all"
  }

  const toggleExpand = (reference: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(reference)) {
        next.delete(reference)
      } else {
        next.add(reference)
      }
      return next
    })
  }

  useEffect(() => {
    let filtered = [...stock]

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.reference_sonefi.toLowerCase().includes(query) ||
          (item.reference_sellsy && item.reference_sellsy.toLowerCase().includes(query)),
      )
    }

    if (selectedSupplier !== "all") {
      filtered = filtered.filter((item) => item.supplier === selectedSupplier)
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter((item) => item.category === selectedCategory)
    }

    setFilteredStock(filtered)
  }, [stock, searchQuery, selectedSupplier, selectedCategory])

  useEffect(() => {
    async function fetchStock() {
      try {
        setLoading(true)
        const categoryParam = getCategoryParam(category)
        console.log("[v0] Fetching stock for category:", categoryParam)

        const response = await fetch(`/api/supabase/stock?category=${categoryParam}`)
        if (!response.ok) throw new Error("Failed to fetch stock")

        const data = await response.json()
        const items = data.items || []

        console.log("[v0] Received items:", items.length)

        const grouped = items.reduce((acc: Record<string, StockItem>, item: any) => {
          const reference = item.name || item.id
          const categoryCol = item.column_values.find((col: any) => col.id === "label__1")
          const supplierCol = item.column_values.find((col: any) => col.id === "texte7")
          const unitCol = item.column_values.find((col: any) => col.id === "texte")
          const stockCol = item.column_values.find((col: any) => col.id === "chiffres")
          const batchCol = item.column_values.find((col: any) => col.id === "texte0")
          const locationCol = item.column_values.find((col: any) => col.id === "texte8")
          const dateCol = item.column_values.find((col: any) => col.id === "date4")
          const batchFournisseurCol = item.column_values.find((col: any) => col.id === "texte9")
          const sellsyCol = item.column_values.find((col: any) => col.id === "texte1")
          const priceCol = item.column_values.find((col: any) => col.id === "chiffres6")

          const quantity = Number.parseFloat(stockCol?.text || "0")
          const prix = Number.parseFloat(priceCol?.text || "0")

          if (!acc[reference]) {
            acc[reference] = {
              reference_sonefi: reference,
              reference_sellsy: sellsyCol?.text || null,
              designation: reference,
              category: categoryCol?.text || "",
              supplier: supplierCol?.text || null,
              unit: unitCol?.text || "ML",
              total_quantity: 0,
              batches: [],
              prix_unitaire_ht: prix > 0 ? prix : null,
            }
          }

          acc[reference].total_quantity += quantity
          acc[reference].batches.push({
            id: item.id,
            batch_sonefi: batchCol?.text || item.id,
            quantite: quantity,
            emplacement: locationCol?.text || null,
            date_entree: dateCol?.text || null,
            batch_fournisseur: batchFournisseurCol?.text || null,
            prix_unitaire_ht: prix > 0 ? prix : null,
          })

          return acc
        }, {})

        const stockItems = Object.values(grouped)
        setStock(stockItems)

        const uniqueSuppliers = Array.from(
          new Set(stockItems.map((item) => item.supplier).filter((s): s is string => s !== null)),
        ).sort()
        setSuppliers(uniqueSuppliers)

        const uniqueCategories = Array.from(
          new Set(stockItems.map((item) => item.category).filter((c): c is string => c !== "")),
        ).sort()
        setCategories(uniqueCategories)
      } catch (error) {
        console.error("[v0] Error fetching stock:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStock()
  }, [category])

  if (loading) {
    return <div className="text-center py-8">Chargement du stock...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Rechercher par référence Sonefi ou Sellsy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Toutes les catégories" />
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
        <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Tous les fournisseurs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les fournisseurs</SelectItem>
            {suppliers.map((supplier) => (
              <SelectItem key={supplier} value={supplier}>
                {supplier}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredStock.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {searchQuery || selectedSupplier !== "all" || selectedCategory !== "all"
            ? "Aucun produit ne correspond aux filtres"
            : "Aucun produit en stock"}
        </div>
      ) : (
        filteredStock.map((item) => {
          const isExpanded = expandedItems.has(item.reference_sonefi)
          const percentage = 100
          const totalStockValue = item.prix_unitaire_ht && item.prix_unitaire_ht > 0 
            ? item.total_quantity * item.prix_unitaire_ht 
            : null

          return (
            <Card
              key={item.reference_sonefi}
              className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center text-white">
                      <Package className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{item.designation}</h3>
                      <p className="text-sm text-gray-500">Réf. Sonefi: {item.reference_sonefi}</p>
                      {item.reference_sellsy && (
                        <p className="text-sm text-gray-500">Réf. Sellsy: {item.reference_sellsy}</p>
                      )}
                      <div className="flex gap-2 mt-2">
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                          {item.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    {totalStockValue !== null && (
                      <div className="flex items-start gap-2 bg-amber-50 px-4 py-3 rounded-lg border border-amber-200">
                        <TrendingUp className="w-6 h-6 text-amber-600 mt-0.5" />
                        <div>
                          <p className="text-xs text-amber-700 font-medium">Valeur totale stock</p>
                          <p className="text-2xl font-bold text-amber-800">
                            {totalStockValue.toFixed(2)} €
                          </p>
                        </div>
                      </div>
                    )}
                    {item.prix_unitaire_ht !== null && item.prix_unitaire_ht > 0 && (
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Prix unitaire HT</p>
                        <p className="text-sm font-medium text-gray-700">
                          {item.prix_unitaire_ht.toFixed(2)} € / {item.unit}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <Package className="w-4 h-4" />
                      <span>Stock</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">
                      {item.total_quantity.toFixed(0)} {item.unit}
                    </p>
                    <p className="text-xs text-green-600">{percentage.toFixed(1)}% disponible</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <Package className="w-4 h-4" />
                      <span>Fournisseur</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{item.supplier || "-"}</p>
                    {item.batches[0]?.batch_fournisseur && (
                      <p className="text-xs text-gray-500">Batch: {item.batches[0].batch_fournisseur}</p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <MapPin className="w-4 h-4" />
                      <span>Localisation</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{item.batches[0]?.emplacement || "-"}</p>
                    {item.batches[0]?.date_entree && (
                      <p className="text-xs text-gray-500">Reçu le {item.batches[0].date_entree}</p>
                    )}
                  </div>
                </div>

                {item.batches.length > 1 && (
                  <div className="border-t pt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(item.reference_sonefi)}
                      className="w-full justify-between hover:bg-gray-50"
                    >
                      <span className="font-medium text-gray-700">Lots ({item.batches.length})</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>

                    {isExpanded && (
                      <div className="mt-4 space-y-2">
                        {item.batches.map((batch, index) => (
                          <div
                            key={batch.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <div>
                              <p className="font-medium text-gray-900">Lot {index + 1}</p>
                              <p className="text-sm text-gray-600">
                                {batch.quantite.toFixed(0)} {item.unit} - {batch.emplacement || "Sans emplacement"}
                              </p>
                              {batch.batch_fournisseur && (
                                <p className="text-xs text-gray-500">Batch: {batch.batch_fournisseur}</p>
                              )}
                            </div>
                            <Badge variant="outline" className="bg-white">
                              {batch.batch_sonefi}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {item.batches.length === 1 && (
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div>
                        <p className="font-medium text-gray-900">Lot unique</p>
                        <p className="text-sm text-gray-600">
                          {item.batches[0].quantite.toFixed(0)} {item.unit} -{" "}
                          {item.batches[0].emplacement || "Sans emplacement"}
                        </p>
                        {item.batches[0].batch_fournisseur && (
                          <p className="text-xs text-gray-500">Batch: {item.batches[0].batch_fournisseur}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="bg-white">
                        {item.batches[0].batch_sonefi}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
