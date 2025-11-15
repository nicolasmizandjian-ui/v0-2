import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const supplier = searchParams.get("supplier")

    if (!supplier) {
      return NextResponse.json({ error: "Supplier parameter is required" }, { status: 400 })
    }

    const supabase = await createClient()

    console.log("[v0] Fetching orders for supplier:", supplier)

    const { data: entreeStock, error } = await supabase
      .from("entree_stock")
      .select("code_commande, description_produit, numero_commande, fournisseur")
      .eq("fournisseur", supplier)
      .order("code_commande", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching orders from entree_stock:", error)
      throw error
    }

    // Group by code_commande to avoid duplicates
    const ordersMap = new Map<string, any>()
    ;(entreeStock || []).forEach((item) => {
      const orderCode = item.code_commande || item.numero_commande || "Sans code"

      if (!ordersMap.has(orderCode)) {
        ordersMap.set(orderCode, {
          code_commande: orderCode,
          description_produit: item.description_produit || "Sans description",
          numero_commande: item.numero_commande,
          fournisseur: item.fournisseur,
        })
      }
    })

    const orders = Array.from(ordersMap.values())

    console.log("[v0] Found orders for supplier:", orders.length)

    return NextResponse.json({
      orders,
      totalItems: orders.length,
    })
  } catch (error) {
    console.error("[v0] Error fetching orders:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
