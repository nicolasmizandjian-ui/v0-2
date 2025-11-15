"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, Check, Loader2 } from "lucide-react"
import { useState } from "react"
import type { ReceptionData } from "./reception-form"

interface ReceptionSummaryProps {
  product: {
    id: string
    name: string
    description: string
    quantity: string
    unit: string
    reference: string
    status: string
  }
  supplier: string
  receptionData: ReceptionData
  onBack: () => void
  onConfirm: () => Promise<void>
}

export function ReceptionSummary({ product, supplier, receptionData, onBack, onConfirm }: ReceptionSummaryProps) {
  const [submitting, setSubmitting] = useState(false)

  const handleConfirm = async () => {
    setSubmitting(true)
    try {
      await onConfirm()
    } finally {
      setSubmitting(false)
    }
  }

  const totalQuantity = receptionData.rolls.reduce((sum, roll) => {
    const qty = Number.parseFloat(roll.quantity) || 0
    return sum + qty
  }, 0)

  const getReceptionTypeLabel = (type: string) => {
    switch (type) {
      case "complete":
        return "Réception complète"
      case "partial":
        return "Réception partielle"
      case "return":
        return "Retour"
      default:
        return type
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 pb-4 border-b">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">Résumé de la réception</h2>
          <p className="text-sm text-muted-foreground">Vérifiez les informations avant de confirmer</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg bg-muted/50 p-4">
          <h3 className="font-semibold mb-3 text-lg">Informations produit</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Produit:</span>
              <span className="font-medium" dangerouslySetInnerHTML={{ __html: product.description }} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fournisseur:</span>
              <span className="font-medium">{supplier}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quantité commandée:</span>
              <span className="font-medium">
                {Number.parseFloat(product.quantity).toFixed(2)} {product.unit}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-muted/50 p-4">
          <h3 className="font-semibold mb-3 text-lg">Informations de réception</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nature de la réception:</span>
              <span className="font-medium">{getReceptionTypeLabel(receptionData.receptionType)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date de réception:</span>
              <span className="font-medium">{new Date(receptionData.receptionDate).toLocaleDateString("fr-FR")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Unité:</span>
              <span className="font-medium">{receptionData.unit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Référence fournisseur:</span>
              <span className="font-medium">{receptionData.supplierReference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Batch fournisseur:</span>
              <span className="font-medium">{receptionData.supplierBatch}</span>
            </div>
            {receptionData.partialDelivery && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Livraison partielle:</span>
                <span className="font-medium text-orange-600">Oui</span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg bg-muted/50 p-4">
          <h3 className="font-semibold mb-3 text-lg">Produits reçus</h3>
          <div className="space-y-3">
            {receptionData.rolls.map((roll, index) => (
              <div key={roll.id} className="rounded-lg border bg-card p-3">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-sm">Produit {index + 1}</span>
                  <span className="text-sm font-semibold text-primary">
                    {Number.parseFloat(roll.quantity).toFixed(2)} {receptionData.unit}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Batch:</span>
                    <span className="font-medium text-foreground">{roll.batch}</span>
                  </div>
                  {roll.location && (
                    <div className="flex justify-between">
                      <span>Emplacement:</span>
                      <span className="font-medium text-foreground">{roll.location}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t flex justify-between items-center">
            <span className="font-semibold">Total reçu:</span>
            <span className="text-lg font-bold text-primary">
              {totalQuantity.toFixed(2)} {receptionData.unit}
            </span>
          </div>
        </div>

        {receptionData.notes && (
          <div className="rounded-lg bg-muted/50 p-4">
            <h3 className="font-semibold mb-2 text-lg">Notes complémentaires</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{receptionData.notes}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack} disabled={submitting}>
          Modifier
        </Button>
        <Button onClick={handleConfirm} disabled={submitting} size="lg">
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Confirmation en cours...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Confirmer la réception
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
