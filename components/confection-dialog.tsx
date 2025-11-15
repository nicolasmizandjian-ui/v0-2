"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Check } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

interface Client {
  id: string
  name: string
  quantity: number
  products: Product[] // Added products array directly to client
  column_values: Array<{
    id: string
    text: string
    value: string
  }>
}

interface Column {
  id: string
  title: string
  type: string
}

interface Product {
  id: string
  reference: string
  clientName: string
  description: string
  realizedQuantity: string | number // Changed type from string to number to match API data
}

interface ConfectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTaskCreated?: (task: {
    products: Product[]
    assignedTo: string[]
    clientName: string
  }) => void
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function ConfectionDialog({ open, onOpenChange, onTaskCreated }: ConfectionDialogProps) {
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(new Set())

  const { data: clientsData, error: clientsError } = useSWR(open ? "/api/supabase/confection" : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })

  const clients = clientsData?.clients || []
  const columns = clientsData?.columns || []
  const loading = !clientsData && !clientsError
  const error = clientsError ? "Une erreur est survenue" : null

  const clientNames = useMemo(() => {
    const clientColumn = columns.find((col: any) => col.title === "NOM CLIENT" || col.id === "texte")
    if (!clientColumn) return []

    const names = clients
      .map((item: any) => {
        const clientCol = item.column_values.find((col: any) => col.id === clientColumn.id)
        return clientCol?.text?.trim()
      })
      .filter((name: string) => !!name && name !== "")

    return Array.from(new Set(names)).sort()
  }, [clients, columns])

  const getProductsForClient = (clientName: string): Product[] => {
    const client = clients.find((c: Client) => c.name === clientName)
    return client?.products || []
  }

  const currentProducts = useMemo(() => {
    return selectedClient ? getProductsForClient(selectedClient) : []
  }, [selectedClient, clients, columns])

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(productId)) {
        newSet.delete(productId)
      } else {
        newSet.add(productId)
      }
      return newSet
    })
  }

  const togglePersonSelection = (person: string) => {
    setSelectedPeople((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(person)) {
        newSet.delete(person)
      } else {
        newSet.add(person)
      }
      return newSet
    })
  }

  const handleClientClick = (clientName: string) => {
    setSelectedClient(clientName)
    setSelectedProducts(new Set())
    setSelectedPeople(new Set())
  }

  const handleBackToClients = () => {
    setSelectedClient(null)
    setSelectedProducts(new Set())
    setSelectedPeople(new Set())
  }

  const handleValidateSelection = () => {
    const selectedProductsList = currentProducts.filter((p) => selectedProducts.has(p.id))
    console.log("[v0] Confection - Selected products:", Array.from(selectedProducts))
    console.log("[v0] Confection - Assigned to:", Array.from(selectedPeople))

    if (onTaskCreated && selectedClient) {
      onTaskCreated({
        products: selectedProductsList,
        assignedTo: Array.from(selectedPeople),
        clientName: selectedClient,
      })
    }

    // Reset and close
    setSelectedClient(null)
    setSelectedProducts(new Set())
    setSelectedPeople(new Set())
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{selectedClient ? `Produits - ${selectedClient}` : "Clients - Confection"}</DialogTitle>
          <DialogDescription>
            {selectedClient
              ? "Sélectionnez les produits à confectionner et assignez une ou plusieurs personnes"
              : "Sélectionnez un client pour voir ses produits prêts pour la confection"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Spinner className="h-8 w-8" />
              <span className="ml-3 text-muted-foreground">Chargement des clients...</span>
            </div>
          )}

          {error && (
            <div className="space-y-4">
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && selectedClient && (
            <div className="flex flex-col h-full">
              <Button onClick={handleBackToClients} variant="ghost" className="gap-2 mb-4 flex-shrink-0">
                <ChevronLeft className="h-4 w-4" />
                Retour aux clients
              </Button>

              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    {currentProducts.map((product) => (
                      <div
                        key={product.id}
                        onClick={() => toggleProductSelection(product.id)}
                        className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-center w-5 h-5 rounded border-2 border-primary flex-shrink-0 mt-0.5">
                          {selectedProducts.has(product.id) && (
                            <Check className="h-3.5 w-3.5 text-primary" strokeWidth={3} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <p className="font-medium text-foreground break-words">{product.reference}</p>
                            <span className="text-sm font-semibold text-purple-600 whitespace-nowrap">
                              Qté: {product.realizedQuantity}
                            </span>
                          </div>
                          {product.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 break-words">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedProducts.size > 0 && (
                    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                      <Label className="text-base font-semibold">Qui va réaliser cette tâche ?</Label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="justyna"
                            checked={selectedPeople.has("Justyna")}
                            onCheckedChange={() => togglePersonSelection("Justyna")}
                          />
                          <Label htmlFor="justyna" className="cursor-pointer font-normal">
                            Justyna
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="monique"
                            checked={selectedPeople.has("Monique")}
                            onCheckedChange={() => togglePersonSelection("Monique")}
                          />
                          <Label htmlFor="monique" className="cursor-pointer font-normal">
                            Monique
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="dodou"
                            checked={selectedPeople.has("Dodou")}
                            onCheckedChange={() => togglePersonSelection("Dodou")}
                          />
                          <Label htmlFor="dodou" className="cursor-pointer font-normal">
                            Dodou
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="christine"
                            checked={selectedPeople.has("Christine")}
                            onCheckedChange={() => togglePersonSelection("Christine")}
                          />
                          <Label htmlFor="christine" className="cursor-pointer font-normal">
                            Christine
                          </Label>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-2 pb-2">
                    <Button
                      onClick={handleValidateSelection}
                      disabled={selectedProducts.size === 0 || selectedPeople.size === 0}
                      className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                    >
                      Valider la sélection
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}

          {!loading && !error && !selectedClient && clientNames.length > 0 && (
            <ScrollArea className="h-full pr-4">
              <div className="space-y-2">
                {clientNames.map((clientName, index) => (
                  <button
                    key={index}
                    onClick={() => handleClientClick(clientName)}
                    className="w-full text-left rounded-lg border border-border bg-card px-4 py-3 hover:bg-accent/50 transition-colors break-words"
                  >
                    <p className="font-medium text-foreground">{clientName}</p>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}

          {!loading && !error && clientNames.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              Aucun produit prêt pour la confection (statut "Découpe terminée")
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
