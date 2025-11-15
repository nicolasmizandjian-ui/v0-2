import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { product, supplier, receptionData } = await request.json()

    console.log("[v0] Processing reception to Supabase:", { product, supplier, receptionData })

    const supabase = await createClient()

    const createdItems = []

    const totalRollsQuantity = receptionData.rolls.reduce((sum: number, roll: any) => {
      return sum + Number.parseFloat(roll.quantity || "0")
    }, 0)

    const originalQuantity = Number.parseFloat(product.quantity)

    if (receptionData.partialDelivery) {
      const remainingQuantity = originalQuantity - totalRollsQuantity

      const { error: updateError } = await supabase
        .from("entree_stock")
        .update({ quantite: remainingQuantity })
        .eq("id", product.id)

      if (updateError) {
        console.error("[v0] Supabase error updating original entry:", updateError)
        throw new Error(updateError.message || "Failed to update original entry")
      }

      console.log(`[v0] Updated original entry to remaining quantity: ${remainingQuantity}`)

      for (let i = 0; i < receptionData.rolls.length; i++) {
        const roll = receptionData.rolls[i]

        const { data: newEntry, error: insertError } = await supabase
          .from("entree_stock")
          .insert({
            code_commande: product.rawData?.code_commande || null,
            acheteur: product.rawData?.acheteur || null,
            numero_commande: product.rawData?.numero_commande || null,
            reference_sellsy: product.reference || null,
            fournisseur: supplier,
            description_produit: product.description,
            quantite: Number.parseFloat(roll.quantity),
            unite: receptionData.unit,
            categorie: product.rawData?.categorie || null,
            emplacement: roll.location || null,
            date_commande: product.rawData?.date_commande || null,
            date_entree_stock: receptionData.receptionDate,
            reference_fournisseur: receptionData.supplierReference,
          })
          .select()
          .single()

        if (insertError) {
          console.error("[v0] Supabase error creating entry:", insertError)
          throw new Error(insertError.message || "Failed to create entry")
        }

        createdItems.push({
          rollIndex: i + 1,
          itemId: newEntry.id,
          quantity: roll.quantity,
          location: roll.location,
          batch: roll.batch,
        })

        console.log(`[v0] Created roll ${i + 1}:`, newEntry.id)
      }
    } else {
      if (receptionData.rolls.length > 0) {
        const firstRoll = receptionData.rolls[0]

        const { error: updateError } = await supabase
          .from("entree_stock")
          .update({
            quantite: Number.parseFloat(firstRoll.quantity),
            emplacement: firstRoll.location || null,
            date_entree_stock: receptionData.receptionDate,
            reference_fournisseur: receptionData.supplierReference,
          })
          .eq("id", product.id)

        if (updateError) {
          console.error("[v0] Supabase error updating original entry:", updateError)
          throw new Error(updateError.message || "Failed to update original entry")
        }

        createdItems.push({
          rollIndex: 1,
          itemId: product.id,
          quantity: firstRoll.quantity,
          location: firstRoll.location,
          batch: firstRoll.batch,
        })

        console.log("[v0] Updated original entry with first roll quantity")
      }

      for (let i = 1; i < receptionData.rolls.length; i++) {
        const roll = receptionData.rolls[i]

        const { data: newEntry, error: insertError } = await supabase
          .from("entree_stock")
          .insert({
            code_commande: product.rawData?.code_commande || null,
            acheteur: product.rawData?.acheteur || null,
            numero_commande: product.rawData?.numero_commande || null,
            reference_sellsy: product.reference || null,
            fournisseur: supplier,
            description_produit: product.description,
            quantite: Number.parseFloat(roll.quantity),
            unite: receptionData.unit,
            categorie: product.rawData?.categorie || null,
            emplacement: roll.location || null,
            date_commande: product.rawData?.date_commande || null,
            date_entree_stock: receptionData.receptionDate,
            reference_fournisseur: receptionData.supplierReference,
          })
          .select()
          .single()

        if (insertError) {
          console.error("[v0] Supabase error creating entry:", insertError)
          throw new Error(insertError.message || "Failed to create entry")
        }

        createdItems.push({
          rollIndex: i + 1,
          itemId: newEntry.id,
          quantity: roll.quantity,
          location: roll.location,
          batch: roll.batch,
        })

        console.log(`[v0] Created roll ${i + 1}:`, newEntry.id)
      }
    }

    return NextResponse.json({
      success: true,
      message: `${createdItems.length} produit(s) traité(s)`,
      items: createdItems,
    })
  } catch (error) {
    console.error("[v0] Error processing reception:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process reception" },
      { status: 500 },
    )
  }
}
