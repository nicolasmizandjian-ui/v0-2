"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Plus, Trash2, Check, Loader2 } from "lucide-react"

interface Roll {
  id: string
  quantity: string
  location: string
  batch: string
}

interface ReceptionFormProps {
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
  onBack: () => void
  onSubmit: (data: ReceptionData) => Promise<any>
}

export interface ReceptionData {
  receptionType: string
  receptionDate: string
  unit: string
  supplierReference: string
  supplierBatch: string
  partialDelivery: boolean
  notes: string
  rolls: Roll[]
}

export function ReceptionForm({ product, supplier, onBack, onSubmit }: ReceptionFormProps) {
  const [receptionType, setReceptionType] = useState("")
  const [receptionDate, setReceptionDate] = useState("")
  const [unit, setUnit] = useState(product.unit || "")
  const [supplierReference, setSupplierReference] = useState(product.reference || "")
  const [supplierBatch, setSupplierBatch] = useState("")
  const [partialDelivery, setPartialDelivery] = useState(false)
  const [notes, setNotes] = useState("")
  const [rolls, setRolls] = useState<Roll[]>([{ id: "1", quantity: "", location: "", batch: "" }])
  const [submitting, setSubmitting] = useState(false)

  const isFinishedProduct = product.name === "produit_fini" || product.name === "accessoire"

  const addRoll = () => {
    const newRoll: Roll = {
      id: Date.now().toString(),
      quantity: "",
      location: "",
      batch: supplierBatch,
    }
    setRolls([...rolls, newRoll])
  }

  const removeRoll = (id: string) => {
    if (rolls.length > 1) {
      setRolls(rolls.filter((roll) => roll.id !== id))
    }
  }

  const updateRoll = (id: string, field: keyof Roll, value: string) => {
    setRolls(rolls.map((roll) => (roll.id === id ? { ...roll, [field]: value } : roll)))
  }

  const handleSubmit = async () => {
    if (receptionType === "complete") {
      const expectedQuantity = Number.parseFloat(product.quantity)
      if (Math.abs(totalQuantity - expectedQuantity) > 0.01) {
        alert(
          `Erreur: Pour une livraison complète, la quantité totale reçue (${totalQuantity.toFixed(2)}) doit être égale à la quantité commandée (${expectedQuantity.toFixed(2)}).`,
        )
        return
      }
    }

    if (!receptionType) {
      alert("Veuillez sélectionner la nature de la réception")
      return
    }
    if (!receptionDate) {
      alert("Veuillez sélectionner la date de réception")
      return
    }
    if (!unit) {
      alert("Veuillez sélectionner l'unité")
      return
    }
    if (!supplierBatch) {
      alert("Veuillez saisir le batch fournisseur")
      return
    }
    if (rolls.some((r) => !r.quantity)) {
      alert("Veuillez saisir la quantité pour tous les produits")
      return
    }
    if (rolls.some((r) => !r.batch)) {
      alert("Veuillez saisir le batch pour tous les produits")
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({
        receptionType,
        receptionDate,
        unit,
        supplierReference,
        supplierBatch,
        partialDelivery,
        notes,
        rolls,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const totalQuantity = rolls.reduce((sum, roll) => {
    const qty = Number.parseFloat(roll.quantity) || 0
    return sum + qty
  }, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 pb-4 border-b">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">Étape 3 : Informations de réception</h2>
          <p className="text-sm text-muted-foreground">Complétez les informations de réception</p>
        </div>
      </div>

      <div className="rounded-lg bg-muted/50 p-4">
        <h3 className="font-semibold mb-2" dangerouslySetInnerHTML={{ __html: product.description }} />
        <p className="text-sm text-muted-foreground">Fournisseur: {supplier}</p>
        <p className="text-sm text-muted-foreground">
          Quantité commandée: {Number.parseFloat(product.quantity).toFixed(2)} {product.unit}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="receptionType">Nature de la réception</Label>
          <Select value={receptionType} onValueChange={setReceptionType}>
            <SelectTrigger id="receptionType">
              <SelectValue placeholder="Sélectionner..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="complete">Réception complète</SelectItem>
              <SelectItem value="partial">Réception partielle</SelectItem>
              <SelectItem value="return">Retour</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="receptionDate">Date de réception</Label>
          <Input
            id="receptionDate"
            type="date"
            value={receptionDate}
            onChange={(e) => setReceptionDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="unit">Unité</Label>
          <Select value={unit} onValueChange={setUnit}>
            <SelectTrigger id="unit">
              <SelectValue placeholder="Choisir l'unité..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ML">ML (Mètres linéaires)</SelectItem>
              <SelectItem value="M2">M² (Mètres carrés)</SelectItem>
              <SelectItem value="KG">KG (Kilogrammes)</SelectItem>
              <SelectItem value="PCS">PCS (Pièces)</SelectItem>
              <SelectItem value="L">L (Litres)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="supplierReference">Référence fournisseur</Label>
          <Input
            id="supplierReference"
            value={supplierReference}
            onChange={(e) => setSupplierReference(e.target.value)}
            placeholder="REF_FOURNISSEUR_001"
          />
        </div>

        <div className="space-y-2 col-span-2">
          <Label htmlFor="supplierBatch">Batch fournisseur</Label>
          <Input
            id="supplierBatch"
            value={supplierBatch}
            onChange={(e) => setSupplierBatch(e.target.value)}
            placeholder="BATCH_2024_001"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Produits reçus</Label>
          {!isFinishedProduct && (
            <Button type="button" variant="outline" size="sm" onClick={addRoll}>
              <Plus className="h-4 w-4 mr-1" />
              Ajouter un produit
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {rolls.map((roll, index) => (
            <div key={roll.id} className="flex items-end gap-3 p-3 rounded-lg border bg-card">
              <div className="flex-1 grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor={`quantity-${roll.id}`}>Quantité produit {index + 1}</Label>
                  <Input
                    id={`quantity-${roll.id}`}
                    type="number"
                    step="0.01"
                    value={roll.quantity}
                    onChange={(e) => updateRoll(roll.id, "quantity", e.target.value)}
                    placeholder="50.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`batch-${roll.id}`}>Batch produit {index + 1}</Label>
                  <Input
                    id={`batch-${roll.id}`}
                    value={roll.batch}
                    onChange={(e) => updateRoll(roll.id, "batch", e.target.value)}
                    placeholder="BATCH_2024_001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`location-${roll.id}`}>Emplacement</Label>
                  <Select value={roll.location} onValueChange={(value) => updateRoll(roll.id, "location", value)}>
                    <SelectTrigger id={`location-${roll.id}`}>
                      <SelectValue placeholder="Sélectionner..." />
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
              </div>
              {!isFinishedProduct && rolls.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRoll(roll.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="rounded-lg bg-primary/10 p-3 text-sm">
          <span className="font-medium">Total reçu:</span> {totalQuantity.toFixed(2)} {unit}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="partialDelivery"
          checked={partialDelivery}
          onCheckedChange={(checked) => setPartialDelivery(checked as boolean)}
        />
        <Label htmlFor="partialDelivery" className="text-sm font-normal cursor-pointer">
          Livraison partielle
        </Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes complémentaires</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Informations supplémentaires..."
          rows={3}
        />
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          Retour
        </Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Traitement...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Confirmer la validation de stock
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
