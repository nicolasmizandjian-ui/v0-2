import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    console.log("[v0] Product quantities route called")

    const { references } = await request.json()
    console.log("[v0] Fetching quantities for references:", references)

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("atelier_monday")
      .select("reference_article_sonefi, quantite, unite")
      .in("reference_article_sonefi", references)

    if (error) {
      console.error("[v0] Error fetching quantities:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Found quantities for", data?.length || 0, "products")

    const quantityMap: Record<string, { quantity: number; unit: string }> = {}
    data?.forEach((row: any) => {
      const ref = row.reference_article_sonefi
      quantityMap[ref] = {
        quantity: row.quantite || 1,
        unit: row.unite || "pièce",
      }
      console.log(`[v0] ${ref}: ${row.quantite} ${row.unite}`)
    })

    return NextResponse.json({ quantities: quantityMap })
  } catch (error: any) {
    console.error("[v0] Product quantities error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
