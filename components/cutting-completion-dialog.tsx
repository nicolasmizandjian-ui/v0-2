"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Check, AlertTriangle, Plus, X } from 'lucide-react'

interface Product {
  reference: string
  quantity: number
  unit: string
}

interface Roll {
  rollReference: string // reference_sonefi
  rollBatch: string
  plannedQuantity: number
  unit: string
  sellsyRef?: string
  laize?: string
  metrage?: number
}

interface CuttingAction {
  id: string
  client: string
  productsCount: number
  products: Product[]
  rolls: Roll[]
  createdAt: Date
}

interface CuttingCompletionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  action: CuttingAction | null
  onComplete: (actionId: string) => void
}

interface RollEntry {
  rollReference: string // reference_sonefi
  sellsyRef: string
  rollBatch: string
  plannedQuantity: number
  actualQuantity?: number
  unit: string
  laize: string
  metrage: number
}

export function CuttingCompletionDialog({ open, onOpenChange, action, onComplete }: CuttingCompletionDialogProps) {
  const [rolls, setRolls] = useState<RollEntry[]>([])
  const [justification, setJustification] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (action && action.rolls && action.rolls.length > 0) {
      setRolls(
        action.rolls.map((roll) => ({
          rollReference: roll.rollReference,
          sellsyRef: roll.sellsyRef || "",
          rollBatch: roll.rollBatch,
          plannedQuantity: roll.plannedQuantity,
          actualQuantity: roll.plannedQuantity,
          unit: roll.unit,
          laize: roll.laize || "",
          metrage: roll.metrage || roll.plannedQuantity,
        })),
      )
    } else {
      // Initialize with empty roll if none provided
      setRolls([])
    }
  }, [action])

  if (!action) return null

  const handleQuantityChange = (index: number, value: string) => {
    const numValue = Number.parseFloat(value)
    if (!Number.isNaN(numValue) && numValue >= 0) {
      setRolls((prev) =>
        prev.map((roll, i) =>
          i === index
            ? {
                ...roll,
                actualQuantity: numValue,
              }
            : roll,
        ),
      )
    }
  }

  const handleBatchChange = (index: number, value: string) => {
    setRolls((prev) => prev.map((roll, i) => (i === index ? { ...roll, rollBatch: value } : roll)))
  }

  const handleReferenceChange = (index: number, field: "rollReference" | "sellsyRef", value: string) => {
    setRolls((prev) => prev.map((roll, i) => (i === index ? { ...roll, [field]: value } : roll)))
  }

  const handleLaizeChange = (index: number, value: string) => {
    setRolls((prev) => prev.map((roll, i) => (i === index ? { ...roll, laize: value } : roll)))
  }

  const handleMetrageChange = (index: number, value: string) => {
    const numValue = Number.parseFloat(value)
    if (!Number.isNaN(numValue) && numValue >= 0) {
      setRolls((prev) => prev.map((roll, i) => (i === index ? { ...roll, metrage: numValue } : roll)))
    }
  }

  const handleAddRoll = () => {
    const template = rolls.length > 0 ? rolls[0] : null
    setRolls((prev) => [
      ...prev,
      {
        rollReference: template?.rollReference || "",
        sellsyRef: template?.sellsyRef || "",
        rollBatch: "",
        plannedQuantity: 0,
        actualQuantity: 0,
        unit: template?.unit || "ML",
        laize: template?.laize || "",
        metrage: 0,
      },
    ])
  }

  const handleRemoveRoll = (index: number) => {
    if (rolls.length > 1) {
      setRolls((prev) => prev.filter((_, i) => i !== index))
    }
  }

  const needsJustification = rolls.some((roll) => {
    const actual = roll.actualQuantity ?? roll.plannedQuantity
    return actual > roll.plannedQuantity
  })

  const handleComplete = async () => {
    if (needsJustification && !justification.trim()) {
      alert("Veuillez fournir un justificatif pour la quantité supérieure.")
      return
    }

    // Validate all required fields are filled
    const hasEmptyFields = rolls.some(
      (roll) => !String(roll.rollBatch).trim() || !String(roll.rollReference).trim() || !String(roll.sellsyRef).trim(),
    )

    if (hasEmptyFields) {
      alert("Veuillez renseigner tous les champs obligatoires (batch, référence Sonefi, référence Sellsy).")
      return
    }

    setIsSubmitting(true)

    try {
      const durationMinutes = Math.floor((Date.now() - action.createdAt.getTime()) / 60000)

      const updates = {
        clientName: action.client,
        products: action.products.map((product) => ({
          reference: product.reference,
          estimatedQuantity: product.quantity,
          actualQuantity: product.quantity,
          batchNumber: String(rolls[0]?.rollBatch || ""),
          justification: needsJustification ? justification : null,
        })),
        rollsUsed: rolls.map((roll) => ({
          batch: String(roll.rollBatch),
          sellsyRef: roll.sellsyRef,
          soneFiRef: roll.rollReference,
          laize: roll.laize,
          metrage: roll.metrage,
        })),
        durationMinutes, // Send duration to API
        justification: needsJustification ? justification : null,
      }

      console.log("[v0] Sending completion data:", updates)

      const response = await fetch("/api/supabase/complete-cutting", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour du statut")
      }

      onComplete(action.id)
      onOpenChange(false)

      // Reset form
      setRolls([])
      setJustification("")
    } catch (error) {
      console.error("Erreur lors de la finalisation:", error)
      alert("Une erreur est survenue lors de la finalisation de la découpe.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            Découpe terminée - Validation
          </DialogTitle>
          <DialogDescription>Confirmez les quantités de matière découpées et les batchs utilisés</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Résumé de l'action */}
          <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">Résumé de l'action</h3>
            <div className="space-y-1 text-sm">
              <p className="text-blue-800">
                <span className="font-medium">Client:</span> {action.client}
              </p>
              <p className="text-blue-800">
                <span className="font-medium">Produits à fabriquer:</span> {action.productsCount} référence
                {action.productsCount > 1 ? "s" : ""}
              </p>
              <div className="mt-3 space-y-1.5">
                {action.products.map((product, index) => (
                  <div key={index} className="bg-white rounded-md p-2 border border-blue-300 text-xs">
                    <span className="font-medium">{product.reference}</span> - {product.quantity} {product.unit}
                  </div>
                ))}
              </div>
              <p className="text-blue-700 text-xs mt-2">
                Durée: {Math.floor((Date.now() - action.createdAt.getTime()) / 60000)} minute
                {Math.floor((Date.now() - action.createdAt.getTime()) / 60000) !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Matières découpées */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Matières découpées</h3>
              <Button onClick={handleAddRoll} size="sm" variant="outline" className="gap-2 h-8 bg-transparent">
                <Plus className="h-3 w-3" />
                Découpe d'un autre rouleau
              </Button>
            </div>

            <div className="space-y-4">
              {rolls.map((roll, index) => {
                const actualQty = roll.actualQuantity ?? roll.plannedQuantity
                const isHigher = actualQty > roll.plannedQuantity

                return (
                  <div
                    key={index}
                    className={`rounded-lg border p-4 ${isHigher ? "border-orange-300 bg-orange-50" : "border-gray-200 bg-white"}`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`ref-sonefi-${index}`} className="text-xs text-gray-600">
                              Référence Sonefi *
                            </Label>
                            <Input
                              id={`ref-sonefi-${index}`}
                              value={roll.rollReference}
                              onChange={(e) => handleReferenceChange(index, "rollReference", e.target.value)}
                              className="mt-1 font-mono text-sm"
                              placeholder="Ex: CO60"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`ref-sellsy-${index}`} className="text-xs text-gray-600">
                              Référence Sellsy *
                            </Label>
                            <Input
                              id={`ref-sellsy-${index}`}
                              value={roll.sellsyRef}
                              onChange={(e) => handleReferenceChange(index, "sellsyRef", e.target.value)}
                              className="mt-1 font-mono text-sm"
                              placeholder="Ex: CO60"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`batch-${index}`} className="text-xs text-gray-600">
                              Batch découpé *
                            </Label>
                            <Input
                              id={`batch-${index}`}
                              value={roll.rollBatch}
                              onChange={(e) => handleBatchChange(index, e.target.value)}
                              className="mt-1 font-mono text-sm"
                              placeholder="Ex: BATCH-001"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`laize-${index}`} className="text-xs text-gray-600">
                              Laize (mm)
                            </Label>
                            <Input
                              id={`laize-${index}`}
                              value={roll.laize}
                              onChange={(e) => handleLaizeChange(index, e.target.value)}
                              className="mt-1 font-mono text-sm"
                              placeholder="Ex: 1400"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs text-gray-600">Quantité prévue</Label>
                            <div className="mt-1 px-3 py-2 bg-gray-100 rounded-md text-sm font-medium">
                              {roll.plannedQuantity} {roll.unit}
                            </div>
                          </div>
                          <div>
                            <Label htmlFor={`qty-${index}`} className="text-xs text-gray-600">
                              Quantité réelle *
                            </Label>
                            <div className="flex items-center gap-2 mt-1">
                              <Input
                                id={`qty-${index}`}
                                type="number"
                                step="0.01"
                                min="0"
                                value={roll.actualQuantity ?? roll.plannedQuantity}
                                onChange={(e) => handleQuantityChange(index, e.target.value)}
                                className="text-right"
                              />
                              <span className="text-sm text-gray-600 whitespace-nowrap">{roll.unit}</span>
                            </div>
                          </div>
                          <div>
                            <Label htmlFor={`metrage-${index}`} className="text-xs text-gray-600">
                              Métrage décompté
                            </Label>
                            <div className="flex items-center gap-2 mt-1">
                              <Input
                                id={`metrage-${index}`}
                                type="number"
                                step="0.01"
                                min="0"
                                value={roll.metrage}
                                onChange={(e) => handleMetrageChange(index, e.target.value)}
                                className="text-right"
                              />
                              <span className="text-sm text-gray-600 whitespace-nowrap">{roll.unit}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {rolls.length > 1 && (
                        <Button
                          onClick={() => handleRemoveRoll(index)}
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {isHigher && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-orange-700 bg-orange-100 px-3 py-2 rounded-md">
                        <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                        <span>
                          Quantité supérieure à la prévision (+{(actualQty - roll.plannedQuantity).toFixed(2)}{" "}
                          {roll.unit})
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Justificatif si nécessaire */}
          {needsJustification && (
            <div className="space-y-2 rounded-lg border border-orange-300 bg-orange-50 p-4">
              <Label htmlFor="justification" className="text-sm font-semibold text-orange-900 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Justificatif requis *
              </Label>
              <p className="text-xs text-orange-700 mb-2">
                La quantité découpée est supérieure à la prévision. Veuillez justifier cet écart.
              </p>
              <Textarea
                id="justification"
                placeholder="Ex: Ajustement nécessaire pour la qualité du produit, surplus pour compenser une erreur de calcul..."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={3}
                className="bg-white"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button onClick={handleComplete} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
            {isSubmitting ? "Validation en cours..." : "Valider la découpe"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
