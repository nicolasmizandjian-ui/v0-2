import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { itemId, category, supplierBatch, sellsyReference, sonefiReference, supplierReference, width, location } =
      await request.json()

    const MONDAY_TOKEN = process.env.MONDAY_TOKEN
    if (!MONDAY_TOKEN) {
      return NextResponse.json({ error: "Monday token not configured" }, { status: 500 })
    }

    const STOCK_ENTRY_BOARD_ID = "7678082330"

    const mutations = []

    // REF SELLSY (texte0)
    if (sellsyReference) {
      mutations.push(`
        ref_sellsy: change_simple_column_value(
          item_id: ${itemId},
          board_id: ${STOCK_ENTRY_BOARD_ID},
          column_id: "texte0",
          value: ${JSON.stringify(sellsyReference)}
        ) { id }
      `)
    }

    // RÉFÉRENCE FOURNISSEUR (texte5)
    if (supplierReference) {
      mutations.push(`
        ref_fournisseur: change_simple_column_value(
          item_id: ${itemId},
          board_id: ${STOCK_ENTRY_BOARD_ID},
          column_id: "texte5",
          value: ${JSON.stringify(supplierReference)}
        ) { id }
      `)
    }

    // BATCH FOURNISSEUR (batch_fournisseur2)
    if (supplierBatch) {
      mutations.push(`
        batch_fournisseur: change_simple_column_value(
          item_id: ${itemId},
          board_id: ${STOCK_ENTRY_BOARD_ID},
          column_id: "batch_fournisseur2",
          value: ${JSON.stringify(supplierBatch)}
        ) { id }
      `)
    }

    // CATÉGORIE (statut5)
    if (category) {
      mutations.push(`
        categorie: change_simple_column_value(
          item_id: ${itemId},
          board_id: ${STOCK_ENTRY_BOARD_ID},
          column_id: "statut5",
          value: ${JSON.stringify(category)}
        ) { id }
      `)
    }

    // Laize (laize)
    if (width) {
      mutations.push(`
        laize: change_simple_column_value(
          item_id: ${itemId},
          board_id: ${STOCK_ENTRY_BOARD_ID},
          column_id: "laize",
          value: ${JSON.stringify(width)}
        ) { id }
      `)
    }

    // Emplacement (statut)
    if (location) {
      mutations.push(`
        emplacement: change_simple_column_value(
          item_id: ${itemId},
          board_id: ${STOCK_ENTRY_BOARD_ID},
          column_id: "statut",
          value: ${JSON.stringify(location)}
        ) { id }
      `)
    }

    // REF SONEFI - Store in name field since there's no dedicated column
    if (sonefiReference) {
      mutations.push(`
        ref_sonefi: change_simple_column_value(
          item_id: ${itemId},
          board_id: ${STOCK_ENTRY_BOARD_ID},
          column_id: "name",
          value: ${JSON.stringify(sonefiReference)}
        ) { id }
      `)
    }

    if (mutations.length > 0) {
      const mutationQuery = `mutation {
        ${mutations.join("\n")}
      }`

      const response = await fetch("https://api.monday.com/v2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: MONDAY_TOKEN,
        },
        body: JSON.stringify({ query: mutationQuery }),
      })

      const data = await response.json()

      if (data.errors) {
        console.error("[v0] Monday API error:", data.errors)
        return NextResponse.json({ error: "Failed to update Monday.com", details: data.errors }, { status: 500 })
      }

      if (!response.ok) {
        throw new Error(`Failed to update item ${itemId}`)
      }
    }

    console.log("[v0] Successfully validated item:", itemId)

    return NextResponse.json({
      success: true,
      itemId,
      validationData: {
        category,
        supplierBatch,
        sellsyReference,
        sonefiReference,
        supplierReference,
        width,
        location,
      },
    })
  } catch (error) {
    console.error("[v0] Error validating stock:", error)
    return NextResponse.json({ error: "Failed to validate stock" }, { status: 500 })
  }
}
