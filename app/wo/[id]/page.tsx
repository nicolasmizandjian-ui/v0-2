import { Suspense } from "react"
import { WODetail } from "@/components/wo/wo-detail"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Plus } from "lucide-react"
import Link from "next/link"

export default function WorkOrderDetailPage({
  params,
}: {
  params: { id: string }
}) {
  return (
    <div className="flex h-screen flex-col">
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/wo">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Détail de l'ordre</h1>
              <p className="text-sm text-muted-foreground">Opérations et suivi de production</p>
            </div>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une opération
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <Suspense fallback={<div>Chargement...</div>}>
          <WODetail woId={params.id} />
        </Suspense>
      </div>
    </div>
  )
}
