"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Package, Wrench, Box, ShoppingBag, Archive, CheckCircle2 } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"

interface MovementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type MovementType = "ENTREE" | "SORTIE" | "CONSOMMATION" | "AJUSTEMENT"

type StockCategory = "matieres_premieres" | "produits_finis" | "accessoires" | "outillages" | "emballages"

type StockProduct = {
  reference_sonefi: string
  reference_sellsy: string | null
  batches: Array<{
    id: string
    batch_sonefi: string
    quantite: number
  }>
}

type MaterialCategory = {
  categorie: string
  code_categorie: string | null
  famille: string | null
}

type Material = {
  reference_sonefi: string
  reference_sellsy: string | null
  categorie: string
  fournisseur: string | null
  batches: Array<{
    batch_sonefi: string | number
    quantite: number
    fournisseur: string | null
    laize?: number | null
    unite?: string | null
  }>
}

export function MovementDialog({ open, onOpenChange }: MovementDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState<StockCategory | "">("")
  const [materialCategory, setMaterialCategory] = useState<string>("")
  const [materialCategories, setMaterialCategories] = useState<MaterialCategory[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [products, setProducts] = useState<StockProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [selectedProduct, setSelectedProduct] = useState<string>("")
  const [selectedBatch, setSelectedBatch] = useState<string>("")
  const [movementType, setMovementType] = useState<MovementType>("ENTREE")
  const [quantity, setQuantity] = useState<string>("")
  const [note, setNote] = useState<string>("")

  const [batchFournisseur, setBatchFournisseur] = useState<string>("")
  const [fournisseur, setFournisseur] = useState<string>("")
  const [generatedBatch, setGeneratedBatch] = useState<string>("")
  const [laize, setLaize] = useState<string>("")
  const [unite, setUnite] = useState<"ML" | "M2" | "unite">("ML")

  const [decoupeType, setDecoupeType] = useState<"normale" | "delaizage">("normale")
  const [laizeEnlevee, setLaizeEnlevee] = useState<string>("")

  const [emplacement, setEmplacement] = useState<string>("")
  const [prixHT, setPrixHT] = useState<string>("")

  const [showConfirmation, setShowConfirmation] = useState(false)

  useEffect(() => {
    if (open && selectedCategory === "matieres_premieres") {
      fetchMaterialCategories()
    }
  }, [open, selectedCategory])

  useEffect(() => {
    if (open && selectedCategory === "matieres_premieres" && materialCategory) {
      if (movementType === "ENTREE") {
        // For entries, fetch from table_matiere (catalog)
        fetchMaterials()
      } else {
        // For Sortie/Consommation/Ajustement, fetch from stock
        fetchMaterialsStock()
      }
    }
  }, [open, selectedCategory, materialCategory, movementType])

  useEffect(() => {
    if (open && selectedCategory && selectedCategory !== "matieres_premieres") {
      fetchProducts()
    }
  }, [open, selectedCategory])

  useEffect(() => {
    if (!open) {
      setSelectedCategory("")
      setMaterialCategory("")
      setSelectedProduct("")
      setSelectedBatch("")
      setMovementType("ENTREE")
      setQuantity("")
      setNote("")
      setProducts([])
      setMaterials([])
      setMaterialCategories([])
      setBatchFournisseur("")
      setFournisseur("")
      setGeneratedBatch("")
      setLaize("")
      setUnite("ML")
      setDecoupeType("normale")
      setLaizeEnlevee("")
      setEmplacement("")
      setPrixHT("")
      setShowConfirmation(false)
    }
  }, [open])

  useEffect(() => {
    if (selectedCategory === "matieres_premieres" && movementType === "ENTREE" && selectedProduct && !generatedBatch) {
      generateUniqueBatch()
    }
  }, [selectedCategory, movementType, selectedProduct])

  const fetchMaterialCategories = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/supabase/categories")
      if (!response.ok) throw new Error("Failed to fetch categories")

      const data = await response.json()
      setMaterialCategories(data.categories || [])
    } catch (error) {
      console.error("[v0] Error fetching material categories:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMaterials = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/supabase/materials?category=${encodeURIComponent(materialCategory)}`)
      if (!response.ok) throw new Error("Failed to fetch materials")

      const data = await response.json()
      setMaterials(data.materials || [])
    } catch (error) {
      console.error("[v0] Error fetching materials:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMaterialsStock = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/supabase/materials-stock?category=${encodeURIComponent(materialCategory)}`)
      if (!response.ok) throw new Error("Failed to fetch materials stock")

      const data = await response.json()
      setMaterials(data.materials || [])
    } catch (error) {
      console.error("[v0] Error fetching materials stock:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/supabase/stock?category=${selectedCategory}`)
      if (!response.ok) throw new Error("Failed to fetch products")

      const data = await response.json()
      const items = data.items || []

      // Group by reference_sonefi
      const grouped = items.reduce((acc: Record<string, StockProduct>, item: any) => {
        const reference = item.name || item.id
        const sellsyCol = item.column_values.find((col: any) => col.id === "texte1")
        const stockCol = item.column_values.find((col: any) => col.id === "chiffres")
        const batchCol = item.column_values.find((col: any) => col.id === "texte0")

        if (!acc[reference]) {
          acc[reference] = {
            reference_sonefi: reference,
            reference_sellsy: sellsyCol?.text || null,
            batches: [],
          }
        }

        acc[reference].batches.push({
          id: item.id,
          batch_sonefi: batchCol?.text || item.id,
          quantite: Number.parseFloat(stockCol?.text || "0"),
        })

        return acc
      }, {})

      setProducts(Object.values(grouped))
    } catch (error) {
      console.error("[v0] Error fetching products:", error)
    } finally {
      setLoading(false)
    }
  }

  const generateUniqueBatch = async () => {
    try {
      const timestamp = Date.now()
      const random = Math.floor(Math.random() * 1000)
      const newBatch = `BATCH-${timestamp}-${random}`
      setGeneratedBatch(newBatch)
    } catch (error) {
      console.error("[v0] Error generating batch:", error)
    }
  }

  const handlePrepareSubmit = () => {
    if (selectedCategory === "matieres_premieres" && movementType === "ENTREE") {
      if (!batchFournisseur || !fournisseur || !laize || !quantity || Number.parseFloat(quantity) <= 0) {
        alert("Veuillez remplir tous les champs obligatoires pour l'entrée de matière")
        return
      }
    } else if (!selectedProduct || !selectedBatch) {
      alert("Veuillez sélectionner un produit et un batch")
      return
    }

    if (movementType === "AJUSTEMENT") {
      if (!emplacement && !prixHT) {
        alert("Veuillez renseigner au moins le prix ou l'emplacement pour l'ajustement")
        return
      }
      // Skip to confirmation, no quantity validation needed
      setShowConfirmation(true)
      return
    }

    if (
      selectedCategory === "matieres_premieres" &&
      (movementType === "SORTIE" || movementType === "CONSOMMATION") &&
      decoupeType === "delaizage"
    ) {
      if (!laizeEnlevee) {
        alert("Veuillez indiquer la laize découpée (largeur enlevée)")
        return
      }

      const laizeDecoupee = Number.parseFloat(laizeEnlevee)
      const laizeOriginale = selectedBatchData?.laize || 0

      if (laizeDecoupee >= laizeOriginale || laizeDecoupee <= 0) {
        alert(
          `Erreur : La laize découpée (${laizeDecoupee}mm) doit être supérieure à 0 et inférieure à la laize d'origine (${laizeOriginale}mm)`,
        )
        return
      }
    } else {
      if (!quantity || Number.parseFloat(quantity) <= 0) {
        alert("Veuillez saisir une quantité valide")
        return
      }

      if (movementType === "SORTIE" || movementType === "CONSOMMATION") {
        const quantityRequested = Number.parseFloat(quantity)
        const availableStock = selectedBatchData?.quantite || 0

        if (quantityRequested > availableStock) {
          alert(
            `Quantité insuffisante en stock.\nStock disponible : ${availableStock.toFixed(2)} ${selectedBatchData?.unite || ""}\nQuantité demandée : ${quantityRequested.toFixed(2)} ${selectedBatchData?.unite || ""}`,
          )
          return
        }
      }
    }

    setShowConfirmation(true)
  }

  const handleConfirmSubmit = async () => {
    try {
      setSubmitting(true)

      const payload =
        selectedCategory === "matieres_premieres" && movementType === "ENTREE"
          ? {
              category: "matieres_premieres",
              material_reference: selectedProduct,
              type: movementType,
              batch_fournisseur: batchFournisseur,
              fournisseur: fournisseur,
              batch_sonefi: generatedBatch,
              laize: Number.parseFloat(laize),
              quantite: Number.parseFloat(quantity),
              unite: unite,
              note: note.trim() || undefined,
            }
          : movementType === "AJUSTEMENT"
            ? // For adjustments, don't send qty at all
              {
                product_id: selectedBatch,
                type: movementType,
                note: note.trim() || undefined,
                category: selectedCategory,
                emplacement: emplacement.trim() || undefined,
                prixHT: prixHT ? Number.parseFloat(prixHT) : undefined,
                unite: unite,
              }
            : {
                product_id: selectedBatch,
                type: movementType,
                qty: quantity ? Number.parseFloat(quantity) : undefined,
                note: note.trim() || undefined,
                category: selectedCategory,
                ...(selectedCategory === "matieres_premieres" &&
                  (movementType === "SORTIE" || movementType === "CONSOMMATION") && {
                    decoupe_type: decoupeType,
                    laize_enlevee: laizeEnlevee ? Number.parseFloat(laizeEnlevee) : undefined,
                  }),
              }

      console.log("[v0] Sending movement payload:", payload)

      const response = await fetch("/api/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create movement")
      }

      setSelectedCategory("")
      setMaterialCategory("")
      setSelectedProduct("")
      setSelectedBatch("")
      setMovementType("ENTREE")
      setQuantity("")
      setNote("")
      setBatchFournisseur("")
      setFournisseur("")
      setGeneratedBatch("")
      setLaize("")
      setUnite("ML")
      setDecoupeType("normale")
      setLaizeEnlevee("")
      setEmplacement("")
      setPrixHT("")
      setShowConfirmation(false)

      alert("Mouvement ajouté avec succès")
      onOpenChange(false)

      window.location.reload()
    } catch (error) {
      console.error("[v0] Error creating movement:", error)
      alert(error instanceof Error ? error.message : "Erreur lors de l'ajout du mouvement")
    } finally {
      setSubmitting(false)
    }
  }

  const selectedProductData =
    selectedCategory === "matieres_premieres"
      ? materials.find((m) => m.reference_sonefi === selectedProduct)
      : products.find((p) => p.reference_sonefi === selectedProduct)

  const selectedBatchData = selectedProductData?.batches.find(
    (b) => String(b.batch_sonefi) === selectedBatch || (b as any).id === selectedBatch,
  )

  const categories = [
    { value: "matieres_premieres", label: "Matières premières", icon: Archive },
    { value: "produits_finis", label: "Produits Finis", icon: Package },
    { value: "accessoires", label: "Accessoires", icon: ShoppingBag },
    { value: "outillages", label: "Outillages", icon: Wrench },
    { value: "emballages", label: "Emballages", icon: Box },
  ]

  const isMatierePremierEntree = selectedCategory === "matieres_premieres" && movementType === "ENTREE"
  const isMatierePremierSortieConsommation =
    selectedCategory === "matieres_premieres" && (movementType === "SORTIE" || movementType === "CONSOMMATION")

  const isMatierePremiere = selectedCategory === "matieres_premieres"

  const rawMaterialLocations = [
    "RD",
    "RD1",
    "RD2",
    "RD3",
    "RGH11",
    "RGH12",
    "RGH13",
    "RGH14",
    "RDH11",
    "RDH12",
    "RDH13",
    "RDH14",
    "RGH21",
    "RGH22",
    "RGH23",
    "RGH24",
    "RDH21",
    "RDH22",
    "RDH23",
    "RDH24",
    "RGH31",
    "RGH32",
    "RGH33",
    "RGH34",
    "RDH31",
    "RDH32",
    "RDH33",
    "RDH34",
    "DV",
    "TDH",
    "CTN",
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {showConfirmation ? "Confirmer le mouvement de stock" : "Ajouter un mouvement de stock"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {showConfirmation ? (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold text-blue-900">Résumé du mouvement</h3>

                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-medium">Type :</span>{" "}
                        {movementType === "ENTREE"
                          ? "Entrée"
                          : movementType === "SORTIE"
                            ? "Sortie"
                            : movementType === "CONSOMMATION"
                              ? "Consommation"
                              : "Ajustement"}
                      </p>
                      <p>
                        <span className="font-medium">Catégorie :</span>{" "}
                        {categories.find((c) => c.value === selectedCategory)?.label}
                      </p>
                      {selectedCategory === "matieres_premieres" && materialCategory && (
                        <p>
                          <span className="font-medium">Catégorie matière :</span> {materialCategory}
                        </p>
                      )}
                      <p>
                        <span className="font-medium">
                          {selectedCategory === "matieres_premieres" ? "Matière" : "Produit"} :
                        </span>{" "}
                        {selectedProduct}
                        {selectedProductData?.reference_sellsy && ` (${selectedProductData.reference_sellsy})`}
                      </p>

                      {isMatierePremierEntree ? (
                        <>
                          <p>
                            <span className="font-medium">Batch Fournisseur :</span> {batchFournisseur}
                          </p>
                          <p>
                            <span className="font-medium">Fournisseur :</span> {fournisseur}
                          </p>
                          <p>
                            <span className="font-medium">Batch SONEFI :</span> {generatedBatch}
                          </p>
                          <p>
                            <span className="font-medium">Laize :</span> {laize} mm
                          </p>
                          <p>
                            <span className="font-medium">Quantité :</span> {quantity} {unite}
                          </p>
                        </>
                      ) : (
                        <>
                          <p>
                            <span className="font-medium">Batch :</span> {selectedBatchData?.batch_sonefi}
                          </p>
                          {selectedBatchData?.fournisseur && (
                            <p>
                              <span className="font-medium">Fournisseur :</span> {selectedBatchData.fournisseur}
                            </p>
                          )}
                          {selectedBatchData?.laize && (
                            <p>
                              <span className="font-medium">Laize :</span> {selectedBatchData.laize} mm
                            </p>
                          )}
                          <p>
                            <span className="font-medium">Quantité :</span> {quantity}
                            {selectedBatchData?.unite && ` ${selectedBatchData.unite}`}
                          </p>
                          {isMatierePremierSortieConsommation && (
                            <>
                              <p>
                                <span className="font-medium">Type de découpe :</span>{" "}
                                {decoupeType === "normale" ? "Découpe normale" : "Délaizage"}
                              </p>
                              {decoupeType === "delaizage" && laizeEnlevee && selectedBatchData?.laize && (
                                <>
                                  <p>
                                    <span className="font-medium">Laize enlevée :</span> {laizeEnlevee} mm
                                  </p>
                                  <p>
                                    <span className="font-medium">Nouvelle laize :</span>{" "}
                                    {selectedBatchData.laize - Number.parseFloat(laizeEnlevee)} mm
                                  </p>
                                </>
                              )}
                            </>
                          )}
                          {movementType === "AJUSTEMENT" && (
                            <>
                              {emplacement && (
                                <p>
                                  <span className="font-medium">Emplacement :</span> {emplacement}
                                </p>
                              )}
                              {prixHT && (
                                <p>
                                  <span className="font-medium">Prix HT :</span> {prixHT} € /{" "}
                                  {selectedBatchData?.unite || "unité"}
                                </p>
                              )}
                            </>
                          )}
                        </>
                      )}

                      {note && (
                        <p>
                          <span className="font-medium">Note :</span> {note}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowConfirmation(false)} disabled={submitting}>
                  Retour
                </Button>
                <Button onClick={handleConfirmSubmit} disabled={submitting} className="bg-green-600 hover:bg-green-700">
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Validation en cours...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Valider le mouvement
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {!selectedCategory ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Sélectionnez d'abord une catégorie de produits :</p>
                  <div className="grid grid-cols-1 gap-3">
                    {categories.map((category) => {
                      const Icon = category.icon
                      return (
                        <Button
                          key={category.value}
                          variant="outline"
                          className="h-auto py-4 justify-start text-left bg-transparent"
                          onClick={() => setSelectedCategory(category.value as StockCategory)}
                        >
                          <Icon className="h-5 w-5 mr-3" />
                          <span className="text-base">{category.label}</span>
                        </Button>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const Icon = categories.find((c) => c.value === selectedCategory)?.icon || Package
                        return <Icon className="h-5 w-5 text-blue-600" />
                      })()}
                      <span className="text-sm font-medium text-blue-900">
                        {categories.find((c) => c.value === selectedCategory)?.label}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedCategory("")
                        setMaterialCategory("")
                        setSelectedProduct("")
                        setSelectedBatch("")
                      }}
                    >
                      Changer de catégorie
                    </Button>
                  </div>

                  {selectedCategory === "matieres_premieres" && !materialCategory && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">Sélectionnez la catégorie de matière :</p>
                      {loading ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        </div>
                      ) : (
                        <Select value={materialCategory} onValueChange={setMaterialCategory}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choisir une catégorie" />
                          </SelectTrigger>
                          <SelectContent>
                            {materialCategories.map((cat) => (
                              <SelectItem key={cat.categorie} value={cat.categorie}>
                                {cat.categorie}
                                {cat.code_categorie && ` (${cat.code_categorie})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}

                  {(selectedCategory !== "matieres_premieres" || materialCategory) && (
                    <>
                      {selectedCategory === "matieres_premieres" && materialCategory && (
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <span className="text-sm font-medium text-green-900">Catégorie : {materialCategory}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setMaterialCategory("")
                              setSelectedProduct("")
                              setSelectedBatch("")
                            }}
                          >
                            Changer
                          </Button>
                        </div>
                      )}

                      <div>
                        <Label htmlFor="product">
                          {selectedCategory === "matieres_premieres" ? "Matière" : "Produit"} *
                        </Label>
                        <Select
                          value={selectedProduct}
                          onValueChange={(value) => {
                            setSelectedProduct(value)
                            setSelectedBatch("")
                            setGeneratedBatch("")
                          }}
                        >
                          <SelectTrigger id="product">
                            <SelectValue
                              placeholder={`Sélectionner ${selectedCategory === "matieres_premieres" ? "une matière" : "un produit"}`}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedCategory === "matieres_premieres"
                              ? materials.map((material) => (
                                  <SelectItem key={material.reference_sonefi} value={material.reference_sonefi}>
                                    {material.reference_sonefi}
                                    {material.reference_sellsy && ` - ${material.reference_sellsy}`}
                                  </SelectItem>
                                ))
                              : products.map((product) => (
                                  <SelectItem key={product.reference_sonefi} value={product.reference_sonefi}>
                                    {product.reference_sonefi}
                                    {product.reference_sellsy && ` (${product.reference_sellsy})`}
                                  </SelectItem>
                                ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="movementType">Type de mouvement *</Label>
                        <Select
                          value={movementType}
                          onValueChange={(value) => {
                            setMovementType(value as MovementType)
                            setGeneratedBatch("")
                          }}
                        >
                          <SelectTrigger id="movementType">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ENTREE">Entrée (ajout de stock)</SelectItem>
                            <SelectItem value="SORTIE">Sortie</SelectItem>
                            <SelectItem value="CONSOMMATION">Consommation</SelectItem>
                            <SelectItem value="AJUSTEMENT">Ajustement / Rectification</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {isMatierePremierEntree ? (
                        <>
                          <div>
                            <Label htmlFor="batchFournisseur">Batch Fournisseur *</Label>
                            <Input
                              id="batchFournisseur"
                              type="text"
                              placeholder="Ex: BF2025-001"
                              value={batchFournisseur}
                              onChange={(e) => setBatchFournisseur(e.target.value)}
                            />
                          </div>

                          <div>
                            <Label htmlFor="fournisseur">Fournisseur *</Label>
                            <Input
                              id="fournisseur"
                              type="text"
                              placeholder="Nom du fournisseur"
                              value={fournisseur}
                              onChange={(e) => setFournisseur(e.target.value)}
                            />
                          </div>

                          <div>
                            <Label htmlFor="generatedBatch">Batch Unique SONEFI (généré automatiquement)</Label>
                            <Input
                              id="generatedBatch"
                              type="text"
                              value={generatedBatch}
                              disabled
                              className="bg-gray-50"
                            />
                          </div>

                          <div>
                            <Label htmlFor="laize">Laize (mm) *</Label>
                            <Input
                              id="laize"
                              type="number"
                              step="1"
                              min="0"
                              placeholder="Ex: 1400"
                              value={laize}
                              onChange={(e) => setLaize(e.target.value)}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="quantity">Quantité *</Label>
                              <Input
                                id="quantity"
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="Ex: 100"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                              />
                            </div>
                            <div>
                              <Label htmlFor="unite">Unité *</Label>
                              <Select value={unite} onValueChange={(value) => setUnite(value as "ML" | "M2" | "unite")}>
                                <SelectTrigger id="unite">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ML">ML (Mètres linéaires)</SelectItem>
                                  <SelectItem value="M2">M² (Mètres carrés)</SelectItem>
                                  <SelectItem value="unite">Unité</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          {selectedProductData && selectedProductData.batches.length > 0 && (
                            <div>
                              <Label htmlFor="batch">Lot / Batch *</Label>
                              <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                                <SelectTrigger id="batch">
                                  <SelectValue placeholder="Sélectionner un lot" />
                                </SelectTrigger>
                                <SelectContent>
                                  {selectedProductData.batches.map((batch) => {
                                    const batchId =
                                      selectedCategory === "matieres_premieres"
                                        ? String(batch.batch_sonefi)
                                        : (batch as any).id
                                    const batchLabel = String(batch.batch_sonefi)
                                    const quantite = batch.quantite
                                    const laizeInfo = batch.laize ? ` - Laize: ${batch.laize}mm` : ""
                                    const uniteInfo = batch.unite ? ` (${batch.unite})` : ""
                                    const fournisseurInfo = batch.fournisseur ? ` - ${batch.fournisseur}` : ""

                                    return (
                                      <SelectItem key={batchId} value={batchId}>
                                        {batchLabel} - {Number(quantite).toFixed(2)}
                                        {uniteInfo}
                                        {laizeInfo}
                                        {fournisseurInfo}
                                      </SelectItem>
                                    )
                                  })}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {isMatierePremierSortieConsommation && (
                            <>
                              <div>
                                <Label htmlFor="decoupeType">Type de découpe *</Label>
                                <Select
                                  value={decoupeType}
                                  onValueChange={(value) => {
                                    setDecoupeType(value as "normale" | "delaizage")
                                    if (value === "normale") {
                                      setLaizeEnlevee("")
                                    }
                                  }}
                                >
                                  <SelectTrigger id="decoupeType">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="normale">Découpe normale</SelectItem>
                                    <SelectItem value="delaizage">Délaizage</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {decoupeType === "delaizage" ? (
                                <>
                                  <div>
                                    <Label htmlFor="laizeEnlevee">Laize découpée - largeur enlevée (mm) *</Label>
                                    <Input
                                      id="laizeEnlevee"
                                      type="number"
                                      step="1"
                                      min="1"
                                      placeholder="Ex: 300"
                                      value={laizeEnlevee}
                                      onChange={(e) => setLaizeEnlevee(e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Largeur retirée du rouleau (doit être inférieure à la laize d'origine)
                                    </p>
                                  </div>

                                  {selectedProductData && selectedBatch && (
                                    <div className="p-3 bg-blue-50 rounded-lg space-y-1">
                                      <p className="text-sm font-medium text-blue-900">
                                        Laize d'origine :{" "}
                                        {selectedProductData.batches.find(
                                          (b) => String(b.batch_sonefi) === selectedBatch,
                                        )?.laize || "Non renseignée"}{" "}
                                        mm
                                      </p>
                                      {laizeEnlevee && selectedBatchData?.laize && (
                                        <p className="text-sm text-blue-800">
                                          Nouvelle laize après découpe :{" "}
                                          <span className="font-semibold">
                                            {selectedBatchData.laize - Number.parseFloat(laizeEnlevee)} mm
                                          </span>
                                        </p>
                                      )}
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Le délaizage ne réduit pas la longueur du rouleau
                                      </p>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <>
                                  {selectedProductData && selectedBatch && (
                                    <div className="p-3 bg-blue-50 rounded-lg">
                                      <p className="text-sm font-medium text-blue-900">
                                        Laize d'origine :{" "}
                                        {selectedProductData.batches.find(
                                          (b) => String(b.batch_sonefi) === selectedBatch,
                                        )?.laize || "Non renseignée"}{" "}
                                        mm
                                      </p>
                                    </div>
                                  )}

                                  <div>
                                    <Label htmlFor="quantity">Quantité *</Label>
                                    <Input
                                      id="quantity"
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      max={selectedBatchData ? selectedBatchData.quantite : undefined}
                                      placeholder="Ex: 10.5"
                                      value={quantity}
                                      onChange={(e) => setQuantity(e.target.value)}
                                    />
                                    {selectedBatchData && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Stock disponible : {selectedBatchData.quantite.toFixed(2)}{" "}
                                        {selectedBatchData?.unite || ""}
                                      </p>
                                    )}
                                  </div>
                                </>
                              )}
                            </>
                          )}

                          {!isMatierePremierSortieConsommation && !isMatierePremierEntree && (
                            <>
                              {movementType === "AJUSTEMENT" ? (
                                <div>
                                  <Label htmlFor="quantity">Quantité actuelle (non modifiable)</Label>
                                  <Input
                                    id="quantity"
                                    type="number"
                                    step="0.01"
                                    value={selectedBatchData?.quantite.toFixed(2) || ""}
                                    disabled
                                    readOnly
                                    className="bg-gray-100 cursor-not-allowed text-gray-600"
                                  />
                                  <p className="text-xs text-orange-600 mt-1 font-medium">
                                    ⚠️ Seuls le prix et l'emplacement peuvent être rectifiés lors d'un ajustement.
                                  </p>
                                </div>
                              ) : (
                                <div>
                                  <Label htmlFor="quantity">Quantité *</Label>
                                  <Input
                                    id="quantity"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max={
                                      (movementType === "SORTIE" || movementType === "CONSOMMATION") &&
                                      selectedBatchData
                                        ? selectedBatchData.quantite
                                        : undefined
                                    }
                                    placeholder="Ex: 10.5"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                  />
                                  {(movementType === "SORTIE" || movementType === "CONSOMMATION") &&
                                    selectedBatchData && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Stock disponible : {selectedBatchData.quantite.toFixed(2)}{" "}
                                        {selectedBatchData?.unite || ""}
                                      </p>
                                    )}
                                </div>
                              )}
                            </>
                          )}

                          {movementType === "AJUSTEMENT" && (
                            <>
                              <div>
                                <Label htmlFor="emplacement">Emplacement</Label>
                                {isMatierePremiere ? (
                                  <Select value={emplacement} onValueChange={setEmplacement}>
                                    <SelectTrigger id="emplacement">
                                      <SelectValue placeholder="Sélectionner un emplacement..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {rawMaterialLocations.map((location) => (
                                        <SelectItem key={location} value={location}>
                                          {location}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input
                                    id="emplacement"
                                    type="text"
                                    placeholder="Ex: Entrepôt A - Rayon 3"
                                    value={emplacement}
                                    onChange={(e) => setEmplacement(e.target.value)}
                                  />
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                  {isMatierePremiere
                                    ? "Sélectionnez l'emplacement de stockage pour la matière première"
                                    : "Nouvel emplacement de stockage"}
                                </p>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="prixHT">Prix HT (€)</Label>
                                  <Input
                                    id="prixHT"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="Ex: 12.50"
                                    value={prixHT}
                                    onChange={(e) => setPrixHT(e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="uniteAjustement">Unité</Label>
                                  <Select
                                    value={unite}
                                    onValueChange={(value) => setUnite(value as "ML" | "M2" | "unite")}
                                  >
                                    <SelectTrigger id="uniteAjustement">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="ML">ML (Mètres linéaires)</SelectItem>
                                      <SelectItem value="M2">M² (Mètres carrés)</SelectItem>
                                      <SelectItem value="unite">Unité</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </>
                          )}

                          <div>
                            <Label htmlFor="note">Note (optionnel)</Label>
                            <Textarea
                              id="note"
                              placeholder="Ajouter une note explicative..."
                              value={note}
                              onChange={(e) => setNote(e.target.value)}
                              rows={3}
                            />
                          </div>

                          <div className="flex justify-end gap-3 pt-4">
                            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                              Annuler
                            </Button>
                            <Button onClick={handlePrepareSubmit} disabled={submitting}>
                              Ajouter le mouvement
                            </Button>
                          </div>
                        </>
                      )}

                      {isMatierePremierEntree && (
                        <div className="flex justify-end gap-3 pt-4">
                          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                            Annuler
                          </Button>
                          <Button onClick={handlePrepareSubmit} disabled={submitting}>
                            Ajouter le mouvement
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
