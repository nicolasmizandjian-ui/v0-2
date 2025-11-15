import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

function getNextStatus(operationAReliser: string | null, hasCutting: boolean): string {
  // Si une découpe a été effectuée, le produit va en confection
  if (hasCutting) {
    return "confection_a_faire"
  }
  
  if (!operationAReliser) {
    return "a_expedier" // Par défaut expédition directe
  }

  switch (operationAReliser) {
    case "decoupe_couture":
      return "confection_a_faire"
    case "decoupe":
      return "a_expedier"
    case "decoupe_injection":
    case "decoupe_jonction":
      return "assemblage_a_faire"
    case "achat_revente":
      return "achat_revente_en_attente"
    default:
      return "a_expedier"
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientName, products, rollsUsed, durationMinutes } = body

    console.log("[v0] Complete cutting request:", { clientName, products, rollsUsed, durationMinutes })

    if (!clientName || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: "clientName and products array are required" }, { status: 400 })
    }

    const supabase = await createClient()

    const hasCutting = Array.isArray(rollsUsed) && rollsUsed.length > 0

    if (hasCutting) {
      for (const roll of rollsUsed) {
        const { batch, sellsyRef, soneFiRef, metrage } = roll

        if (!batch || !metrage || metrage <= 0) {
          console.warn(`[v0] Skipping roll with incomplete data:`, roll)
          continue
        }

        const { data: stockRoll, error: fetchStockError } = await supabase
          .from("stock_monday_matieres")
          .select("*")
          .eq("batch_sonefi", batch)
          .maybeSingle()

        if (fetchStockError) {
          console.error(`[v0] Error fetching stock for batch ${batch}:`, fetchStockError)
          continue
        }

        if (!stockRoll) {
          console.warn(`[v0] No stock found for batch ${batch}`)
          continue
        }

        const currentQuantity = Number(stockRoll.quantite) || 0
        const metrageUsed = Number(metrage) || 0
        const newQuantity = currentQuantity - metrageUsed

        if (newQuantity < 0) {
          console.warn(`[v0] Warning: Stock will be negative for batch ${batch} (${currentQuantity} - ${metrageUsed})`)
        }

        const { error: updateStockError } = await supabase
          .from("stock_monday_matieres")
          .update({ quantite: newQuantity })
          .eq("batch_sonefi", batch)

        if (updateStockError) {
          console.error(`[v0] Error updating stock for batch ${batch}:`, updateStockError)
          continue
        }

        await supabase.from("historique_mouvements_matieres").insert({
          type_mouvement: "DECOUPE",
          reference_sonefi: stockRoll.reference_sonefi,
          reference_sellsy: stockRoll.reference_sellsy,
          categorie_matiere: stockRoll.categorie,
          batch_sonefi: batch,
          batch_fournisseur: stockRoll.batch_fournisseur,
          fournisseur: stockRoll.fournisseur,
          laize_mm: stockRoll.laize_mm ? Number(stockRoll.laize_mm) : null,
          quantite_avant: currentQuantity,
          quantite_mouvement: -metrageUsed,
          quantite_apres: newQuantity,
          unite: stockRoll.unite,
          note: `Découpe pour production - Client: ${clientName} - ${products.length} produit(s)`,
          origine: "DECOUPE_PRODUCTION",
        })

        console.log(`[v0] Stock updated for batch ${batch}: ${currentQuantity} - ${metrageUsed} = ${newQuantity}`)
      }
    }

    for (const product of products) {
      const { reference, actualQuantity, estimatedQuantity, batchNumber, justification } = product

      console.log(`[v0] Processing product ${reference} for client ${clientName}`)

      const category = reference.substring(0, 2).toUpperCase()
      console.log(`[v0] Category extracted: ${category} from ${reference}`)

      const { data: categorieData, error: categorieError } = await supabase
        .from("table_categorie_produit")
        .select("operation_a_realiser")
        .eq("reference_produit", category)
        .maybeSingle()

      if (categorieError) {
        console.error(`[v0] Error fetching operation for category ${category}:`, categorieError)
      }

      const operationAReliser = categorieData?.operation_a_realiser || null
      const nextStatus = getNextStatus(operationAReliser, hasCutting)

      console.log(
        `[v0] Product ${reference}: category=${category}, operation=${operationAReliser}, hasCutting=${hasCutting}, nextStatus=${nextStatus}`,
      )

      const { data: existingProducts, error: fetchError } = await supabase
        .from("atelier_monday")
        .select("*")
        .eq("client", clientName)
        .eq("reference_article_sonefi", reference)
        .eq("statut", "decoupe_en_cours")

      if (fetchError) {
        console.error(`[v0] Error fetching product ${reference} for client ${clientName}:`, fetchError)
        continue
      }

      if (!existingProducts || existingProducts.length === 0) {
        console.warn(`[v0] No product found for ${reference} with status decoupe_en_cours for client ${clientName}`)
        continue
      }

      console.log(`[v0] Found ${existingProducts.length} product(s) to update for ${reference} (client: ${clientName})`)

      const { data: updateData, error: updateError } = await supabase
        .from("atelier_monday")
        .update({
          statut: nextStatus,
          temps_decoupe_minutes: durationMinutes || 0,
        })
        .eq("client", clientName)
        .eq("reference_article_sonefi", reference)
        .eq("statut", "decoupe_en_cours")
        .select()

      if (updateError) {
        console.error(`[v0] Error updating product ${reference} for client ${clientName}:`, updateError)
        continue
      }

      console.log(`[v0] Product ${reference} updated successfully for client ${clientName}:`, updateData)

      if (updateData && updateData.length > 0) {
        const productIds = updateData.map(p => p.id)
        
        const { data: affectations } = await supabase
          .from("affectations_produits")
          .select("*")
          .in("id_atelier", productIds)
          .eq("etape", "decoupe")
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
      }

      for (const updatedProduct of updateData) {
        await supabase.from("historique_mouvements_atelier").insert({
          type_mouvement: "DECOUPE_FIN",
          client: clientName,
          reference_article_sonefi: reference,
          statut_avant: "decoupe_en_cours",
          statut_apres: nextStatus,
          quantite: updatedProduct.quantite,
          unite: updatedProduct.unite,
          duree_minutes: durationMinutes || 0,
          rouleaux_utilises: hasCutting ? JSON.stringify(rollsUsed) : null,
          id_atelier: updatedProduct.id,
          note: `Découpe terminée - Durée: ${durationMinutes || 0} minutes`,
          origine: "complete_cutting",
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: "Cutting completed successfully",
    })
  } catch (error) {
    console.error("[v0] Error in complete-cutting route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
