"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type WorkOrder = {
  id: string
  code: string
  customer: string | null
  due_date: string | null
  status: string
}

type Operation = {
  id: string
  operation_type: string
  qty: number | null
  note: string | null
  created_at: string
}

export function WODetail({ woId }: { woId: string }) {
  const [wo, setWo] = useState<WorkOrder | null>(null)
  const [operations, setOperations] = useState<Operation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = await createClient()

        const [woResult, opsResult] = await Promise.all([
          supabase.from("work_orders").select("*").eq("id", woId).single(),
          supabase.from("operations").select("*").eq("wo_id", woId).order("created_at", { ascending: false }),
        ])

        if (woResult.error) throw woResult.error
        if (opsResult.error) throw opsResult.error

        setWo(woResult.data)
        setOperations(opsResult.data || [])
      } catch (error) {
        console.error("[v0] Error fetching WO details:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [woId])

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>
  }

  if (!wo) {
    return <div className="text-center py-8">Ordre non trouvé</div>
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Code</p>
            <p className="text-lg font-semibold">{wo.code}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Statut</p>
            <Badge>{wo.status}</Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Client</p>
            <p>{wo.customer || "-"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Date d'échéance</p>
            <p>{wo.due_date ? new Date(wo.due_date).toLocaleDateString("fr-FR") : "-"}</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Opérations</h2>
        {operations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Aucune opération</div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantité</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operations.map((op) => (
                  <TableRow key={op.id}>
                    <TableCell>{new Date(op.created_at).toLocaleString("fr-FR")}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{op.operation_type}</Badge>
                    </TableCell>
                    <TableCell>{op.qty || "-"}</TableCell>
                    <TableCell>{op.note || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
