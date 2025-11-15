import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { productRefs } = await request.json()

    if (!productRefs || !Array.isArray(productRefs)) {
      return NextResponse.json({ error: "productRefs array is required" }, { status: 400 })
    }

    console.log("[v0] Fetching technical datasheets from atelier_monday for products:", productRefs)

    const supabase = await createClient()

    const { data: atelierData, error } = await supabase
      .from("atelier_monday")
      .select("reference_article_sonefi, fiche_technique")
      .in("reference_article_sonefi", productRefs)

    if (error) {
      console.error("[v0] Error fetching from atelier_monday:", error)
      return NextResponse.json({ error: "Failed to fetch datasheets" }, { status: 500 })
    }

    console.log("[v0] atelier_monday query results:", atelierData)

    const datasheets: Record<string, Array<{ name: string; url: string }>> = {}

    if (atelierData && atelierData.length > 0) {
      for (const row of atelierData) {
        const productRef = row.reference_article_sonefi
        const ficheUrl = row.fiche_technique

        if (productRef && ficheUrl) {
          const fileName = ficheUrl.split("/").pop() || "Fiche technique"

          if (!datasheets[productRef]) {
            datasheets[productRef] = []
          }

          datasheets[productRef].push({
            name: fileName,
            url: ficheUrl,
          })

          console.log(`[v0] Found datasheet for ${productRef}: ${ficheUrl}`)
        }
      }
    }

    console.log("[v0] Final datasheets object:", datasheets)

    return NextResponse.json({ datasheets })
  } catch (error) {
    console.error("[v0] Error in datasheets route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
