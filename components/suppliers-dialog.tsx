"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, Package } from "lucide-react"
import { ReceptionForm, type ReceptionData } from "./reception-form"
import { StockValidationForm } from "./stock-validation-form"
import { ReceptionSummary } from "./reception-summary"

interface SuppliersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Product {
  id: string
  name: string
  description: string
  quantity: string
  unit: string
  reference: string
  status: string
}

interface Order {
  code_commande: string
  fournisseur: string
  description_produit: string
  numero_commande?: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Utility function to clean HTML tags and preserve line breaks
function cleanHtmlText(html: string): string {
  if (!html) return ""

  // Replace <br> tags with newlines
  let text = html.replace(/<br\s*\/?>/gi, "\n")

  // Remove all other HTML tags
  text = text.replace(/<[^>]*>/g, "")

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

  // Trim whitespace
  return text.trim()
}

export function SuppliersDialog({ open, onOpenChange }: SuppliersDialogProps) {
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [supplierBatch, setSupplierBatch] = useState<string>("")
  const [createdBatches, setCreatedBatches] = useState<any[] | null>(null)
  const [receptionData, setReceptionData] = useState<ReceptionData | null>(null)

  const { data: suppliersData, error: suppliersError } = useSWR(open ? "/api/supabase/suppliers" : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })

  const { data: ordersData, error: ordersError } = useSWR(
    selectedSupplier ? `/api/supabase/suppliers/orders?supplier=${encodeURIComponent(selectedSupplier)}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    },
  )

  const { data: productsData, error: productsError } = useSWR(
    selectedOrder
      ? `/api/supabase/suppliers/products?orderCode=${encodeURIComponent(selectedOrder.code_commande)}`
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    },
  )

  const suppliers = suppliersData?.suppliers || []
  const orders = ordersData?.orders || []
  const products = productsData?.products || []
  const loading = !suppliersData && !suppliersError
  const loadingOrders = selectedSupplier && !ordersData && !ordersError
  const loadingProducts = selectedOrder && !productsData && !productsError
  const error = suppliersError || ordersError || productsError

  useEffect(() => {
    if (open) {
      setSelectedSupplier(null)
      setSelectedOrder(null)
      setSelectedProduct(null)
      setCreatedBatches(null)
      setReceptionData(null)
    }
  }, [open])

  const handleSupplierClick = (supplier: string) => {
    setSelectedSupplier(supplier)
  }

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order)
  }

  const handleBack = () => {
    if (createdBatches) {
      setCreatedBatches(null)
    } else if (receptionData) {
      setReceptionData(null)
    } else if (selectedProduct) {
      setSelectedProduct(null)
    } else if (selectedOrder) {
      setSelectedOrder(null)
    } else if (selectedSupplier) {
      setSelectedSupplier(null)
    }
  }

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product)
  }

  const handleReceptionSubmit = async (data: ReceptionData) => {
    setReceptionData(data)
  }

  const handleFinalConfirmation = async () => {
    if (!receptionData) return

    setSupplierBatch(receptionData.supplierBatch)

    try {
      const response = await fetch("/api/supabase/stock/receive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: selectedProduct,
          supplier: selectedSupplier,
          receptionData: receptionData,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to process reception")
      }

      const result = await response.json()

      if (result.items) {
        setCreatedBatches(result.items)
        setReceptionData(null)
      }

      return result
    } catch (err) {
      console.error("[v0] Error processing reception:", err)
      throw err
    }
  }

  const handleValidationComplete = () => {
    setCreatedBatches(null)
    setSelectedProduct(null)
    setSelectedOrder(null)
    setSelectedSupplier(null)
    setReceptionData(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-hidden">
        {createdBatches ? (
          <div className="max-h-[70vh] overflow-y-auto pr-2">
            <StockValidationForm
              batches={createdBatches}
              product={selectedProduct!}
              supplier={selectedSupplier!}
              supplierBatch={supplierBatch}
              onBack={handleBack}
              onComplete={handleValidationComplete}
            />
          </div>
        ) : receptionData ? (
          <div className="max-h-[70vh] overflow-y-auto pr-2">
            <ReceptionSummary
              product={selectedProduct!}
              supplier={selectedSupplier!}
              receptionData={receptionData}
              onBack={handleBack}
              onConfirm={handleFinalConfirmation}
            />
          </div>
        ) : !selectedProduct ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                {(selectedSupplier || selectedOrder) && (
                  <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <div className="flex-1">
                  <DialogTitle className="text-2xl font-bold">
                    {selectedOrder
                      ? `${selectedOrder.code_commande}`
                      : selectedSupplier
                        ? selectedSupplier
                        : "Entrée de Stock"}
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    {selectedOrder
                      ? `${cleanHtmlText(selectedOrder.description_produit)}${selectedOrder.numero_commande ? ` - N° ${selectedOrder.numero_commande}` : ""} (${products.length} produit${products.length > 1 ? "s" : ""})`
                      : selectedSupplier
                        ? `${orders.length} commande${orders.length > 1 ? "s" : ""}`
                        : `Sélectionnez un fournisseur (${suppliers.length} fournisseur${suppliers.length > 1 ? "s" : ""})`}
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="mt-4 max-h-[50vh] overflow-y-auto pr-2">
              {!selectedSupplier ? (
                <>
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : error ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-red-800">
                      Erreur lors du chargement
                    </div>
                  ) : suppliers.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">Aucun fournisseur trouvé</div>
                  ) : (
                    <div className="space-y-2">
                      {suppliers.map((supplier: string, index: number) => (
                        <Button
                          key={index}
                          variant="outline"
                          className="w-full justify-start text-left hover:bg-accent bg-transparent h-auto py-3"
                          onClick={() => handleSupplierClick(supplier)}
                        >
                          <span className="font-medium text-base">{supplier}</span>
                        </Button>
                      ))}
                    </div>
                  )}
                </>
              ) : !selectedOrder ? (
                <>
                  {loadingOrders ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : error ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-red-800">
                      Erreur lors du chargement
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">Aucune commande trouvée</div>
                  ) : (
                    <div className="space-y-2">
                      {orders.map((order: Order, index: number) => (
                        <Button
                          key={index}
                          variant="outline"
                          className="w-full justify-start text-left hover:bg-accent bg-transparent h-auto py-3"
                          onClick={() => handleOrderClick(order)}
                        >
                          <div className="flex flex-col gap-1 w-full">
                            <span className="font-semibold text-base">{order.code_commande}</span>
                            <span className="text-sm text-muted-foreground whitespace-pre-line">
                              {cleanHtmlText(order.description_produit)}
                            </span>
                            {order.numero_commande && (
                              <span className="text-xs text-muted-foreground">N° {order.numero_commande}</span>
                            )}
                          </div>
                        </Button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {loadingProducts ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : error ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-red-800">
                      Erreur lors du chargement
                    </div>
                  ) : products.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">Aucun produit trouvé</div>
                  ) : (
                    <div className="space-y-3">
                      {products.map((product: Product) => (
                        <div
                          key={product.id}
                          className="rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                          onClick={() => handleProductClick(product)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-primary/10 p-2">
                              <Package className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-base mb-1 whitespace-pre-line">
                                {cleanHtmlText(product.description)}
                              </h3>
                              {product.reference && (
                                <p className="text-sm text-muted-foreground mb-1">Réf: {product.reference}</p>
                              )}
                              <div className="flex items-center gap-4 text-sm">
                                {product.quantity && (
                                  <span className="text-muted-foreground">
                                    Quantité: {Number.parseFloat(product.quantity).toFixed(2)}
                                    {product.unit && ` ${product.unit}`}
                                  </span>
                                )}
                                {product.status && (
                                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                    {product.status}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto pr-2">
            <ReceptionForm
              product={selectedProduct}
              supplier={selectedSupplier!}
              onBack={handleBack}
              onSubmit={handleReceptionSubmit}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
