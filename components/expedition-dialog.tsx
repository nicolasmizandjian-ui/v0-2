"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ChevronLeft } from "lucide-react"

interface Product {
  id: string
  reference: string
  clientName: string
  quantity: number
  unit: string
}

interface ClientData {
  clientName: string
  products: Product[]
}

interface ExpeditionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExpeditionDialog({ open, onOpenChange }: ExpeditionDialogProps) {
  const [clients, setClients] = useState<ClientData[]>([])
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      fetchExpeditionData()
    }
  }, [open])

  const fetchExpeditionData = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/supabase/expedition")
      if (response.ok) {
        const data = await response.json()
        setClients(data.clients || [])
      }
    } catch (error) {
      console.error("Error fetching expedition data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleClientSelect = (client: ClientData) => {
    setSelectedClient(client)
    setSelectedProducts(new Set())
  }

  const handleProductToggle = (productId: string) => {
    const newSelected = new Set(selectedProducts)
    if (newSelected.has(productId)) {
      newSelected.delete(productId)
    } else {
      newSelected.add(productId)
    }
    setSelectedProducts(newSelected)
  }

  const handleValidateExpedition = async () => {
    if (!selectedClient || selectedProducts.size === 0) return

    const selectedProductsList = selectedClient.products.filter((p) => selectedProducts.has(p.id))

    try {
      const response = await fetch("/api/supabase/validate-expedition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: selectedClient.clientName,
          products: selectedProductsList,
        }),
      })

      if (response.ok) {
        // Refresh data and reset selection
        await fetchExpeditionData()
        setSelectedClient(null)
        setSelectedProducts(new Set())
      }
    } catch (error) {
      console.error("Error validating expedition:", error)
    }
  }

  const handleBack = () => {
    setSelectedClient(null)
    setSelectedProducts(new Set())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {selectedClient ? selectedClient.clientName : "À Expédier"}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="text-muted-foreground">Chargement...</div>
          </div>
        ) : selectedClient ? (
          <div className="space-y-4">
            <Button variant="ghost" onClick={handleBack} className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              Retour aux clients
            </Button>

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Sélectionnez les produits à expédier pour {selectedClient.clientName}
              </p>
              {selectedClient.products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedProducts.has(product.id)}
                    onCheckedChange={() => handleProductToggle(product.id)}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{product.reference}</div>
                    <div className="text-sm text-muted-foreground">
                      Qté: {product.quantity} {product.unit}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={handleBack}>
                Annuler
              </Button>
              <Button
                onClick={handleValidateExpedition}
                disabled={selectedProducts.size === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Valider l'expédition
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sélectionnez un client pour voir les produits prêts à expédier
            </p>
            {clients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Aucun produit à expédier pour le moment</div>
            ) : (
              <div className="space-y-2">
                {clients.map((client, index) => (
                  <button
                    key={index}
                    onClick={() => handleClientSelect(client)}
                    className="w-full text-left rounded-lg border border-border bg-card p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-foreground">{client.clientName}</div>
                        <div className="text-sm text-muted-foreground">
                          {client.products.length} produit{client.products.length > 1 ? "s" : ""} à expédier
                        </div>
                      </div>
                      <div className="text-blue-600 font-medium">→</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
