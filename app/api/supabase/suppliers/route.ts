import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    console.log("[v0] Fetching suppliers from entree_stock table")

    const { data: entreeStock, error } = await supabase
      .from("entree_stock")
      .select("fournisseur")
      .order("fournisseur", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching from entree_stock:", error)
      throw error
    }

    // Extract unique suppliers
    const suppliersSet = new Set<string>()
    ;(entreeStock || []).forEach((item) => {
      if (item.fournisseur && item.fournisseur.trim()) {
        suppliersSet.add(item.fournisseur.trim())
      }
    })

    const suppliers = Array.from(suppliersSet).sort()

    console.log("[v0] Found suppliers:", suppliers.length)

    return NextResponse.json({
      suppliers,
      totalItems: suppliers.length,
    })
  } catch (error) {
    console.error("[v0] Error fetching suppliers:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
