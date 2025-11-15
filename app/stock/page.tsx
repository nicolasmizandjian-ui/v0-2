"use client"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Box, Package, Wrench, PackageOpen, Layers } from "lucide-react"
import { cn } from "@/lib/utils"
import { Suspense, useState } from "react"
import { StockTable } from "@/components/stock/stock-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { MovementDialog } from "@/components/movement-dialog"

const stockTabs = [
  {
    id: "matieres-premieres",
    name: "Matières premières",
    icon: Layers,
  },
  {
    id: "produits-finis",
    name: "Produits finis",
    icon: Package,
  },
  {
    id: "accessoires",
    name: "Accessoires",
    icon: Box,
  },
  {
    id: "outillages",
    name: "Outillages",
    icon: Wrench,
  },
  {
    id: "emballages",
    name: "Emballages",
    icon: PackageOpen,
  },
]

export default function StockPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get("tab") || "matieres-premieres"

  const [movementDialogOpen, setMovementDialogOpen] = useState(false)

  const handleTabChange = (tabId: string) => {
    router.push(`${pathname}?tab=${tabId}`)
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Sub-navigation */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Stock</h1>
            <p className="text-sm text-muted-foreground">Gestion des produits et lots en stock</p>
          </div>
          <Button onClick={() => setMovementDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un mouvement
          </Button>
        </div>
        <nav className="flex space-x-1 mt-4">
          {stockTabs.map((tab) => {
            const isActive = currentTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground",
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.name}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <Suspense fallback={<div>Chargement...</div>}>
          <StockTable category={currentTab} />
        </Suspense>
      </div>

      <MovementDialog open={movementDialogOpen} onOpenChange={setMovementDialogOpen} />
    </div>
  )
}
