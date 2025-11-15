"use client"

import { useMemo } from "react"
import useSWR from "swr"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"

interface StockContentProps {
  category: string
}

interface StockItem {
  id: string
  name: string
  column_values: Array<{
    id: string
    title: string
    text: string
    value: string
  }>
}

interface GroupedMaterial {
  materialName: string
  reference: string
  batches: StockItem[]
  totalStock: number
  totalValue: number
  category: string
  supplier: string
  unit: string
}

interface ReferenceMapping {
  referenceSonefi: string
  referenceSellsy: string
  categorie: string
  fournisseur: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function StockContent({ category }: StockContentProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all")
  const [selectedLocation, setSelectedLocation] = useState<string>("all")
  const [showPriceSummary, setShowPriceSummary] = useState(false)

  const { data: stockData, error: stockError } = useSWR(`/api/supabase/stock?category=${category}`, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // Cache for 1 minute
  })

  const { data: referencesData, error: referencesError } = useSWR("/api/references", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000, // Cache for 5 minutes (references change less often)
  })

  const items = stockData?.items || []
  const loading = !stockData && !stockError

  const referenceMappings = useMemo(() => {
    if (!referencesData?.references) return new Map()

    const mappings = new Map<string, ReferenceMapping>()
    referencesData.references.forEach((ref: ReferenceMapping) => {
      mappings.set(ref.referenceSonefi, ref)
    })
    return mappings
  }, [referencesData])

  const getSellsyReference = (sonefiRef: string): string => {
    const mapping = referenceMappings.get(sonefiRef)
    return mapping?.referenceSellsy || ""
  }

  const groupedMaterials = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        const referenceCol = item.column_values.find((col) => col.id === "texte__1")
        const reference = referenceCol?.text || item.name

        if (!acc[reference]) {
          const categoryCol = item.column_values.find((col) => col.id === "label__1")
          const supplierCol = item.column_values.find((col) => col.id === "texte7")
          const unitCol = item.column_values.find((col) => col.id === "texte")

          acc[reference] = {
            materialName: reference,
            reference: reference,
            batches: [],
            totalStock: 0,
            totalValue: 0,
            category: categoryCol?.text || "",
            supplier: supplierCol?.text || "",
            unit: unitCol?.text || "ML",
          }
        }

        const stockCol = item.column_values.find((col) => col.id === "chiffres")
        const unitPriceCol = item.column_values.find((col) => col.id === "chiffres6")
        const stock = Number.parseFloat(stockCol?.text || "0")
        const unitPrice = Number.parseFloat(unitPriceCol?.text || "0")

        acc[reference].batches.push(item)
        acc[reference].totalStock += stock
        acc[reference].totalValue += unitPrice * stock

        return acc
      },
      {} as Record<string, GroupedMaterial>,
    )
  }, [items])

  const materials = useMemo(() => Object.values(groupedMaterials), [groupedMaterials])

  const { uniqueCategories, uniqueSuppliers, uniqueLocations } = useMemo(() => {
    return {
      uniqueCategories: Array.from(new Set(materials.map((m) => m.category).filter(Boolean))).sort(),
      uniqueSuppliers: Array.from(new Set(materials.map((m) => m.supplier).filter(Boolean))).sort(),
      uniqueLocations: Array.from(
        new Set(items.map((item) => item.column_values.find((col) => col.id === "statut")?.text).filter(Boolean)),
      ).sort(),
    }
  }, [materials, items])

  const filteredMaterials = useMemo(() => {
    return materials.filter((material) => {
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch =
        !searchQuery ||
        material.materialName.toLowerCase().includes(searchLower) ||
        material.reference.toLowerCase().includes(searchLower) ||
        material.supplier.toLowerCase().includes(searchLower) ||
        material.batches.some((batch) => batch.name.toLowerCase().includes(searchLower))

      const matchesCategory = selectedCategory === "all" || material.category === selectedCategory
      const matchesSupplier = selectedSupplier === "all" || material.supplier === selectedSupplier
      const matchesLocation =
        selectedLocation === "all" ||
        material.batches.some((batch) => {
          const locationCol = batch.column_values.find((col) => col.id === "statut")
          return locationCol?.text === selectedLocation
        })

      return matchesSearch && matchesCategory && matchesSupplier && matchesLocation
    })
  }, [materials, searchQuery, selectedCategory, selectedSupplier, selectedLocation])

  const getCategoryTitle = () => {
    switch (category) {
      case "matieres-premieres":
        return {
          title: "Matières Premières",
          subtitle: "Gestion des matières de base pour la production",
        }
      case "produits-finis":
        return {
          title: "Produits Finis",
          subtitle: "Gestion des produits finis et semi-finis",
        }
      case "accessoires":
        return {
          title: "Accessoires",
          subtitle: "Gestion des accessoires et composants",
        }
      case "outillages":
        return {
          title: "Outillages",
          subtitle: "Gestion des outils et équipements",
        }
      case "emballages":
        return {
          title: "Emballages",
          subtitle: "Gestion des emballages et conditionnements",
        }
      default:
        return { title: "Stock", subtitle: "" }
    }
  }

  const { title, subtitle } = getCategoryTitle()

  const { totalItems, totalStock, totalValue } = useMemo(() => {
    return {
      totalItems: filteredMaterials.length,
      totalStock: filteredMaterials.reduce((sum, mat) => sum + mat.totalStock, 0),
      totalValue: filteredMaterials.reduce((sum, mat) => sum + mat.totalValue, 0),
    }
  }, [filteredMaterials])

  const lowStock = 0 // TODO: Calculate based on min stock
  const expiringSoon = 0 // TODO: Calculate based on expiry date

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    )
  }

  if (stockError || referencesError) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-destructive">Erreur lors du chargement des données</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{title}</h1>
          <p className="mt-2 text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPriceSummary(!showPriceSummary)}>
            {showPriceSummary ? "Masquer" : "Afficher"} les montants
          </Button>
          <Button className="bg-green-600 hover:bg-green-700">
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            Ajouter une matière
          </Button>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-5 gap-4">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-3">
              <svg
                className="h-6 w-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 11H5m14 0V13m0-2v1m0-2v1m-14 0V9m0 2v1m0-2v1m14 0V5m0 2v1m0-2v1"
                ></path>
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{totalItems}</div>
              <div className="text-sm text-muted-foreground">Matières référencées</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-3">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 11H5m14 0V13m0-2v1m0-2v1m-14 0V9m0 2v1m0-2v1m14 0V5m0 2v1m0-2v1"
                ></path>
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{Math.round(totalStock).toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">ML Total en stock</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-3">
              <svg
                className="h-6 w-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                ></path>
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{Math.round(totalValue).toLocaleString()}€</div>
              <div className="text-sm text-muted-foreground">Valeur totale</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-yellow-100 p-3">
              <svg
                className="h-6 w-6 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                ></path>
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{lowStock}</div>
              <div className="text-sm text-muted-foreground">Stock faible (&lt; 20%)</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-100 p-3">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                ></path>
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{expiringSoon}</div>
              <div className="text-sm text-muted-foreground">Expire sous 3 mois</div>
            </div>
          </div>
        </div>
      </div>

      {showPriceSummary && (
        <div className="mb-6 rounded-lg border border-border bg-card">
          <div className="border-b border-border bg-muted/50 px-6 py-4">
            <h2 className="text-lg font-semibold">Montant total par matière (Prix × Quantité)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Référence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Matière
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Fournisseur
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Stock total
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Prix/unité moyen
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Valeur totale
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredMaterials.map((material) => (
                  <tr key={material.reference} className="hover:bg-muted/50">
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{material.reference}</td>
                    <td className="px-6 py-4 text-sm text-foreground">{material.materialName}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{material.supplier || "N/A"}</td>
                    <td className="px-6 py-4 text-sm text-right text-foreground">
                      {Math.round(material.totalStock).toLocaleString()} {material.unit}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-muted-foreground">
                      {material.totalStock > 0
                        ? `${(material.totalValue / material.totalStock).toFixed(2)}€/${material.unit}`
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-foreground">
                      {Math.round(material.totalValue).toLocaleString()}€
                    </td>
                  </tr>
                ))}
                <tr className="bg-muted/30 font-bold">
                  <td colSpan={5} className="px-6 py-4 text-sm text-right text-foreground">
                    Total général :
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-foreground">
                    {Math.round(totalValue).toLocaleString()}€
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            ></path>
          </svg>
          <Input
            placeholder="Rechercher par nom, référence, fournisseur, batch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setViewMode("grid")}
            className={cn(viewMode === "grid" && "bg-accent")}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3.75 6A2.25 2.25 0 016 3.75h12A2.25 2.25 0 0120.25 6v10.5A2.25 2.25 0 0118 19.25H6A2.25 2.25 0 013.75 17.25V6z"
              ></path>
            </svg>
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setViewMode("list")}
            className={cn(viewMode === "list" && "bg-accent")}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7m0 10a2 2 0 00-2-2H5a2 2 0 00-2 2z"
              ></path>
            </svg>
          </Button>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-4">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Toutes catégories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {uniqueCategories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tous fournisseurs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous fournisseurs</SelectItem>
            {uniqueSuppliers.map((supplier) => (
              <SelectItem key={supplier} value={supplier}>
                {supplier}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Toutes localisations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes localisations</SelectItem>
            {uniqueLocations.map((location) => (
              <SelectItem key={location} value={location}>
                {location}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select defaultValue="name">
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Nom" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Nom</SelectItem>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="stock">Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
        <div>{totalItems} résultats</div>
        <div>Page 1 sur 1</div>
      </div>

      <div className="space-y-4">
        {filteredMaterials.map((material) => {
          const firstBatch = material.batches[0]
          const qualityCol = firstBatch.column_values.find((col) => col.id === "label")
          const dateCol = firstBatch.column_values.find((col) => col.id === "date")
          const laizeCol = firstBatch.column_values.find((col) => col.id === "laize")
          const locationCol = firstBatch.column_values.find((col) => col.id === "statut")
          const sellsyRef = getSellsyReference(material.reference)

          return (
            <div
              key={material.reference}
              className="rounded-lg border border-border bg-card p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-blue-100 p-3">
                    <svg
                      className="h-6 w-6 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 11H5m14 0V13m0-2v1m0-2v1m-14 0V9m0 2v1m0-2v1m14 0V5m0 2v1m0-2v1"
                      ></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{material.materialName}</h3>
                    <div className="mt-2 flex gap-2">
                      {material.category && (
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                          {material.category}
                        </span>
                      )}
                      {qualityCol && (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                          {qualityCol.text}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Prix/unité</div>
                    <div className="text-lg font-semibold text-foreground">
                      {material.totalStock > 0
                        ? `${(material.totalValue / material.totalStock).toFixed(2)}€/${material.unit}`
                        : "N/A"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Montant total</div>
                    <div className="text-xl font-bold text-green-600">
                      {Math.round(material.totalValue).toLocaleString()}€
                    </div>
                  </div>
                  {sellsyRef && (
                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                      {sellsyRef}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-4 gap-6">
                <div>
                  <div className="text-sm text-muted-foreground">Stock</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">
                    {Math.round(material.totalStock)} {material.unit}
                  </div>
                  <div className="text-xs text-green-600">Disponible</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Fournisseur</div>
                  <div className="mt-1 text-sm font-medium text-foreground">{material.supplier || "N/A"}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Localisation</div>
                  <div className="mt-1 text-sm font-medium text-foreground">{locationCol?.text || "N/A"}</div>
                  {dateCol && <div className="text-xs text-muted-foreground">Reçu le {dateCol.text}</div>}
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Valeur</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">
                    {Math.round(material.totalValue).toLocaleString()}€
                  </div>
                  {material.totalStock > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {(material.totalValue / material.totalStock).toFixed(2)}€/{material.unit}
                    </div>
                  )}
                </div>
              </div>

              {material.batches.length >= 1 && (
                <div className="mt-6 border-t border-border pt-4">
                  <div className="mb-3 text-sm font-medium text-foreground">
                    {material.batches.length === 1 ? "Batch" : `Rouleaux (${material.batches.length})`}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {material.batches.map((batch, index) => {
                      const stockCol = batch.column_values.find((col) => col.id === "chiffres")
                      const batchLocationCol = batch.column_values.find((col) => col.id === "statut")
                      const batchLaizeCol = batch.column_values.find((col) => col.id === "laize")

                      return (
                        <div key={batch.id} className="rounded-lg bg-muted/50 p-3 text-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                              <span className="font-medium text-foreground">
                                {batch.name || `R${String(index + 1).padStart(3, "0")}`}
                              </span>
                              <span className="text-xs text-muted-foreground">ID: {batch.id}</span>
                            </div>
                            <span className="text-muted-foreground">
                              {stockCol?.text || "0"} {material.unit}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            {batchLocationCol && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <svg
                                  className="h-3 w-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 11.314z"
                                  ></path>
                                </svg>
                                {batchLocationCol.text}
                              </div>
                            )}
                            {batchLaizeCol && (
                              <div className="text-xs font-medium text-foreground">Laize: {batchLaizeCol.text}</div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filteredMaterials.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">Aucun élément trouvé</p>
        </div>
      )}
    </div>
  )
}
