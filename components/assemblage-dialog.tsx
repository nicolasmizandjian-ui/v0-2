"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Check } from "lucide-react"

interface Product {
  id: number
  reference: string
  clientName: string
  description: string
  realizedQuantity: number
}

interface Client {
  name: string
  products: Product[]
}

interface AssemblageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTaskCreated?: (task: any) => void
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function AssemblageDialog({ open, onOpenChange, onTaskCreated }: AssemblageDialogProps) {
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set())

  const { data: clientsData, error: clientsError } = useSWR(open ? "/api/supabase/assemblage" : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })

  const clients = clientsData?.clients || []
  const loading = !clientsData && !clientsError
  const error = clientsError ? "Une erreur est survenue" : null

  const currentProducts = useMemo(() => {
    const client = clients.find((c: Client) => c.name === selectedClient)
    return client?.products || []
  }, [selectedClient, clients])

  const toggleProductSelection = (productId: number) => {
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

  const handleClientClick = (clientName: string) => {
    setSelectedClient(clientName)
    setSelectedProducts(new Set())
  }

  const handleBackToClients = () => {
    setSelectedClient(null)
    setSelectedProducts(new Set())
  }

  const handleValidateSelection = async () => {
    if (selectedProducts.size === 0) return

    try {
      await fetch("/api/supabase/assemblage/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: Array.from(selectedProducts) }),
      })

      const selectedProductsList = currentProducts.filter((p) => selectedProducts.has(p.id))
      const task = {
        id: Date.now().toString(),
        type: "assemblage",
        client: selectedClient,
        products: selectedProductsList,
        startTime: new Date().toISOString(),
      }

      onTaskCreated?.(task)

      // Reset and close
      setSelectedClient(null)
      setSelectedProducts(new Set())
      onOpenChange(false)
    } catch (error) {
      console.error("Error starting assemblage:", error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{selectedClient ? `Produits - ${selectedClient}` : "Clients - Assemblage"}</DialogTitle>
          <DialogDescription>
            {selectedClient
              ? "Sélectionnez les produits à assembler (injection/jonction)"
              : "Sélectionnez un client pour voir ses produits prêts pour l'assemblage"}
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
                            <span className="text-sm font-semibold text-blue-600 whitespace-nowrap">
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

                  <div className="flex justify-end pt-2 pb-2">
                    <Button
                      onClick={handleValidateSelection}
                      disabled={selectedProducts.size === 0}
                      className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                    >
                      Valider la sélection
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}

          {!loading && !error && !selectedClient && clients.length > 0 && (
            <ScrollArea className="h-full pr-4">
              <div className="space-y-2">
                {clients.map((client: Client, index: number) => (
                  <button
                    key={index}
                    onClick={() => handleClientClick(client.name)}
                    className="w-full text-left rounded-lg border border-border bg-card px-4 py-3 hover:bg-accent/50 transition-colors break-words"
                  >
                    <p className="font-medium text-foreground">{client.name}</p>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}

          {!loading && !error && clients.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">Aucun produit prêt pour l'assemblage</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
