import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { clientName, products, durationMinutes } = body

    console.log("[v0] Confection complete request:", { clientName, products, durationMinutes })

    if (!clientName || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: "clientName and products array required" }, { status: 400 })
    }

    for (const product of products) {
      const { reference } = product

      console.log(`[v0] Processing product ${reference} for confection completion`)

      const { data: existingProducts, error: fetchError } = await supabase
        .from("atelier_monday")
        .select("*")
        .eq("client", clientName)
        .eq("reference_article_sonefi", reference)
        .eq("statut", "confection_en_cours")

      if (fetchError) {
        console.error(`[v0] Error fetching product ${reference}:`, fetchError)
        continue
      }

      if (!existingProducts || existingProducts.length === 0) {
        console.warn(`[v0] No product found for ${reference} with status confection_en_cours`)
        continue
      }

      console.log(`[v0] Found ${existingProducts.length} product(s) to update for ${reference}`)

      const { data: updateData, error: updateError } = await supabase
        .from("atelier_monday")
        .update({
          statut: "a_expedier",
          temps_confection_minutes: durationMinutes || 0,
        })
        .eq("client", clientName)
        .eq("reference_article_sonefi", reference)
        .eq("statut", "confection_en_cours")
        .select()

      if (updateError) {
        console.error(`[v0] Error updating product ${reference}:`, updateError)
        continue
      }

      console.log(`[v0] Product ${reference} status updated to a_expedier:`, updateData)

      if (updateData && updateData.length > 0) {
        const productIds = updateData.map(p => p.id)
        
        const { data: affectations } = await supabase
          .from("affectations_produits")
          .select("*")
          .in("id_atelier", productIds)
          .eq("etape", "confection")
          .in("statut", ["en_attente", "en_cours"])

        if (affectations && affectations.length > 0) {
          await supabase
            .from("affectations_produits")
            .update({
              statut: "termine",
              date_fin: new Date().toISOString(),
            })
            .in("id", affectations.map(a => a.id))
          
          console.log(`[v0] Updated ${affectations.length} affectation(s) to 'termine' for product ${reference}`)
        }

        for (const updatedProduct of updateData) {
          await supabase.from("historique_mouvements_atelier").insert({
            type_mouvement: "CONFECTION_FIN",
            client: clientName,
            reference_article_sonefi: reference,
            statut_avant: "confection_en_cours",
            statut_apres: "a_expedier",
            quantite: updatedProduct.quantite,
            unite: updatedProduct.unite,
            duree_minutes: durationMinutes || 0,
            id_atelier: updatedProduct.id,
            note: `Confection terminée - Durée: ${durationMinutes || 0} minutes`,
            origine: "confection_complete",
          })
        }
        console.log("[v0] Recorded atelier movements for confection completion")
      }
    }

    return NextResponse.json({
      success: true,
      message: "Confection completed successfully",
    })
  } catch (error) {
    console.error("[v0] Error in confection complete route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
