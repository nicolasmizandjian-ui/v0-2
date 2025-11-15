import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productReferences } = body

    if (!Array.isArray(productReferences) || productReferences.length === 0) {
      return NextResponse.json({ error: "productReferences array is required" }, { status: 400 })
    }

    console.log("[v0] Updating cutting status for products:", productReferences)

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("atelier_monday")
      .update({
        date_etape_decoupe: new Date().toISOString().split("T")[0], // Format YYYY-MM-DD
        statut: "decoupe_en_cours",
      })
      .in("reference_article_sonefi", productReferences)
      .select("id, reference_article_sonefi, client, quantite, unite, statut, date_etape_decoupe")

    if (error) {
      console.error("[v0] Error updating cutting status:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Successfully updated cutting status for products:", data)

    if (data && data.length > 0) {
      const productIds = data.map(p => p.id)
      
      const { data: affectations } = await supabase
        .from("affectations_produits")
        .select("*")
        .in("id_atelier", productIds)
        .eq("etape", "decoupe")
        .eq("statut", "en_attente")

      if (affectations && affectations.length > 0) {
        await supabase
          .from("affectations_produits")
          .update({
            statut: "en_cours",
            date_debut: new Date().toISOString(),
          })
          .in("id", affectations.map(a => a.id))
        
        console.log(`[v0] Updated ${affectations.length} affectation(s) to 'en_cours'`)
      }

      for (const product of data) {
        await supabase.from("historique_mouvements_atelier").insert({
          type_mouvement: "DECOUPE_DEBUT",
          client: product.client,
          reference_article_sonefi: product.reference_article_sonefi,
          statut_avant: "decoupe_a_faire",
          statut_apres: "decoupe_en_cours",
          quantite: product.quantite,
          unite: product.unite,
          id_atelier: product.id,
          note: "Découpe lancée",
          origine: "update_cutting_status",
        })
      }
      console.log("[v0] Recorded atelier movements for cutting start")
    }

    return NextResponse.json({
      success: true,
      updatedCount: data?.length || 0,
      updatedProducts: data,
    })
  } catch (error) {
    console.error("[v0] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
