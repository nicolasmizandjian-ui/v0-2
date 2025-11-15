import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    console.log("[v0] Fetching confection items from atelier_monday table")

    const { data: items, error } = await supabase
      .from("atelier_monday")
      .select("id, client, reference_article_sonefi, quantite, description_produit, statut, type_commande")
      .eq("type_commande", "Atelier")
      .eq("statut", "confection_a_faire")

    if (error) {
      console.error("[v0] Supabase error fetching confection items:", error)
      return NextResponse.json({ error: "Failed to fetch confection items", details: error }, { status: 500 })
    }

    console.log("[v0] Total confection items retrieved:", items?.length || 0)

    const clientMap = new Map()

    items?.forEach((item) => {
      const clientName = item.client
      if (clientName) {
        if (!clientMap.has(clientName)) {
          clientMap.set(clientName, {
            id: clientName,
            name: clientName,
            products: [],
            column_values: [
              {
                id: "texte",
                text: clientName,
                value: clientName,
              },
            ],
          })
        }

        clientMap.get(clientName).products.push({
          id: item.id?.toString() || Math.random().toString(),
          reference: item.reference_article_sonefi || "Référence inconnue",
          realizedQuantity: item.quantite?.toString() || "0",
          description: item.description_produit || "",
          clientName: clientName,
        })
      }
    })

    const transformedItems = Array.from(clientMap.values())

    console.log("[v0] Unique confection clients:", transformedItems.length)

    const columns = [
      {
        id: "texte",
        title: "NOM CLIENT",
        type: "text",
      },
    ]

    return NextResponse.json({
      clients: transformedItems,
      columns: columns,
    })
  } catch (error) {
    console.error("[v0] Error fetching confection items:", error)
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 })
  }
}
