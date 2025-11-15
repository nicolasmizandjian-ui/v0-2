import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")

    if (!category) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 })
    }

    const supabase = await createClient()

    console.log("[v0] Fetching stock from Supabase, category:", category)

    // Fetch materials from stock with their batches
    const { data: stockData, error: stockError } = await supabase
      .from("stock_monday_matieres")
      .select("*")
      .not("reference_sonefi", "is", null)
      .eq("categorie", category)
      .gt("quantite", 0) // Only show materials with stock > 0

    if (stockError) {
      console.error("[v0] Error fetching materials stock:", stockError)
      return NextResponse.json({ error: "Failed to fetch materials stock" }, { status: 500 })
    }

    console.log("[v0] Total items retrieved from Supabase:", stockData?.length || 0)

    // Group by reference_sonefi
    const grouped = (stockData || []).reduce(
      (acc: Record<string, any>, item: any) => {
        const reference = item.reference_sonefi

        if (!acc[reference]) {
          acc[reference] = {
            reference_sonefi: reference,
            reference_sellsy: item.reference_sellsy || null,
            categorie: item.categorie,
            batches: [],
          }
        }

        acc[reference].batches.push({
          batch_sonefi: item.batch_sonefi,
          quantite: item.quantite,
          laize: item.laize_mm || null, // Changed from item.laize to item.laize_mm
          unite: item.unite || null,
        })

        return acc
      },
      {} as Record<string, any>,
    )

    const materials = Object.values(grouped)

    console.log("[v0] Materials in stock:", materials.length)

    return NextResponse.json({ materials })
  } catch (error) {
    console.error("[v0] Error in materials-stock API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
