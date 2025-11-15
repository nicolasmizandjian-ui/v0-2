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

    // Get materials from table_matiere filtered by category and non-NULL reference_sonefi
    const { data: materials, error: materialsError } = await supabase
      .from("table_matiere")
      .select("reference_sonefi, reference_sellsy, categorie, fournisseur")
      .eq("categorie", category)
      .not("reference_sonefi", "is", null)
      .order("reference_sonefi", { ascending: true })

    if (materialsError) {
      console.error("[v0] Error fetching materials:", materialsError)
      return NextResponse.json({ error: materialsError.message }, { status: 500 })
    }

    // Get stock info from stock_monday_matieres for these materials
    const references = materials?.map((m) => m.reference_sonefi) || []

    if (references.length === 0) {
      return NextResponse.json({ materials: [] })
    }

    const { data: stocks, error: stocksError } = await supabase
      .from("stock_monday_matieres")
      .select("reference_sonefi, reference_sellsy, batch_sonefi, quantite, fournisseur")
      .in("reference_sonefi", references)

    if (stocksError) {
      console.error("[v0] Error fetching stocks:", stocksError)
      return NextResponse.json({ error: stocksError.message }, { status: 500 })
    }

    // Merge materials with stock data
    const materialsWithStock =
      materials?.map((material) => {
        const materialStocks = stocks?.filter((s) => s.reference_sonefi === material.reference_sonefi) || []

        return {
          reference_sonefi: material.reference_sonefi,
          reference_sellsy: material.reference_sellsy,
          categorie: material.categorie,
          fournisseur: material.fournisseur,
          batches: materialStocks.map((stock) => ({
            batch_sonefi: stock.batch_sonefi,
            quantite: stock.quantite,
            fournisseur: stock.fournisseur,
          })),
        }
      }) || []

    return NextResponse.json({ materials: materialsWithStock })
  } catch (error) {
    console.error("[v0] Error in materials route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
