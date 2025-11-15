import { Suspense } from "react"
import { WOList } from "@/components/wo/wo-list"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function WorkOrdersPage() {
  return (
    <div className="flex h-screen flex-col">
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Ordres de fabrication</h1>
            <p className="text-sm text-muted-foreground">Gestion des ordres de fabrication et opérations</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Créer un ordre
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <Suspense fallback={<div>Chargement...</div>}>
          <WOList />
        </Suspense>
      </div>
    </div>
  )
}
