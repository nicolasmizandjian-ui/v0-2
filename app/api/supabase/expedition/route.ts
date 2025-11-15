import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Fetch products with status "a_expedier"
    const { data: products, error } = await supabase
      .from("atelier_monday")
      .select("id, client, reference_article_sonefi, quantite, unite")
      .eq("statut", "a_expedier")

    if (error) {
      console.error("[v0] Error fetching expedition data:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group products by client
    const clientsMap = new Map<string, any[]>()

    products?.forEach((product) => {
      const clientName = product.client || "Client inconnu"
      if (!clientsMap.has(clientName)) {
        clientsMap.set(clientName, [])
      }
      clientsMap.get(clientName)?.push({
        id: product.id,
        reference: product.reference_article_sonefi || "N/A",
        clientName: clientName,
        quantity: product.quantite || 0,
        unit: product.unite || "unité",
      })
    })

    // Convert map to array
    const clients = Array.from(clientsMap.entries()).map(([clientName, products]) => ({
      clientName,
      products,
    }))

    return NextResponse.json({ clients })
  } catch (error) {
    console.error("[v0] Error in expedition route:", error)
    return NextResponse.json({ error: "Failed to fetch expedition data" }, { status: 500 })
  }
}
