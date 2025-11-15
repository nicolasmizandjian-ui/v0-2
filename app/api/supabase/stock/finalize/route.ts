import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { itemId, stockType, category, supplierBatch, sonefiReference, supplierReference, width } =
      await request.json()

    console.log("[v0] Finalizing stock item:", {
      itemId,
      stockType,
    })

    const supabase = await createClient()

    const { data: entryData, error: fetchError } = await supabase
      .from("entree_stock")
      .select("*")
      .eq("id", itemId)
      .single()

    if (fetchError || !entryData) {
      console.error("[v0] Error fetching entry:", fetchError)
      throw new Error("Entry not found")
    }

    let targetTable = ""
    if (stockType === "matieres") {
      targetTable = "stock_monday_matieres"
    } else if (stockType === "accessoires") {
      targetTable = "stock_monday_accessoires"
    } else if (stockType === "produits_finis") {
      targetTable = "stock_monday_produits_finis"
    } else {
      throw new Error("Invalid stock type")
    }

    console.log("[v0] Moving to table:", targetTable)

    const { error: insertError } = await supabase.from(targetTable).insert({
      batch_sonefi: itemId,
      reference_sellsy: entryData.reference_sellsy || null,
      reference_sonefi: sonefiReference || null,
      quantite: entryData.quantite,
      unite: entryData.unite,
      categorie: category || entryData.categorie,
      emplacement: entryData.emplacement,
      fournisseur: entryData.fournisseur,
      batch_fournisseur: supplierBatch || null,
      reference_fournisseur: supplierReference || entryData.reference_fournisseur,
      laize_mm: width || null,
      acheteur: entryData.acheteur,
      numero_commande: entryData.numero_commande,
      prix_unitaire_ht: 0,
      date_entree: entryData.date_entree_stock || new Date().toISOString().split("T")[0],
    })

    if (insertError) {
      console.error("[v0] Supabase error inserting into stock table:", insertError)
      throw new Error(insertError.message || "Failed to insert into stock table")
    }

    console.log("[v0] Successfully inserted into", targetTable)

    const { error: deleteError } = await supabase.from("entree_stock").delete().eq("id", itemId)

    if (deleteError) {
      console.error("[v0] Supabase error deleting entry:", deleteError)
      throw new Error(deleteError.message || "Failed to delete entry")
    }

    console.log("[v0] Successfully deleted from entree_stock:", itemId)

    return NextResponse.json({
      success: true,
      message: "Stock finalized successfully",
      targetTable,
    })
  } catch (error) {
    console.error("[v0] Error finalizing stock:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to finalize stock" },
      { status: 500 },
    )
  }
}
