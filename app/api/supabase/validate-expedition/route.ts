import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { clientName, products } = body

    if (!products || products.length === 0) {
      return NextResponse.json({ error: "No products provided" }, { status: 400 })
    }

    const productIds = products.map((p: any) => p.id)

    const { data: productsBeforeUpdate, error: fetchError } = await supabase
      .from("atelier_monday")
      .select("*")
      .in("id", productIds)

    if (fetchError) {
      console.error("[v0] Error fetching products:", fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const { data: updateData, error } = await supabase
      .from("atelier_monday")
      .update({
        statut: "expedie",
        date_expedition: new Date().toISOString(),
      })
      .in("id", productIds)
      .select()

    if (error) {
      console.error("[v0] Error updating expedition status:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (updateData && updateData.length > 0) {
      for (const product of updateData) {
        await supabase.from("historique_mouvements_atelier").insert({
          type_mouvement: "EXPEDITION",
          client: product.client,
          reference_article_sonefi: product.reference_article_sonefi,
          statut_avant: "a_expedier",
          statut_apres: "expedie",
          quantite: product.quantite,
          unite: product.unite,
          id_atelier: product.id,
          note: `Produit expédié le ${new Date().toLocaleDateString("fr-FR")}`,
          origine: "validate_expedition",
        })
      }
      console.log("[v0] Recorded atelier movements for expedition")
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in validate expedition route:", error)
    return NextResponse.json({ error: "Failed to validate expedition" }, { status: 500 })
  }
}
