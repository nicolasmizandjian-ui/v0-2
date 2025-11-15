"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, ArrowRight, Loader2, Check, QrCode } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"

interface RollData {
  rollIndex: number
  itemId: string
  quantity: string
  location: string
}

interface StockValidationFormProps {
  batches: RollData[]
  product: {
    id: string
    name: string
    description: string
    unit: string
    reference: string
  }
  supplier: string
  supplierBatch: string
  onBack: () => void
  onComplete: () => void
}

export function StockValidationForm({
  batches,
  product,
  supplier,
  supplierBatch,
  onBack,
  onComplete,
}: StockValidationFormProps) {
  const [currentRollIndex, setCurrentRollIndex] = useState(0)
  const [categories, setCategories] = useState<string[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [showQRCodes, setShowQRCodes] = useState(false)
  const [validatedRolls, setValidatedRolls] = useState<any[]>([])
  const [finalizingValidation, setFinalizingValidation] = useState(false)

  const [rollValidations, setRollValidations] = useState<
    Record<
      number,
      {
        category: string
        supplierBatch: string
        sellsyReference: string
        sonefiReference: string
        supplierReference: string
        width: string
        location: string
        stockType: string
      }
    >
  >({})

  const [submitting, setSubmitting] = useState(false)

  const currentRoll = batches[currentRollIndex]
  const currentValidation = rollValidations[currentRollIndex] || {
    category: "",
    supplierBatch: supplierBatch || "",
    sellsyReference: product.reference || "",
    sonefiReference: "",
    supplierReference: "",
    width: "",
    location: currentRoll?.location || "",
    stockType: "",
  }

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/supabase/stock?category=all")
        const data = await response.json()

        console.log("[v0] Fetched stock data:", data)

        const uniqueCategories = new Set<string>()
        data.items?.forEach((item: any) => {
          const categoryColumn = item.column_values?.find((col: any) => col.id === "label__1")
          if (categoryColumn?.text) {
            uniqueCategories.add(categoryColumn.text)
          }
        })

        const categoriesArray = Array.from(uniqueCategories).sort()
        console.log("[v0] Extracted categories:", categoriesArray)
        setCategories(categoriesArray)
      } catch (error) {
        console.error("[v0] Error fetching categories:", error)
        setCategories(["MÉTAL", "PLASTIQUE", "BOIS", "TEXTILE", "COMPOSITE", "FEUTRE", "MOUSSE", "AUTRE"])
      } finally {
        setLoadingCategories(false)
      }
    }

    fetchCategories()
  }, [])

  const updateCurrentValidation = (field: string, value: string) => {
    setRollValidations({
      ...rollValidations,
      [currentRollIndex]: {
        ...currentValidation,
        [field]: value,
      },
    })
  }

  const handleNext = () => {
    if (currentRollIndex < batches.length - 1) {
      setCurrentRollIndex(currentRollIndex + 1)
    }
  }

  const handlePrevious = () => {
    if (currentRollIndex > 0) {
      setCurrentRollIndex(currentRollIndex - 1)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const validated = []
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        const validation = rollValidations[i]

        if (!validation) continue

        await fetch("/api/supabase/stock/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId: batch.itemId,
            category: validation.category,
            supplierBatch: validation.supplierBatch,
            sellsyReference: validation.sellsyReference,
            sonefiReference: validation.sonefiReference,
            supplierReference: validation.supplierReference,
            width: validation.width,
            location: validation.location,
            stockType: validation.stockType,
          }),
        })

        validated.push({
          ...batch,
          ...validation,
          product: product.description,
          supplier,
        })
      }

      setValidatedRolls(validated)
      setShowQRCodes(true)
    } catch (error) {
      console.error("[v0] Error validating stock:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleFinalizeValidation = async () => {
    setFinalizingValidation(true)
    try {
      for (const roll of validatedRolls) {
        await fetch("/api/supabase/stock/finalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId: roll.itemId,
            stockType: roll.stockType,
            category: roll.category,
            supplierBatch: roll.supplierBatch,
            sonefiReference: roll.sonefiReference,
            supplierReference: roll.supplierReference,
            width: roll.width,
          }),
        })
      }
      onComplete()
    } catch (error) {
      console.error("[v0] Error finalizing validation:", error)
    } finally {
      setFinalizingValidation(false)
    }
  }

  const handleDownloadQRCodes = () => {
    window.print()
  }

  const isCurrentRollValid = currentValidation.category && currentValidation.location && currentValidation.stockType
  const allRollsValidated = batches.every((_, index) => {
    const validation = rollValidations[index]
    return validation && validation.category && validation.location && validation.stockType
  })

  const showWidthField = product.unit === "M2" || product.unit === "ML"

  if (showQRCodes) {
    return (
      <>
        <style jsx global>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            
            * {
              visibility: hidden;
            }
            
            .print-area,
            .print-area * {
              visibility: visible;
            }
            
            .print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 0;
              margin: 0;
            }
            
            .print-label {
              page-break-inside: avoid;
              margin-bottom: 20mm;
              border: 3px solid #000 !important;
              padding: 10mm !important;
              background: white !important;
            }
            
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            
            .no-print {
              display: none !important;
            }
          }
        `}</style>

        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b no-print">
            <div className="flex-1">
              <h2 className="text-xl font-bold">QR Codes générés</h2>
              <p className="text-sm text-muted-foreground">Téléchargez et imprimez les QR codes pour chaque rouleau</p>
            </div>
          </div>

          <div className="print-area space-y-4">
            {validatedRolls.map((roll, index) => {
              const cleanProduct = roll.product.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "")

              return (
                <div key={index} className="print-label border-2 border-gray-800 rounded-lg p-6 bg-white">
                  <div className="flex items-start gap-6">
                    <div className="flex-shrink-0">
                      <QRCodeSVG
                        value={JSON.stringify({
                          batch: roll.itemId,
                          product: cleanProduct,
                          quantity: roll.quantity,
                          unit: product.unit,
                          location: roll.location,
                          supplier: roll.supplier,
                          category: roll.category,
                          sellsyReference: roll.sellsyReference,
                          sonefiReference: roll.sonefiReference,
                          supplierReference: roll.supplierReference,
                          supplierBatch: roll.supplierBatch,
                          width: roll.width,
                          date: new Date().toISOString().split("T")[0],
                        })}
                        size={160}
                        level="H"
                      />
                    </div>

                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="text-base font-bold leading-tight whitespace-pre-line">{cleanProduct}</div>

                      <div className="space-y-1 text-sm">
                        <div className="flex items-baseline gap-1">
                          <span className="text-gray-600 font-medium">Quantité:</span>
                          <span className="font-bold">
                            {Number.parseFloat(roll.quantity).toFixed(2)} {product.unit}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-gray-600 font-medium">Catégorie:</span>
                          <span className="font-bold">{roll.category}</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-gray-600 font-medium">Fournisseur:</span>
                          <span className="font-bold">{roll.supplier}</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-gray-600 font-medium">Emplacement:</span>
                          <span className="font-bold">{roll.location}</span>
                        </div>
                        {roll.width && (
                          <div className="flex items-baseline gap-1">
                            <span className="text-gray-600 font-medium">Laize:</span>
                            <span className="font-bold">{roll.width} mm</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t-2 border-gray-300">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 font-semibold">Batch:</span>
                      <span className="text-2xl font-bold tracking-wide">{roll.itemId}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex gap-2 justify-end no-print">
            <Button variant="outline" onClick={handleDownloadQRCodes}>
              <QrCode className="h-4 w-4 mr-2" />
              Télécharger les étiquettes
            </Button>
            <Button onClick={handleFinalizeValidation} disabled={finalizingValidation}>
              {finalizingValidation ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Finalisation...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Terminer la validation
                </>
              )}
            </Button>
          </div>
        </div>
      </>
    )
  }

  if (!currentRoll) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 pb-4 border-b">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold">
            Validation du rouleau {currentRollIndex + 1}/{batches.length}
          </h2>
          <p className="text-sm text-muted-foreground">Complétez les informations pour ce rouleau</p>
        </div>
      </div>

      <div className="rounded-lg bg-primary/10 border-2 border-primary/20 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Identifiant Monday (Batch)</p>
            <p className="text-2xl font-bold text-primary">{currentRoll.itemId}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-muted-foreground">Quantité</p>
            <p className="text-xl font-semibold">
              {Number.parseFloat(currentRoll.quantity).toFixed(2)} {product.unit}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-muted/50 p-4 space-y-2">
        <h3 className="font-semibold" dangerouslySetInnerHTML={{ __html: product.description }} />
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Fournisseur:</span>
            <span className="ml-2 font-medium">{supplier}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Référence:</span>
            <span className="ml-2 font-medium">{product.reference}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="sellsyReference">REF SELLSY</Label>
          <Input
            id="sellsyReference"
            value={currentValidation.sellsyReference}
            onChange={(e) => updateCurrentValidation("sellsyReference", e.target.value)}
            placeholder="REF_SELLSY_001"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sonefiReference">REF SONEFI</Label>
          <Input
            id="sonefiReference"
            value={currentValidation.sonefiReference}
            onChange={(e) => updateCurrentValidation("sonefiReference", e.target.value)}
            placeholder="REF_SONEFI_001"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">CATÉGORIE *</Label>
          <Select
            value={currentValidation.category}
            onValueChange={(value) => updateCurrentValidation("category", value)}
            disabled={loadingCategories}
          >
            <SelectTrigger id="category">
              <SelectValue placeholder={loadingCategories ? "Chargement..." : "Sélectionner une catégorie..."} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="supplierBatch">BATCH FOURNISSEUR</Label>
          <Input
            id="supplierBatch"
            value={currentValidation.supplierBatch}
            onChange={(e) => updateCurrentValidation("supplierBatch", e.target.value)}
            placeholder="BATCH_2024_001"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="supplierReference">RÉFÉRENCE FOURNISSEUR</Label>
          <Input
            id="supplierReference"
            value={currentValidation.supplierReference}
            onChange={(e) => updateCurrentValidation("supplierReference", e.target.value)}
            placeholder="REF_FOURNISSEUR_001"
          />
        </div>

        {showWidthField && (
          <div className="space-y-2">
            <Label htmlFor="width">Laize (largeur en mm)</Label>
            <Input
              id="width"
              type="number"
              step="1"
              value={currentValidation.width}
              onChange={(e) => updateCurrentValidation("width", e.target.value)}
              placeholder="2200"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="location">EMPLACEMENT *</Label>
          <Select
            value={currentValidation.location}
            onValueChange={(value) => updateCurrentValidation("location", value)}
          >
            <SelectTrigger id="location">
              <SelectValue placeholder="Sélectionner un emplacement..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RD">RD</SelectItem>
              <SelectItem value="RD1">RD1</SelectItem>
              <SelectItem value="RD2">RD2</SelectItem>
              <SelectItem value="RD3">RD3</SelectItem>
              <SelectItem value="RGH11">RGH11</SelectItem>
              <SelectItem value="RGH12">RGH12</SelectItem>
              <SelectItem value="RGH13">RGH13</SelectItem>
              <SelectItem value="RGH14">RGH14</SelectItem>
              <SelectItem value="RDH11">RDH11</SelectItem>
              <SelectItem value="RDH12">RDH12</SelectItem>
              <SelectItem value="RDH13">RDH13</SelectItem>
              <SelectItem value="RDH14">RDH14</SelectItem>
              <SelectItem value="RGH21">RGH21</SelectItem>
              <SelectItem value="RGH22">RGH22</SelectItem>
              <SelectItem value="RGH23">RGH23</SelectItem>
              <SelectItem value="RGH24">RGH24</SelectItem>
              <SelectItem value="RDH21">RDH21</SelectItem>
              <SelectItem value="RDH22">RDH22</SelectItem>
              <SelectItem value="RDH23">RDH23</SelectItem>
              <SelectItem value="RDH24">RDH24</SelectItem>
              <SelectItem value="RGH31">RGH31</SelectItem>
              <SelectItem value="RGH32">RGH32</SelectItem>
              <SelectItem value="RGH33">RGH33</SelectItem>
              <SelectItem value="RGH34">RGH34</SelectItem>
              <SelectItem value="RDH31">RDH31</SelectItem>
              <SelectItem value="RDH32">RDH32</SelectItem>
              <SelectItem value="RDH33">RDH33</SelectItem>
              <SelectItem value="RDH34">RDH34</SelectItem>
              <SelectItem value="DV">DV</SelectItem>
              <SelectItem value="TDH">TDH</SelectItem>
              <SelectItem value="CTN">CTN</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="stockType">TYPE DE STOCK *</Label>
          <Select
            value={currentValidation.stockType}
            onValueChange={(value) => updateCurrentValidation("stockType", value)}
          >
            <SelectTrigger id="stockType">
              <SelectValue placeholder="Sélectionner le type de stock..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="matieres">Matière première</SelectItem>
              <SelectItem value="produits_finis">Produit fini</SelectItem>
              <SelectItem value="accessoires">Accessoire</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>
            Annuler
          </Button>
          {currentRollIndex > 0 && (
            <Button variant="outline" onClick={handlePrevious}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Précédent
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {currentRollIndex < batches.length - 1 ? (
            <Button onClick={handleNext} disabled={!isCurrentRollValid}>
              Suivant
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting || !allRollsValidated}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Validation...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Valider tous les rouleaux
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2 justify-center">
        {batches.map((_, index) => (
          <div
            key={index}
            className={`h-2 w-8 rounded-full transition-colors ${
              index === currentRollIndex ? "bg-primary" : rollValidations[index]?.category ? "bg-green-500" : "bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  )
}
