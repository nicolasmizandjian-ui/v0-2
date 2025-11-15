import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    console.log("[v0] Fetching clients from atelier_monday table")

    const {
      data: items,
      error,
      count,
    } = await supabase
      .from("atelier_monday")
      .select("*", { count: "exact" })
      .eq("type_commande", "Atelier")
      .eq("statut", "À faire")

    console.log("[v0] Query completed")
    console.log("[v0] Error:", error)
    console.log("[v0] Count:", count)
    console.log("[v0] Items length:", items?.length || 0)

    if (error) {
      console.error("[v0] Supabase error fetching clients:", error)
      return NextResponse.json({ error: "Failed to fetch clients", details: error }, { status: 500 })
    }

    console.log("[v0] Total items retrieved:", items?.length || 0)

    const transformedItems =
      items?.map((item) => ({
        id: item.id?.toString() || "",
        name: item.reference_article_sonefi || "",
        column_values: [
          {
            id: "texte",
            text: item.client || "",
            value: item.client || "",
          },
          {
            id: "long-text",
            text: item.description_produit || "",
            value: item.description_produit || "",
          },
          {
            id: "Quantité",
            text: item.quantite?.toString() || "1",
            value: item.quantite || 1,
          },
          {
            id: "Unité",
            text: item.unite || "pièce",
            value: item.unite || "pièce",
          },
        ],
      })) || []

    console.log("[v0] Transformed items (all products):", transformedItems.length)

    const columns = [
      {
        id: "texte",
        title: "NOM CLIENT",
        type: "text",
      },
      {
        id: "long-text",
        title: "Description",
        type: "long-text",
      },
      {
        id: "Quantité",
        title: "Quantité",
        type: "number",
      },
      {
        id: "Unité",
        title: "Unité",
        type: "text",
      },
    ]

    return NextResponse.json({
      clients: transformedItems,
      columns: columns,
    })
  } catch (error) {
    console.error("[v0] Error fetching clients:", error)
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 })
  }
}
