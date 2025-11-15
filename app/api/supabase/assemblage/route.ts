import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("atelier_monday")
      .select("id, client, reference_article_sonefi, quantite, statut")
      .eq("statut", "assemblage_a_faire")
      .order("client")

    if (error) {
      console.error("[v0] Error fetching assemblage data:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group products by client
    const clientsMap = new Map()

    data?.forEach((item) => {
      if (!clientsMap.has(item.client)) {
        clientsMap.set(item.client, {
          name: item.client,
          products: [],
        })
      }

      clientsMap.get(item.client).products.push({
        id: item.id,
        reference: item.reference_article_sonefi,
        realizedQuantity: item.quantite || 0,
        description: "",
      })
    })

    const clients = Array.from(clientsMap.values())
    console.log("[v0] Assemblage clients:", clients.length)

    return NextResponse.json({ clients })
  } catch (error) {
    console.error("[v0] Error in assemblage route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
