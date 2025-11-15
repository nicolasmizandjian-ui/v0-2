import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { clientName, products } = body

    console.log("[v0] Confection start request:", { clientName, products })

    if (!clientName || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: "clientName and products array required" }, { status: 400 })
    }

    for (const product of products) {
      const { reference } = product

      console.log(`[v0] Starting confection for product ${reference}`)

      const { data: updateData, error: updateError } = await supabase
        .from("atelier_monday")
        .update({
          statut: "confection_en_cours",
        })
        .eq("client", clientName)
        .eq("reference_article_sonefi", reference)
        .eq("statut", "confection_a_faire")
        .select()

      if (updateError) {
        console.error(`[v0] Error updating product ${reference}:`, updateError)
        continue
      }

      console.log(`[v0] Product ${reference} status updated to confection_en_cours:`, updateData)
    }

    return NextResponse.json({
      success: true,
      message: "Confection started successfully",
    })
  } catch (error) {
    console.error("[v0] Error in confection start route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
