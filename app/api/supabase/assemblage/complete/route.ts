import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { productIds, durationMinutes } = await request.json()

    console.log("[v0] Completing assemblage for products:", productIds, "duration:", durationMinutes)

    const { data: productsBeforeUpdate, error: fetchError } = await supabase
      .from("atelier_monday")
      .select("*")
      .in("id", productIds)
      .eq("statut", "assemblage_en_cours")

    if (fetchError) {
      console.error("[v0] Error fetching products:", fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const { data: updateData, error } = await supabase
      .from("atelier_monday")
      .update({
        statut: "a_expedier",
        temps_assemblage_minutes: durationMinutes || 0,
      })
      .in("id", productIds)
      .eq("statut", "assemblage_en_cours")
      .select()

    if (error) {
      console.error("[v0] Error completing assemblage:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Assemblage completed successfully")

    const { data: affectations } = await supabase
      .from("affectations_produits")
      .select("*")
      .in("id_atelier", productIds)
      .eq("etape", "assemblage")
      .in("statut", ["en_attente", "en_cours"])

    if (affectations && affectations.length > 0) {
      await supabase
        .from("affectations_produits")
        .update({
          statut: "termine",
          date_fin: new Date().toISOString(),
        })
        .in("id", affectations.map(a => a.id))
      
      console.log(`[v0] Updated ${affectations.length} affectation(s) to 'termine' for assemblage`)
    }

    if (updateData && updateData.length > 0) {
      for (const product of updateData) {
        await supabase.from("historique_mouvements_atelier").insert({
          type_mouvement: "ASSEMBLAGE_FIN",
          client: product.client,
          reference_article_sonefi: product.reference_article_sonefi,
          statut_avant: "assemblage_en_cours",
          statut_apres: "a_expedier",
          quantite: product.quantite,
          unite: product.unite,
          duree_minutes: durationMinutes || 0,
          id_atelier: product.id,
          note: `Assemblage terminé - Durée: ${durationMinutes || 0} minutes`,
          origine: "assemblage_complete",
        })
      }
      console.log("[v0] Recorded atelier movements for assemblage completion")
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in assemblage complete:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
