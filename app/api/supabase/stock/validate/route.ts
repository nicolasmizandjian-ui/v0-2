import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const {
      itemId,
      category,
      supplierBatch,
      sellsyReference,
      sonefiReference,
      supplierReference,
      width,
      location,
      stockType,
    } = await request.json()

    console.log("[v0] Validating stock item:", {
      itemId,
      category,
      location,
      stockType,
    })

    const supabase = await createClient()

    const { error: updateError } = await supabase
      .from("entree_stock")
      .update({
        categorie: category,
        emplacement: location,
        reference_sellsy: sellsyReference || null,
        reference_fournisseur: supplierReference || null,
      })
      .eq("id", itemId)

    if (updateError) {
      console.error("[v0] Supabase error updating entry:", updateError)
      throw new Error(updateError.message || "Failed to update entry")
    }

    console.log("[v0] Successfully validated item:", itemId)

    // Store additional validation data in response for later use
    return NextResponse.json({
      success: true,
      validationData: {
        itemId,
        category,
        supplierBatch,
        sellsyReference,
        sonefiReference,
        supplierReference,
        width,
        location,
        stockType,
      },
    })
  } catch (error) {
    console.error("[v0] Error validating stock:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to validate stock" },
      { status: 500 },
    )
  }
}
