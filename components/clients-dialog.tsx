"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Check, Lightbulb, BarChart3, FileText } from "lucide-react"

interface Client {
  id: string
  name: string
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
  quantity: string
  unit: string
}

interface ClientsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const handleChangeReference = (productId: string, reference: string) => {
  // Placeholder for handleChangeReference function
  console.log(`Changing reference for product ${productId} to ${reference}`)
}

export function ClientsDialog({ open, onOpenChange }: ClientsDialogProps) {
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [showOptimization, setShowOptimization] = useState(false)
  const [validatedSuggestions, setValidatedSuggestions] = useState<Set<string>>(new Set())
  const [showRollSelection, setShowRollSelection] = useState(false)
  const [rollSelectionStep, setRollSelectionStep] = useState<"finished" | "materials" | "batch" | "summary">("finished")
  const [references, setReferences] = useState<Record<string, string>>({})
  const [availableRolls, setAvailableRolls] = useState<Record<string, any[]>>({})
  const [selectedRolls, setSelectedRolls] = useState<Record<string, string[]>>({})
  const [loadingRolls, setLoadingRolls] = useState(false)
  const [productQuantities, setProductQuantities] = useState<Record<string, { quantity: number; unit: string }>>({})
  const [remainingQuantities, setRemainingQuantities] = useState<Record<string, number>>({})
  const [batchNumbers, setBatchNumbers] = useState<Record<string, string>>({})
  const [selectedBatches, setSelectedBatches] = useState<Record<string, string[]>>({})
  const [batchSurfaceAreas, setBatchSurfaceAreas] = useState<Record<string, Record<string, string>>>({})
  const [availableBatches, setAvailableBatches] = useState<Record<string, any[]>>({})
  const [loadingBatches, setLoadingBatches] = useState(false)
  const [technicalDatasheets, setTechnicalDatasheets] = useState<
    Record<string, Array<{ name: string; url: string; path: string }>>
  >({})

  const [cuttingTypes, setCuttingTypes] = useState<Record<string, Record<string, "normal" | "delaizage">>>({})
  const [widthReductions, setWidthReductions] = useState<Record<string, Record<string, string>>>({})

  const { data: clientsData, error: clientsError } = useSWR(open ? "/api/supabase/clients" : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // Cache for 1 minute
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
    const clientColumn = columns.find((col: any) => col.title === "NOM CLIENT" || col.id === "texte")
    const descriptionColumn = columns.find((col: any) => col.title === "Description" || col.type === "long-text")
    const quantityColumn = columns.find((col: any) => col.title === "Quantité")
    const unitColumn = columns.find((col: any) => col.title === "Unité")

    console.log(
      "[v0] All available columns:",
      columns.map((col: any) => ({ id: col.id, title: col.title, type: col.type })),
    )
    console.log("[v0] Columns found:", {
      clientColumn: clientColumn?.title,
      descriptionColumn: descriptionColumn?.title,
      quantityColumn: quantityColumn?.title,
      unitColumn: unitColumn?.title,
    })

    if (!clientColumn) return []

    const excludePatterns = ["Port & EmbP", "Port & EmbM", "Port & EmbG"]

    return clients
      .filter((item: any) => {
        const clientCol = item.column_values.find((col: any) => col.id === clientColumn.id)
        const itemClientName = clientCol?.text?.trim()
        const shouldExclude = excludePatterns.some((pattern) => item.name.includes(pattern))

        return itemClientName === clientName && !shouldExclude
      })
      .map((item: any) => {
        const clientCol = item.column_values.find((col: any) => col.id === clientColumn.id)
        const descCol = descriptionColumn
          ? item.column_values.find((col: any) => col.id === descriptionColumn.id)
          : null
        const qtyCol = quantityColumn ? item.column_values.find((col: any) => col.id === quantityColumn.id) : null
        const unitCol = unitColumn ? item.column_values.find((col: any) => col.id === unitColumn.id) : null

        console.log(
          `[v0] Product ${item.name} - All columns:`,
          item.column_values.map((col: any) => ({ id: col.id, text: col.text })),
        )
        console.log(`[v0] Product ${item.name} - Quantity: ${qtyCol?.text}, Unit: ${unitCol?.text}`)

        return {
          id: item.id,
          reference: item.name,
          clientName: clientCol?.text?.trim() || "Client inconnu",
          description: descCol?.text || "",
          quantity: qtyCol?.text || "1",
          unit: unitCol?.text || "pièce",
        }
      })
  }

  const extractMaterialCode = (reference: string): string | null => {
    const parts = reference.split("_")
    if (parts.length >= 2) {
      return parts[1]
    }
    return null
  }

  const currentProducts = useMemo(() => {
    return selectedClient ? getProductsForClient(selectedClient) : []
  }, [selectedClient, clients, columns])

  const selectedProductsDetails = useMemo(() => {
    if (!selectedClient) return []
    const products = getProductsForClient(selectedClient)
    return products.filter((p) => selectedProducts.has(p.id))
  }, [selectedClient, selectedProducts, clients, columns])

  const optimizationSuggestions = useMemo(() => {
    const selectedMaterials = new Set(
      selectedProductsDetails.map((p) => extractMaterialCode(p.reference)).filter((m): m is string => m !== null),
    )

    if (selectedMaterials.size === 0) return []

    const clientColumn = columns.find((col: any) => col.title === "NOM CLIENT" || col.id === "texte")
    const descriptionColumn = columns.find((col: any) => col.title === "Description" || col.type === "long-text")

    if (!clientColumn) return []

    const excludePatterns = ["Port & EmbP", "Port & EmbM", "Port & EmbG"]
    const suggestions: Array<{ material: string; products: Product[] }> = []

    selectedMaterials.forEach((material) => {
      const matchingProducts = clients
        .filter((item: any) => {
          const clientCol = item.column_values.find((col: any) => col.id === clientColumn.id)
          const itemClientName = clientCol?.text?.trim()
          const shouldExclude = excludePatterns.some((pattern) => item.name.includes(pattern))
          const itemMaterial = extractMaterialCode(item.name)

          return itemClientName !== selectedClient && !shouldExclude && itemMaterial === material
        })
        .map((item: any) => {
          const clientCol = item.column_values.find((col: any) => col.id === clientColumn.id)
          const descCol = descriptionColumn
            ? item.column_values.find((col: any) => col.id === descriptionColumn.id)
            : null

          return {
            id: item.id,
            reference: item.name,
            clientName: clientCol?.text?.trim() || "Client inconnu",
            description: descCol?.text || "",
            quantity: item.column_values.find((col: any) => col.id === "Quantité")?.text || "1",
            unit: item.column_values.find((col: any) => col.id === "Unité")?.text || "pièce",
          }
        })

      if (matchingProducts.length > 0) {
        suggestions.push({ material, products: matchingProducts })
      }
    })

    return suggestions
  }, [selectedProductsDetails, clients, columns, selectedClient])

  const summaryStats = useMemo(() => {
    if (!showOptimization) return null

    const mainReferences = selectedProductsDetails.length
    const optimizedReferences = validatedSuggestions.size
    const totalPieces = mainReferences + optimizedReferences

    const allProducts = [
      ...selectedProductsDetails,
      ...optimizationSuggestions.flatMap((s) => s.products.filter((p) => validatedSuggestions.has(p.id))),
    ]
    const materials = new Set(
      allProducts.map((p) => extractMaterialCode(p.reference)).filter((m): m is string => m !== null),
    )

    return {
      mainReferences,
      optimizedReferences,
      totalPieces,
      differentMaterials: materials.size,
    }
  }, [showOptimization, selectedProductsDetails, validatedSuggestions, optimizationSuggestions])

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

  const handleClientClick = (clientName: string) => {
    setSelectedClient(clientName)
    setSelectedProducts(new Set())
    setShowOptimization(false)
  }

  const handleBackToClients = () => {
    setSelectedClient(null)
    setSelectedProducts(new Set())
    setShowOptimization(false)
  }

  const handleOptimizeClick = () => {
    setShowOptimization(true)
  }

  const handleBackFromOptimization = () => {
    setShowOptimization(false)
    setValidatedSuggestions(new Set())
  }

  const toggleSuggestionValidation = (productId: string) => {
    console.log("[v0] Toggle suggestion validation for product:", productId)
    setValidatedSuggestions((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(productId)) {
        newSet.delete(productId)
        console.log("[v0] Removed suggestion:", productId)
      } else {
        newSet.add(productId)
        console.log("[v0] Added suggestion:", productId)
      }
      console.log("[v0] Total validated suggestions:", newSet.size)
      return newSet
    })
  }

  const extractSellsyReference = (reference: string): string => {
    if (reference.startsWith("TF")) {
      return ""
    }

    const parts = reference.split("_")
    if (parts.length >= 2) {
      return parts[1]
    }

    return ""
  }

  const handleContinueToMaterials = async () => {
    setLoadingRolls(true)

    const allProducts = [
      ...selectedProductsDetails,
      ...optimizationSuggestions.flatMap((s) => s.products.filter((p) => validatedSuggestions.has(p.id))),
    ]

    const productReferences = allProducts.map((p) => p.reference)
    let fetchedQuantities: Record<string, { quantity: number; unit: string }> = {}
    try {
      const quantitiesResponse = await fetch("/api/supabase/product-quantities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ references: productReferences }),
      })
      const quantitiesData = await quantitiesResponse.json()
      fetchedQuantities = quantitiesData.quantities || {}
      setProductQuantities(fetchedQuantities)
      console.log("[v0] Fetched quantities:", fetchedQuantities)
    } catch (error) {
      console.error("[v0] Error fetching quantities:", error)
    }

    const refs: Record<string, string> = {}
    const rolls: Record<string, any[]> = {}

    for (const product of allProducts) {
      const sellsyRef = extractSellsyReference(product.reference)
      refs[product.id] = sellsyRef

      const quantityData = fetchedQuantities[product.reference]
      const quantityNeeded = quantityData ? quantityData.quantity : Number.parseInt(product.quantity) || 1

      console.log(`[v0] Product ${product.reference} - Quantity needed: ${quantityNeeded}`)

      try {
        const response = await fetch("/api/supabase/rolls/smart-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productReference: product.reference,
            quantityNeeded: quantityNeeded,
          }),
        })

        const data = await response.json()
        rolls[product.id] = data.rolls || []

        console.log(
          `[v0] Smart search for ${product.reference}: found ${rolls[product.id].length} rolls (${data.searchType})`,
        )
        if (data.remainingQuantity !== undefined) {
          console.log(`[v0] Remaining quantity for ${product.reference}: ${data.remainingQuantity}`)
        }
      } catch (error) {
        console.error(`[v0] Error in smart search for ${product.reference}:`, error)
        rolls[product.id] = []
      }
    }

    setReferences(refs)
    setAvailableRolls(rolls)
    setLoadingRolls(false)
    setShowRollSelection(true)
  }

  const handleBackFromRollSelection = () => {
    setShowRollSelection(false)
    setRollSelectionStep("finished")
    setReferences({})
    setAvailableRolls({})
    setSelectedRolls({})
    setBatchNumbers({})
    // The variable 'surfaceAreas' was undeclared. It has been removed.
    // setSurfaceAreas({})
    setAvailableBatches({})
    setLoadingBatches(false)
    setSelectedBatches({})
    setBatchSurfaceAreas({}) // Clear batch surface areas on back
    setTechnicalDatasheets({}) // Clear technical datasheets on back
    setCuttingTypes({})
    setWidthReductions({})
  }

  const toggleRollSelection = (productId: string, rollId: string) => {
    console.log(`[v0] Toggle roll selection - Product: ${productId}, Roll: ${rollId}`)

    setSelectedRolls((prev) => {
      const current = prev[productId] || []
      const newSelection = current.includes(rollId) ? current.filter((id) => id !== rollId) : [...current, rollId]

      console.log(`[v0] Updated selection for ${productId}:`, newSelection)

      return {
        ...prev,
        [productId]: newSelection,
      }
    })
  }

  const calculateRemainingQuantity = (productId: string): number => {
    const rolls = availableRolls[productId] || []
    const selectedRollIds = selectedRolls[productId] || []
    const finishedProducts = rolls.filter((r) => r.isFinishedProduct)

    // Calculate total quantity from selected finished products
    const selectedFinishedStock = finishedProducts
      .filter((roll) => selectedRollIds.includes(roll.id))
      .reduce((sum, roll) => sum + (Number.parseFloat(roll.stock) || 0), 0)

    // Get the original quantity needed
    const product = [
      ...selectedProductsDetails,
      ...optimizationSuggestions.flatMap((s) => s.products.filter((p) => validatedSuggestions.has(p.id))),
    ].find((p) => p.id === productId)

    if (!product) return 0

    const quantityData = productQuantities[product.reference]
    const quantityNeeded = quantityData ? quantityData.quantity : Number.parseInt(product.quantity) || 1

    // Calculate remaining quantity
    const remaining = Math.max(0, quantityNeeded - selectedFinishedStock)

    console.log(
      `[v0] Product ${productId} - Needed: ${quantityNeeded}, Selected stock: ${selectedFinishedStock}, Remaining: ${remaining}`,
    )

    return remaining
  }

  const handleMoveToMaterials = () => {
    // Calculate remaining quantities for all products
    const newRemainingQuantities: Record<string, number> = {}

    const allProducts = [
      ...selectedProductsDetails,
      ...optimizationSuggestions.flatMap((s) => s.products.filter((p) => validatedSuggestions.has(p.id))),
    ]

    allProducts.forEach((product) => {
      newRemainingQuantities[product.id] = calculateRemainingQuantity(product.id)
    })

    setRemainingQuantities(newRemainingQuantities)
    setRollSelectionStep("materials")

    console.log("[v0] Remaining quantities after deducting selected finished products:", newRemainingQuantities)
  }

  const handleBatchSelection = (rollKey: string, batchId: string) => {
    setSelectedBatches((prev) => {
      const currentBatches = prev[rollKey] || []

      // If batch is already selected, remove it
      if (currentBatches.includes(batchId)) {
        const newBatches = currentBatches.filter((id) => id !== batchId)
        console.log(`[v0] Deselected batch ${batchId} for ${rollKey}`)

        // Also remove the surface area for this batch
        setBatchSurfaceAreas((prevAreas) => {
          const newAreas = { ...prevAreas }
          if (newAreas[rollKey]) {
            delete newAreas[rollKey][batchId]
          }
          return newAreas
        })

        // Also remove cutting type and width reduction for this batch
        setCuttingTypes((prevTypes) => {
          const newTypes = { ...prevTypes }
          if (newTypes[rollKey]) {
            delete newTypes[rollKey][batchId]
          }
          return newTypes
        })
        setWidthReductions((prevReductions) => {
          const newReductions = { ...prevReductions }
          if (newReductions[rollKey]) {
            delete newReductions[rollKey][batchId]
          }
          return newReductions
        })

        return {
          ...prev,
          [rollKey]: newBatches,
        }
      }

      // Otherwise, add the batch to the selection
      console.log(`[v0] Selected batch ${batchId} for ${rollKey}`)
      return {
        ...prev,
        [rollKey]: [...currentBatches, batchId],
      }
    })
  }

  const handleBatchSurfaceAreaChange = (rollKey: string, batchId: string, value: string) => {
    setBatchSurfaceAreas((prev) => ({
      ...prev,
      [rollKey]: {
        ...(prev[rollKey] || {}),
        [batchId]: value,
      },
    }))
  }

  const handleCuttingTypeChange = (rollKey: string, batchId: string, type: "normal" | "delaizage") => {
    setCuttingTypes((prev) => ({
      ...prev,
      [rollKey]: {
        ...(prev[rollKey] || {}),
        [batchId]: type,
      },
    }))

    // Reset width reduction when switching to normal cutting
    if (type === "normal") {
      setWidthReductions((prev) => {
        const newReductions = { ...prev }
        if (newReductions[rollKey]) {
          delete newReductions[rollKey][batchId]
        }
        return newReductions
      })
    }
  }

  const handleWidthReductionChange = (rollKey: string, batchId: string, value: string) => {
    setWidthReductions((prev) => ({
      ...prev,
      [rollKey]: {
        ...(prev[rollKey] || {}),
        [batchId]: value,
      },
    }))
  }

  const fetchTechnicalDatasheets = async (productRefs: string[]) => {
    try {
      const response = await fetch("/api/supabase/materials/datasheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productRefs }),
      })

      const data = await response.json()
      if (data.datasheets) {
        setTechnicalDatasheets(data.datasheets)
        console.log("[v0] Fetched technical datasheets:", data.datasheets)
      }
    } catch (error) {
      console.error("[v0] Error fetching technical datasheets:", error)
    }
  }

  const handleMoveToBatchInput = async () => {
    setLoadingBatches(true)

    const allProducts = [
      ...selectedProductsDetails,
      ...optimizationSuggestions.flatMap((s) => s.products.filter((p) => validatedSuggestions.has(p.id))),
    ]

    const selectedMaterialRolls: Array<{ productId: string; rollId: string; materialRef: string }> = []

    allProducts.forEach((product) => {
      const rolls = availableRolls[product.id] || []
      const selectedRollIds = selectedRolls[product.id] || []
      const rawMaterials = rolls.filter((r) => !r.isFinishedProduct)

      selectedRollIds.forEach((rollId) => {
        const roll = rawMaterials.find((r) => r.id === rollId)
        if (roll) {
          selectedMaterialRolls.push({
            productId: product.id,
            rollId: rollId,
            materialRef: roll.batch,
          })
        }
      })
    })

    const batchesData: Record<string, any[]> = {}

    try {
      const uniqueMaterialRefs = Array.from(new Set(selectedMaterialRolls.map((m) => m.materialRef)))

      console.log("[v0] Fetching batches for material refs:", uniqueMaterialRefs)

      const response = await fetch("/api/supabase/materials/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialRefs: uniqueMaterialRefs }),
      })

      const data = await response.json()

      if (data.batches) {
        Object.assign(batchesData, data.batches)
      }

      console.log("[v0] Fetched batches for materials:", batchesData)

      const productReferences = allProducts.map((p) => p.reference)
      await fetchTechnicalDatasheets(productReferences)
    } catch (error) {
      console.error("[v0] Error fetching batches:", error)
    }

    setAvailableBatches(batchesData)
    setLoadingBatches(false)
    setRollSelectionStep("batch")
  }

  const handleBatchNumberChange = (rollKey: string, value: string) => {
    setBatchNumbers((prev) => ({
      ...prev,
      [rollKey]: value,
    }))
  }

  // Removed original handleSurfaceAreaChange as it's replaced by handleBatchSurfaceAreaChange
  // const handleSurfaceAreaChange = (rollKey: string, value: string) => {
  //   setSurfaceAreas((prev) => ({
  //     ...prev,
  //     [rollKey]: value,
  //   }))
  // }

  const getAllSelectedRolls = () => {
    const allProducts = [
      ...selectedProductsDetails,
      ...optimizationSuggestions.flatMap((s) => s.products.filter((p) => validatedSuggestions.has(p.id))),
    ]

    const selectedRollsDetails: Array<{
      productId: string
      productReference: string
      roll: any
      rollKey: string // Combines productId and rollId for unique identification
    }> = []

    allProducts.forEach((product) => {
      const rolls = availableRolls[product.id] || []
      const selectedRollIds = selectedRolls[product.id] || []

      selectedRollIds.forEach((rollId) => {
        const roll = rolls.find((r) => r.id === rollId)
        if (roll) {
          const rollKey = `${product.id}_${rollId}`
          selectedRollsDetails.push({
            productId: product.id,
            productReference: product.reference,
            roll,
            rollKey,
          })
        }
      })
    })

    return selectedRollsDetails
  }

  const handleValidateBatchData = () => {
    setRollSelectionStep("summary")
  }

  const handleFinalSubmit = async () => {
    const selectedRollsDetails = getAllSelectedRolls()

    const submissionData = {
      client: selectedClient,
      products: selectedRollsDetails.map((item) => ({
        productReference: item.productReference,
        rollBatch: item.roll.batch,
        batchNumbers: selectedBatches[item.rollKey] || [],
        surfaceAreas: batchSurfaceAreas[item.rollKey] || {},
        cuttingTypes: cuttingTypes[item.rollKey] || {},
        widthReductions: widthReductions[item.rollKey] || {},
      })),
      datasheets: technicalDatasheets,
    }

    console.log("[v0] Final cutting data to submit:", submissionData)

    try {
      const response = await fetch("/api/manufacturing-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData),
      })

      if (response.ok) {
        const html = await response.text()
        const blob = new Blob([html], { type: "text/html" })
        const url = window.URL.createObjectURL(blob)
        window.open(url, "_blank")
        window.URL.revokeObjectURL(url)

        const allProducts = [
          ...selectedProductsDetails,
          ...optimizationSuggestions.flatMap((s) => s.products.filter((p) => validatedSuggestions.has(p.id))),
        ]

        const productsByClient: Record<string, Array<{ reference: string; quantity: number; unit: string }>> = {}

        allProducts.forEach((product) => {
          const clientName = product.clientName
          const quantityData = productQuantities[product.reference]
          const productDetail = {
            reference: product.reference,
            quantity: quantityData ? quantityData.quantity : Number.parseInt(product.quantity) || 1,
            unit: quantityData ? quantityData.unit : product.unit || "pièce",
          }

          if (!productsByClient[clientName]) {
            productsByClient[clientName] = []
          }
          productsByClient[clientName].push(productDetail)
        })

        const allProductReferences = allProducts.map((p) => p.reference)

        try {
          const updateResponse = await fetch("/api/supabase/update-cutting-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productReferences: allProductReferences }),
          })

          if (!updateResponse.ok) {
            console.error("[v0] Failed to update cutting status in Supabase")
          } else {
            const updateData = await updateResponse.json()
            console.log("[v0] Successfully updated cutting status:", updateData)
          }
        } catch (updateError) {
          console.error("[v0] Error updating cutting status:", updateError)
        }

        Object.entries(productsByClient).forEach(([clientName, products]) => {
          const clientRolls: Array<{
            rollReference: string
            rollBatch: string
            plannedQuantity: number
            unit: string
            sellsyRef?: string
            laize?: string
            metrage?: number
          }> = []

          selectedRollsDetails.forEach((item) => {
            const product = allProducts.find((p) => p.reference === item.productReference)
            if (product && product.clientName === clientName && !item.roll.isFinishedProduct) {
              const selectedBatchIds = selectedBatches[item.rollKey] || []
              const materialBatches = availableBatches[item.roll.batch] || []

              selectedBatchIds.forEach((batchId) => {
                const surfaceArea = batchSurfaceAreas[item.rollKey]?.[batchId]
                const batch = materialBatches.find((b) => b.id.toString() === batchId)

                if (surfaceArea && batch) {
                  clientRolls.push({
                    rollReference: item.roll.batch, // reference_sonefi (MPA90)
                    rollBatch: batch.batchSonefi || batch.batchFournisseur, // batch number
                    plannedQuantity: Number.parseFloat(surfaceArea),
                    unit: item.roll.unit || "ML",
                    sellsyRef: item.roll.sellsyRef || item.roll.batch, // Référence Sellsy (MPA90)
                    laize: batch.laize?.toString() || item.roll.laize, // Laize in mm
                    metrage: Number.parseFloat(surfaceArea), // Initial metrage value
                  })
                }
              })
            }
          })

          window.dispatchEvent(
            new CustomEvent("cuttingActionStarted", {
              detail: {
                client: clientName,
                productsCount: products.length,
                products: products,
                rolls: clientRolls,
              },
            }),
          )
        })

        alert("Ordre de fabrication généré avec succès !")
        onOpenChange(false)
      } else {
        throw new Error("Failed to generate manufacturing order")
      }
    } catch (error) {
      console.error("[v0] Error generating manufacturing order:", error)
      alert("Erreur lors de la génération de l'ordre de fabrication")
    }
  }

  const extractQuantity = (product: Product): string => {
    const quantityData = productQuantities[product.reference]
    if (quantityData) {
      return `${quantityData.quantity} ${quantityData.unit}`
    }
    return `${product.quantity} ${product.unit}`
  }

  const fetchClients = async () => {
    // Placeholder for fetchClients function
    console.log("Fetching clients...")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[70vh] flex flex-col p-0">
        {/* Made header more compact */}
        <DialogHeader className="px-3 pt-3 pb-2 flex-shrink-0 border-b">
          <DialogTitle className="text-sm">
            {showRollSelection
              ? // Updated title for summary step
                rollSelectionStep === "summary"
                ? "Bilan de la découpe"
                : rollSelectionStep === "batch"
                  ? "Informations de découpe"
                  : "Vérification stock"
              : showOptimization
                ? "Optimisation"
                : selectedClient
                  ? `${selectedClient}`
                  : "Clients - Atelier"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {showRollSelection
              ? // Updated description for summary step
                rollSelectionStep === "summary"
                ? "Vérifiez et validez l'opération"
                : rollSelectionStep === "batch"
                  ? "Renseignez le batch et la surface"
                  : "Vérifiez la disponibilité et sélectionnez les matières"
              : showOptimization
                ? "Optimisez la découpe"
                : selectedClient
                  ? "Sélectionnez les produits"
                  : "Sélectionnez un client"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0 px-3">
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
              <Button onClick={fetchClients} variant="outline" className="w-full bg-transparent">
                Réessayer
              </Button>
            </div>
          )}

          {!loading && !error && showRollSelection && (
            <div className="flex flex-col h-full">
              <Button
                onClick={handleBackFromRollSelection}
                variant="ghost"
                className="gap-2 h-7 text-xs mb-2 flex-shrink-0 -ml-2"
              >
                <ChevronLeft className="h-3 w-3" />
                Retour
              </Button>

              {loadingRolls ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner className="h-8 w-8" />
                  <span className="ml-3 text-sm text-muted-foreground">Chargement...</span>
                </div>
              ) : (
                <>
                  <div className="flex gap-1 border-b border-border flex-shrink-0 -mx-3 px-3">
                    <button
                      onClick={() => setRollSelectionStep("finished")}
                      className={`px-2 py-1 text-xs font-medium border-b-2 transition-colors ${
                        rollSelectionStep === "finished"
                          ? "border-blue-600 text-blue-600"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Produits finis
                    </button>
                    <button
                      onClick={() => setRollSelectionStep("materials")}
                      className={`px-2 py-1 text-xs font-medium border-b-2 transition-colors ${
                        rollSelectionStep === "materials"
                          ? "border-orange-600 text-orange-600"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Matières
                    </button>
                    <button
                      onClick={() => setRollSelectionStep("batch")}
                      className={`px-2 py-1 text-xs font-medium border-b-2 transition-colors ${
                        rollSelectionStep === "batch"
                          ? "border-purple-600 text-purple-600"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Découpe
                    </button>
                    <button
                      onClick={() => setRollSelectionStep("summary")}
                      className={`px-2 py-1 text-xs font-medium border-b-2 transition-colors ${
                        rollSelectionStep === "summary"
                          ? "border-green-600 text-green-600"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Bilan
                    </button>
                  </div>

                  <ScrollArea className="flex-1 mt-2 -mx-3 px-3 [&>[data-radix-scroll-area-viewport]]:max-h-[calc(70vh-220px)]">
                    <div className="space-y-2 pb-2">
                      {rollSelectionStep === "summary" ? (
                        <div className="space-y-3">
                          {/* Client info */}
                          <div className="rounded-lg bg-blue-50 border-2 border-blue-200 p-3">
                            <h3 className="font-semibold text-sm text-blue-800 mb-1">Client</h3>
                            <p className="text-sm font-medium">{selectedClient}</p>
                          </div>

                          {/* Products to make */}
                          <div className="rounded-lg bg-green-50 border-2 border-green-200 p-3">
                            <h3 className="font-semibold text-sm text-green-800 mb-2">Produits à fabriquer</h3>
                            <div className="space-y-2">
                              {[
                                ...selectedProductsDetails,
                                ...optimizationSuggestions.flatMap((s) =>
                                  s.products.filter((p) => validatedSuggestions.has(p.id)),
                                ),
                              ].map((product) => (
                                <div key={product.id} className="bg-white rounded-md p-2 border border-green-300">
                                  <p className="font-semibold text-xs">{product.reference}</p>
                                  <p className="text-xs text-muted-foreground">{extractQuantity(product)}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Finished products used */}
                          {(() => {
                            const finishedProductsUsed = getAllSelectedRolls().filter(
                              (item) => item.roll.isFinishedProduct,
                            )
                            if (finishedProductsUsed.length === 0) return null

                            return (
                              <div className="rounded-lg bg-emerald-50 border-2 border-emerald-200 p-3">
                                <h3 className="font-semibold text-sm text-emerald-800 mb-2">Produits finis utilisés</h3>
                                <div className="space-y-2">
                                  {finishedProductsUsed.map((item) => (
                                    <div
                                      key={item.rollKey}
                                      className="bg-white rounded-md p-2 border border-emerald-300"
                                    >
                                      <p className="font-semibold text-xs">{item.productReference}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {item.roll.batch} - {Math.round(Number.parseFloat(item.roll.stock) || 0)}{" "}
                                        {item.roll.unit}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          })()}

                          {/* Raw materials to cut */}
                          {(() => {
                            const rawMaterialsToCut = getAllSelectedRolls().filter(
                              (item) => !item.roll.isFinishedProduct,
                            )
                            if (rawMaterialsToCut.length === 0) return null

                            return (
                              <div className="rounded-lg bg-orange-50 border-2 border-orange-200 p-3">
                                <h3 className="font-semibold text-sm text-orange-800 mb-2">Matières à découper</h3>
                                <div className="space-y-2">
                                  {rawMaterialsToCut.map((item) => {
                                    const selectedBatchIds = selectedBatches[item.rollKey] || []
                                    const materialBatches = availableBatches[item.roll.batch] || []

                                    return (
                                      <div
                                        key={item.rollKey}
                                        className="bg-white rounded-md p-2 border border-orange-300"
                                      >
                                        <p className="font-semibold text-xs">{item.productReference}</p>
                                        <p className="text-xs text-muted-foreground">Matière: {item.roll.batch}</p>

                                        {selectedBatchIds.length > 0 && (
                                          <div className="mt-2 space-y-1.5">
                                            {selectedBatchIds.map((batchId) => {
                                              const batch = materialBatches.find((b) => b.id.toString() === batchId)
                                              const surfaceArea = batchSurfaceAreas[item.rollKey]?.[batchId]
                                              const cuttingType = cuttingTypes[item.rollKey]?.[batchId] || "normal"
                                              const widthReduction = widthReductions[item.rollKey]?.[batchId]

                                              if (!batch) return null

                                              return (
                                                <div
                                                  key={batchId}
                                                  className="bg-orange-50 rounded p-1.5 border border-orange-300"
                                                >
                                                  <p className="text-xs text-orange-700 font-medium">
                                                    Batch: {batch.batchSonefi || batch.batchFournisseur}
                                                  </p>
                                                  <p className="text-xs text-muted-foreground">
                                                    Type:{" "}
                                                    {cuttingType === "delaizage" ? "✂️ Délaizage" : "🔲 Découpe normale"}
                                                  </p>
                                                  {cuttingType === "delaizage" && widthReduction && (
                                                    <p className="text-xs font-medium text-orange-800">
                                                      Largeur enlevée: {widthReduction}mm → Nouvelle largeur:{" "}
                                                      {Number(batch.laize) - Number(widthReduction)}mm
                                                    </p>
                                                  )}
                                                  {cuttingType === "normal" && (
                                                    <p className="text-xs text-muted-foreground">
                                                      Stock: {Math.round(batch.stock)} {batch.unit} • Laize:{" "}
                                                      {batch.laize}
                                                      mm
                                                    </p>
                                                  )}
                                                  {surfaceArea && (
                                                    <p className="text-xs font-bold text-orange-800 mt-0.5">
                                                      Surface: {surfaceArea} {item.roll.unit || "ML"}
                                                    </p>
                                                  )}
                                                </div>
                                              )
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          })()}
                        </div>
                      ) : rollSelectionStep === "batch" ? (
                        <>
                          {loadingBatches ? (
                            <div className="flex items-center justify-center py-8">
                              <Spinner className="h-6 w-6" />
                              <span className="ml-3 text-sm text-muted-foreground">Chargement des batchs...</span>
                            </div>
                          ) : (
                            <>
                              {getAllSelectedRolls().map((item) => {
                                const materialBatches = availableBatches[item.roll.batch] || []
                                const selectedBatchIds = selectedBatches[item.rollKey] || []
                                const datasheets = technicalDatasheets[item.productReference] || []

                                console.log(
                                  `[v0] Looking up batches for material: ${item.roll.batch}, found: ${materialBatches.length}`,
                                )

                                return (
                                  <div
                                    key={item.rollKey}
                                    className="rounded-lg border-2 border-purple-200 bg-purple-50 p-3"
                                  >
                                    <div className="mb-2">
                                      <p className="font-semibold text-xs">{item.productReference}</p>
                                      <p className="text-xs text-muted-foreground mt-0.5">Matière: {item.roll.batch}</p>
                                      {item.roll.laize && (
                                        <p className="text-xs text-purple-700 font-medium mt-0.5">
                                          Laize: {item.roll.laize} mm
                                        </p>
                                      )}
                                      {datasheets.length > 0 && (
                                        <div className="mt-1 space-y-0.5">
                                          {datasheets.map((datasheet, index) => (
                                            <a
                                              key={index}
                                              href={datasheet.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline mr-2"
                                            >
                                              <FileText className="h-3 w-3" />
                                              {datasheet.name}
                                            </a>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    <div className="space-y-2">
                                      {materialBatches.length > 0 ? (
                                        <>
                                          <div>
                                            <label className="block text-xs font-medium mb-1.5">
                                              Sélectionner les batchs (plusieurs possibles)
                                            </label>
                                            <div className="space-y-1.5">
                                              {materialBatches.map((batch) => {
                                                const isSelected = selectedBatchIds.includes(batch.id.toString())
                                                const cuttingType =
                                                  cuttingTypes[item.rollKey]?.[batch.id.toString()] || "normal"
                                                const widthReduction =
                                                  widthReductions[item.rollKey]?.[batch.id.toString()] || ""

                                                return (
                                                  <div key={batch.id} className="space-y-1.5">
                                                    <div
                                                      onClick={() =>
                                                        handleBatchSelection(item.rollKey, batch.id.toString())
                                                      }
                                                      className={`flex items-start gap-2 rounded-md border-2 p-2 cursor-pointer transition-all ${
                                                        isSelected
                                                          ? "border-purple-600 bg-purple-100 shadow-md"
                                                          : "border-purple-200 bg-white hover:border-purple-400 hover:bg-purple-50"
                                                      }`}
                                                    >
                                                      <div
                                                        className={`flex items-center justify-center w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 transition-colors ${
                                                          isSelected
                                                            ? "border-purple-600 bg-purple-600"
                                                            : "border-purple-400 bg-white"
                                                        }`}
                                                      >
                                                        {isSelected && (
                                                          <Check className="h-4 w-4 text-white" strokeWidth={3} />
                                                        )}
                                                      </div>
                                                      <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-2">
                                                          <div className="flex-1">
                                                            <p className="font-semibold text-xs">
                                                              Batch: {batch.batchSonefi || batch.batchFournisseur}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                              ID: {batch.id}
                                                            </p>
                                                          </div>
                                                          <div className="text-right">
                                                            <p className="text-xs font-bold text-purple-700">
                                                              {Math.round(batch.stock)} {batch.unit}
                                                            </p>
                                                            <p className="text-xs text-purple-600 font-medium">
                                                              Laize: {batch.laize}mm
                                                            </p>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    </div>

                                                    {isSelected && (
                                                      <div className="ml-7 bg-purple-100 border border-purple-300 rounded-md p-2 space-y-2">
                                                        <div>
                                                          <label className="block text-xs font-medium mb-1">
                                                            Type de découpe
                                                          </label>
                                                          <div className="flex gap-2">
                                                            <button
                                                              onClick={() =>
                                                                handleCuttingTypeChange(
                                                                  item.rollKey,
                                                                  batch.id.toString(),
                                                                  "normal",
                                                                )
                                                              }
                                                              className={`flex-1 px-2 py-1.5 text-xs rounded-md border-2 transition-all ${
                                                                cuttingType === "normal"
                                                                  ? "border-purple-600 bg-purple-600 text-white font-medium"
                                                                  : "border-purple-300 bg-white text-purple-700 hover:bg-purple-50"
                                                              }`}
                                                            >
                                                              🔲 Découpe normale
                                                            </button>
                                                            <button
                                                              onClick={() =>
                                                                handleCuttingTypeChange(
                                                                  item.rollKey,
                                                                  batch.id.toString(),
                                                                  "delaizage",
                                                                )
                                                              }
                                                              className={`flex-1 px-2 py-1.5 text-xs rounded-md border-2 transition-all ${
                                                                cuttingType === "delaizage"
                                                                  ? "border-orange-600 bg-orange-600 text-white font-medium"
                                                                  : "border-purple-300 bg-white text-purple-700 hover:bg-purple-50"
                                                              }`}
                                                            >
                                                              ✂️ Délaizage
                                                            </button>
                                                          </div>
                                                        </div>

                                                        {cuttingType === "delaizage" && (
                                                          <div className="bg-orange-50 border border-orange-300 rounded-md p-2">
                                                            <label className="block text-xs font-medium mb-1 text-orange-800">
                                                              Largeur à enlever (mm)
                                                            </label>
                                                            <input
                                                              type="number"
                                                              step="1"
                                                              value={widthReduction}
                                                              onChange={(e) =>
                                                                handleWidthReductionChange(
                                                                  item.rollKey,
                                                                  batch.id.toString(),
                                                                  e.target.value,
                                                                )
                                                              }
                                                              placeholder="Ex: 300"
                                                              className="w-full px-2 py-1.5 text-xs border border-orange-400 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                                                            />
                                                            {widthReduction && (
                                                              <p className="text-xs font-medium text-orange-800 mt-1">
                                                                Nouvelle largeur:{" "}
                                                                {Number(batch.laize) - Number(widthReduction)}mm
                                                              </p>
                                                            )}
                                                          </div>
                                                        )}

                                                        {/* Surface area input */}
                                                        <div>
                                                          <label className="block text-xs font-medium mb-1">
                                                            Surface à décompter de ce batch ({item.roll.unit || "ML"})
                                                          </label>
                                                          <input
                                                            type="number"
                                                            step="0.1"
                                                            value={
                                                              batchSurfaceAreas[item.rollKey]?.[batch.id.toString()] ||
                                                              ""
                                                            }
                                                            onChange={(e) =>
                                                              handleBatchSurfaceAreaChange(
                                                                item.rollKey,
                                                                batch.id.toString(),
                                                                e.target.value,
                                                              )
                                                            }
                                                            placeholder="Ex: 10.5"
                                                            className="w-full px-2 py-1.5 text-xs border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                          />
                                                        </div>
                                                      </div>
                                                    )}
                                                  </div>
                                                )
                                              })}
                                            </div>
                                          </div>
                                        </>
                                      ) : (
                                        <div className="bg-yellow-50 border border-yellow-300 rounded-md p-2">
                                          <p className="text-xs text-yellow-800">
                                            Aucun batch disponible pour cette matière. Veuillez vérifier le stock.
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          {[
                            ...selectedProductsDetails,
                            ...optimizationSuggestions.flatMap((s) =>
                              s.products.filter((p) => validatedSuggestions.has(p.id)),
                            ),
                          ].map((product) => {
                            const sellsyRef = references[product.id]
                            const rolls = availableRolls[product.id] || []
                            const selectedRollIds = selectedRolls[product.id] || []
                            const isTFProduct = product.reference.startsWith("TF")

                            const finishedProducts = rolls.filter((r) => r.isFinishedProduct)
                            const rawMaterials = rolls.filter((r) => !r.isFinishedProduct)

                            const hasFinishedProducts = finishedProducts.length > 0
                            const hasRawMaterials = rawMaterials.length > 0

                            if (rollSelectionStep === "finished" && !hasFinishedProducts) {
                              return null
                            }
                            if (rollSelectionStep === "materials" && !hasRawMaterials) {
                              return null
                            }

                            return (
                              <div key={product.id} className="rounded-lg border-2 border-border bg-card p-3">
                                <div className="mb-2 flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-xs truncate">{product.reference}</p>
                                    <p className="text-xs text-muted-foreground truncate">{product.clientName}</p>
                                    {product.description && (
                                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                        {product.description}
                                      </p>
                                    )}
                                  </div>
                                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-md whitespace-nowrap flex-shrink-0">
                                    {extractQuantity(product)}
                                  </span>
                                </div>

                                {isTFProduct ? (
                                  <div className="space-y-1.5">
                                    <p className="text-xs font-medium">Choisir le coton:</p>
                                    <div className="flex gap-1.5">
                                      <Button
                                        variant={sellsyRef === "CO60" ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handleChangeReference(product.id, "CO60")}
                                        className="flex-1 h-7 text-xs"
                                      >
                                        CO60
                                      </Button>
                                      <Button
                                        variant={sellsyRef === "CO52" ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handleChangeReference(product.id, "CO52")}
                                        className="flex-1 h-7 text-xs"
                                      >
                                        CO52
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="mb-2">
                                    <p className="text-xs">
                                      <span className="font-medium">Référence Sellsy:</span>{" "}
                                      <span className="text-blue-600">{sellsyRef || "Non trouvée"}</span>
                                    </p>
                                  </div>
                                )}

                                {sellsyRef && (
                                  <div className="mt-2 space-y-2">
                                    {rollSelectionStep === "finished" && finishedProducts.length > 0 && (
                                      <div>
                                        <p className="text-xs font-medium mb-1.5 text-green-700">
                                          ✓ Produits finis ({finishedProducts.length})
                                        </p>
                                        <div className="space-y-1.5">
                                          {finishedProducts.map((roll) => (
                                            <div
                                              key={roll.id}
                                              onClick={() => toggleRollSelection(product.id, roll.id)}
                                              className="flex items-start gap-2 rounded-lg border-2 border-green-200 bg-green-50 p-2 hover:bg-green-100 transition-colors cursor-pointer"
                                            >
                                              <div className="flex items-center justify-center w-4 h-4 rounded border-2 border-green-600 flex-shrink-0 mt-0.5">
                                                {selectedRollIds.includes(roll.id) && (
                                                  <Check className="h-3 w-3 text-green-600" strokeWidth={3} />
                                                )}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-1">
                                                  <p className="font-medium text-xs truncate">{roll.batch}</p>
                                                  <span className="text-xs px-1.5 py-0.5 bg-green-600 text-white rounded-full whitespace-nowrap">
                                                    {Math.round(Number.parseFloat(roll.stock) || 0)} {roll.unit || "ML"}
                                                  </span>
                                                </div>
                                                <div className="flex gap-2 mt-0.5 text-xs text-muted-foreground">
                                                  {roll.sellsyRef && (
                                                    <span className="truncate">Réf: {roll.sellsyRef}</span>
                                                  )}
                                                  {roll.laize && (
                                                    <span className="whitespace-nowrap">Laize: {roll.laize}mm</span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {rollSelectionStep === "materials" && hasRawMaterials && (
                                      <div>
                                        {(() => {
                                          const remaining = remainingQuantities[product.id]
                                          // If remaining quantity is 0 or undefined, don't show this product in materials tab
                                          if (remaining === undefined || remaining <= 0) {
                                            return null
                                          }

                                          return (
                                            <>
                                              <div className="mb-1.5 px-2 py-1.5 bg-orange-100 border border-orange-300 rounded-md">
                                                <p className="text-xs font-medium text-orange-800">
                                                  Restant à produire: {remaining}{" "}
                                                  {productQuantities[product.reference]?.unit || "unité"}
                                                </p>
                                              </div>
                                              <p className="text-xs font-medium mb-1.5 text-orange-700">
                                                Matières à découper ({rawMaterials.length})
                                              </p>
                                              <div className="grid grid-cols-2 gap-1.5">
                                                {rawMaterials.map((roll) => (
                                                  <div
                                                    key={roll.id}
                                                    onClick={() => toggleRollSelection(product.id, roll.id)}
                                                    className="flex items-start gap-1.5 rounded-lg border-2 border-orange-200 bg-orange-50 p-1.5 hover:bg-orange-100 transition-colors cursor-pointer"
                                                  >
                                                    <div className="flex items-center justify-center w-3.5 h-3.5 rounded border-2 border-orange-600 flex-shrink-0 mt-0.5">
                                                      {selectedRollIds.includes(roll.id) && (
                                                        <Check
                                                          className="h-2.5 w-2.5 text-orange-600"
                                                          strokeWidth={3}
                                                        />
                                                      )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                      <div className="flex items-center justify-between gap-1">
                                                        <p className="font-medium text-xs truncate">
                                                          {roll.reference_sonefi || roll.batch}
                                                        </p>
                                                        <span className="text-xs px-1 py-0.5 bg-orange-600 text-white rounded-full whitespace-nowrap">
                                                          {Math.round(Number.parseFloat(roll.stock) || 0)}
                                                        </span>
                                                      </div>
                                                      <div className="flex flex-col gap-0.5 mt-0.5">
                                                        {roll.sellsyRef && (
                                                          <p className="text-xs text-orange-700 truncate">
                                                            Réf: {roll.sellsyRef}
                                                          </p>
                                                        )}
                                                        {roll.laize && (
                                                          <p className="text-xs font-medium text-orange-800">
                                                            {roll.laize}mm
                                                          </p>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </>
                                          )
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </>
                      )}
                    </div>
                  </ScrollArea>

                  <div className="flex-shrink-0 pt-2 pb-2 -mx-3 px-3 border-t border-border bg-background sticky bottom-0">
                    <div className="flex justify-between gap-2">
                      {rollSelectionStep === "finished" ? (
                        <Button
                          onClick={handleMoveToMaterials}
                          className="bg-blue-600 hover:bg-blue-700 text-white h-11 text-base font-bold shadow-lg"
                        >
                          Valider et passer aux matières →
                        </Button>
                      ) : rollSelectionStep === "materials" ? (
                        <>
                          <Button
                            onClick={() => setRollSelectionStep("finished")}
                            variant="outline"
                            className="h-11 text-sm px-3"
                          >
                            ← Retour
                          </Button>
                          <Button
                            onClick={handleMoveToBatchInput}
                            className="bg-orange-600 hover:bg-orange-700 text-white h-11 text-base font-bold shadow-lg ring-2 ring-orange-300"
                          >
                            Valider la sélection →
                          </Button>
                        </>
                      ) : rollSelectionStep === "batch" ? (
                        <>
                          <Button
                            onClick={() => setRollSelectionStep("materials")}
                            variant="outline"
                            className="h-11 text-sm px-3"
                          >
                            ← Retour
                          </Button>
                          <Button
                            onClick={handleValidateBatchData}
                            className="bg-purple-600 hover:bg-purple-700 text-white h-11 text-base font-bold shadow-lg"
                          >
                            Voir le bilan →
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            onClick={() => setRollSelectionStep("batch")}
                            variant="outline"
                            className="h-11 text-sm px-3"
                          >
                            ← Retour
                          </Button>
                          <Button
                            onClick={handleFinalSubmit}
                            className="bg-green-600 hover:bg-green-700 text-white h-11 text-base font-bold shadow-lg ring-4 ring-green-300"
                          >
                            🚀 Lancer la découpe
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {!loading && !error && showOptimization && !showRollSelection && (
            <div className="flex flex-col h-full">
              <Button
                onClick={handleBackFromOptimization}
                variant="ghost"
                className="gap-2 h-7 text-xs mb-2 flex-shrink-0 -ml-2"
              >
                <ChevronLeft className="h-3 w-3" />
                Retour aux produits
              </Button>

              <ScrollArea className="flex-1 -mx-3 px-3 [&>[data-radix-scroll-area-viewport]]:max-h-[calc(70vh-180px)]">
                <div className="space-y-3 pb-2">
                  <div className="rounded-lg bg-green-50 border-2 border-green-200 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <h3 className="font-semibold text-sm text-green-800">Références confirmées</h3>
                    </div>
                    <p className="text-xs text-green-700 mb-2">
                      {selectedClient} - {selectedProductsDetails.length} référence
                      {selectedProductsDetails.length > 1 ? "s" : ""} sélectionnée
                      {selectedProductsDetails.length > 1 ? "s" : ""}
                    </p>
                    <div className="space-y-1.5">
                      {selectedProductsDetails.map((product) => {
                        const material = extractMaterialCode(product.reference)
                        return (
                          <div key={product.id} className="bg-white rounded-md p-2 border border-green-200">
                            <p className="font-semibold text-xs">{product.reference}</p>
                            {material && <p className="text-xs text-muted-foreground mt-0.5">Matière: {material}</p>}
                            {product.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{product.description}</p>
                            )}
                            <span className="inline-block mt-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                              Sélectionné
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {optimizationSuggestions.length > 0 && (
                    <div className="rounded-lg bg-orange-50 border-2 border-orange-200 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="h-4 w-4 text-orange-600" />
                        <h3 className="font-semibold text-sm text-orange-800">Suggestions d'optimisation</h3>
                      </div>
                      <p className="text-xs text-orange-700 mb-3">
                        Nous avons trouvé d'autres clients avec des matières similaires. Regrouper les découpes
                        permettra d'optimiser la production.
                      </p>

                      <div className="space-y-3">
                        {optimizationSuggestions.map(({ material, products }) => (
                          <div key={material}>
                            <p className="text-xs font-semibold text-orange-800 mb-1.5">
                              Matière: {material} - {products.length} suggestion{products.length > 1 ? "s" : ""}
                            </p>
                            <div className="space-y-1.5">
                              {products.map((product) => (
                                <div
                                  key={product.id}
                                  onClick={() => {
                                    console.log("[v0] Clicked on suggestion card:", product.id)
                                    toggleSuggestionValidation(product.id)
                                  }}
                                  className={`w-full bg-white rounded-md p-2 border-2 transition-all cursor-pointer ${
                                    validatedSuggestions.has(product.id)
                                      ? "border-orange-500 bg-orange-50 shadow-md"
                                      : "border-orange-200 hover:border-orange-400 hover:bg-orange-50/50"
                                  }`}
                                >
                                  <div className="flex items-start gap-2">
                                    <div
                                      className={`flex items-center justify-center w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 transition-colors ${
                                        validatedSuggestions.has(product.id)
                                          ? "border-orange-600 bg-orange-600"
                                          : "border-orange-400 bg-white hover:bg-orange-100"
                                      }`}
                                    >
                                      {validatedSuggestions.has(product.id) && (
                                        <Check className="h-4 w-4 text-white" strokeWidth={3} />
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                          <p className="font-semibold text-xs text-blue-600">{product.clientName}</p>
                                          <p className="text-xs text-muted-foreground mt-0.5">
                                            Client: {product.clientName} • Commande standard
                                          </p>
                                          <p className="font-medium text-xs mt-1">{product.reference}</p>
                                          {product.description && (
                                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                              {product.description}
                                            </p>
                                          )}
                                        </div>
                                        <div className="flex gap-1">
                                          <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                            Standard
                                          </span>
                                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                            Découper
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {optimizationSuggestions.length === 0 && (
                    <div className="rounded-lg bg-orange-50 border-2 border-orange-200 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="h-4 w-4 text-orange-600" />
                        <h3 className="font-semibold text-sm text-orange-800">Suggestions d'optimisation</h3>
                      </div>
                      <p className="text-xs text-orange-700">
                        Aucune suggestion trouvée. Les matières sélectionnées sont uniques à ce client.
                      </p>
                    </div>
                  )}

                  {summaryStats && (
                    <div className="rounded-lg bg-blue-50 border-2 border-blue-200 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="h-4 w-4 text-blue-600" />
                        <h3 className="font-semibold text-sm text-blue-800">Résumé de la découpe</h3>
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        <div className="text-center">
                          <p className="text-xl font-bold text-blue-900">{summaryStats.mainReferences}</p>
                          <p className="text-xs text-blue-700 mt-0.5">Références principales</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xl font-bold text-orange-600">{summaryStats.optimizedReferences}</p>
                          <p className="text-xs text-blue-700 mt-0.5">Références optimisées</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xl font-bold text-blue-900">{summaryStats.totalPieces}</p>
                          <p className="text-xs text-blue-700 mt-0.5">Pièces totales</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xl font-bold text-blue-900">{summaryStats.differentMaterials}</p>
                          <p className="text-xs text-blue-700 mt-0.5">Matières différentes</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="flex-shrink-0 pt-2 pb-2 -mx-3 px-3 border-t border-border bg-background sticky bottom-0">
                <Button
                  onClick={handleContinueToMaterials}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 text-base font-bold shadow-lg"
                >
                  Continuer vers les matières →
                </Button>
              </div>
            </div>
          )}

          {!loading && !error && selectedClient && !showOptimization && !showRollSelection && (
            <div className="flex flex-col h-full">
              {/* Made back button more compact */}
              <Button onClick={handleBackToClients} variant="ghost" className="gap-2 h-7 text-xs mb-2 -ml-2">
                <ChevronLeft className="h-3 w-3" />
                Retour aux clients
              </Button>

              <ScrollArea className="flex-1 -mx-3 px-3">
                <div className="space-y-2 pb-2">
                  {currentProducts.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => toggleProductSelection(product.id)}
                      className="flex items-start gap-2 rounded-lg border border-border bg-card px-3 py-2 hover:bg-accent/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-center w-4 h-4 rounded border-2 border-primary flex-shrink-0 mt-0.5">
                        {selectedProducts.has(product.id) && <Check className="h-3 w-3 text-primary" strokeWidth={3} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{product.reference}</p>
                        {product.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{product.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex-shrink-0 pt-2 pb-2 -mx-3 px-3 border-t border-border bg-background sticky bottom-0">
                <Button
                  onClick={handleOptimizeClick}
                  disabled={selectedProducts.size === 0}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 h-10 text-sm font-bold shadow-lg"
                >
                  Optimiser la découpe →
                </Button>
              </div>
            </div>
          )}

          {!loading && !error && !selectedClient && clientNames.length > 0 && (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {clientNames.map((clientName, index) => (
                  <button
                    key={index}
                    onClick={() => handleClientClick(clientName)}
                    className="w-full text-left rounded-lg border border-border bg-card px-4 py-3 hover:bg-accent/50 transition-colors"
                  >
                    <p className="font-medium text-foreground">{clientName}</p>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}

          {!loading && !error && clients.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">Aucun client trouvé dans la page Atelier</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
