import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const orderCode = searchParams.get("orderCode")

  if (!orderCode) {
    return NextResponse.json({ error: "Order code parameter is required" }, { status: 400 })
  }

  try {
    const supabase = await createClient()

    console.log("[v0] Fetching products for order:", orderCode)

    const { data: products, error } = await supabase.from("entree_stock").select("*").eq("code_commande", orderCode)

    if (error) {
      console.error("[v0] Error fetching products:", error)
      throw error
    }

    const transformedProducts = (products || []).map((item) => ({
      id: item.id?.toString() || `${Math.random()}`,
      name: item.reference_fournisseur || item.reference_sellsy || "Sans référence",
      description: item.description_produit || "Sans description",
      quantity: item.quantite?.toString() || "0",
      unit: item.unite || "ML",
      reference: item.reference_sellsy || item.reference_fournisseur || "",
      status: "En attente de réception",
      rawData: item,
    }))

    console.log("[v0] Found products:", transformedProducts.length)

    return NextResponse.json({
      products: transformedProducts,
      total: transformedProducts.length,
    })
  } catch (error) {
    console.error("[v0] Error fetching products:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
