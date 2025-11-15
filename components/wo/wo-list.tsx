"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/server"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

type WorkOrder = {
  id: string
  code: string
  customer: string | null
  due_date: string | null
  status: string
  created_at: string
}

const statusColors: Record<string, string> = {
  NOUVEAU: "bg-blue-500",
  EN_COURS: "bg-yellow-500",
  EN_ATTENTE: "bg-orange-500",
  TERMINE: "bg-green-500",
  ANNULE: "bg-gray-500",
}

export function WOList() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchWorkOrders() {
      try {
        const supabase = await createClient()
        const { data, error } = await supabase.from("work_orders").select("*").order("created_at", { ascending: false })

        if (error) throw error
        setWorkOrders(data || [])
      } catch (error) {
        console.error("[v0] Error fetching work orders:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchWorkOrders()
  }, [])

  if (loading) {
    return <div className="text-center py-8">Chargement des ordres...</div>
  }

  if (workOrders.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">Aucun ordre de fabrication</div>
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Date d'échéance</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Créé le</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workOrders.map((wo) => (
            <TableRow key={wo.id} className="cursor-pointer hover:bg-muted/50">
              <TableCell className="font-medium">
                <Link href={`/wo/${wo.id}`} className="hover:underline">
                  {wo.code}
                </Link>
              </TableCell>
              <TableCell>{wo.customer || "-"}</TableCell>
              <TableCell>{wo.due_date ? new Date(wo.due_date).toLocaleDateString("fr-FR") : "-"}</TableCell>
              <TableCell>
                <Badge className={statusColors[wo.status]}>{wo.status}</Badge>
              </TableCell>
              <TableCell>{new Date(wo.created_at).toLocaleDateString("fr-FR")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
