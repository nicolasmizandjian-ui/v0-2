import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { productIds } = await request.json()

    console.log("[v0] Starting assemblage for products:", productIds)

    const { error } = await supabase
      .from("atelier_monday")
      .update({ statut: "assemblage_en_cours" })
      .in("id", productIds)
      .eq("statut", "assemblage_a_faire")

    if (error) {
      console.error("[v0] Error starting assemblage:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Assemblage started successfully")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in assemblage start:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
