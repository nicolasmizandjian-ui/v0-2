import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { product, supplier, receptionData } = await request.json()

    console.log("[v0] Processing reception:", { product, supplier, receptionData })

    const token = process.env.MONDAY_TOKEN
    if (!token) {
      return NextResponse.json({ error: "Monday token not configured" }, { status: 500 })
    }

    const ENTREE_STOCK_BOARD_ID = "7678082330"

    const createdItems = []

    const totalRollsQuantity = receptionData.rolls.reduce((sum: number, roll: any) => {
      return sum + Number.parseFloat(roll.quantity || "0")
    }, 0)

    const originalQuantity = Number.parseFloat(product.quantity)

    if (receptionData.partialDelivery) {
      // Livraison partielle: Create N lines for N rolls, subtract from original line
      const remainingQuantity = originalQuantity - totalRollsQuantity

      // Update original line with remaining quantity
      const updateMutation = `
        mutation {
          change_multiple_column_values (
            item_id: ${product.id},
            board_id: ${ENTREE_STOCK_BOARD_ID},
            column_values: ${JSON.stringify(
              JSON.stringify({
                quantit__produit: remainingQuantity,
              }),
            )}
          ) {
            id
          }
        }
      `

      const updateResponse = await fetch("https://api.monday.com/v2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({ query: updateMutation }),
      })

      const updateResult = await updateResponse.json()

      if (updateResult.errors) {
        console.error("[v0] Monday API error updating original item:", updateResult.errors)
        throw new Error(updateResult.errors[0]?.message || "Failed to update original item")
      }

      console.log(`[v0] Updated original line to remaining quantity: ${remainingQuantity}`)

      // Create N new lines for all N rolls
      for (let i = 0; i < receptionData.rolls.length; i++) {
        const roll = receptionData.rolls[i]

        // Duplicate the item
        const duplicateMutation = `
          mutation {
            duplicate_item (
              board_id: ${ENTREE_STOCK_BOARD_ID},
              item_id: ${product.id},
              with_updates: true
            ) {
              id
              name
            }
          }
        `

        const duplicateResponse = await fetch("https://api.monday.com/v2", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify({ query: duplicateMutation }),
        })

        const duplicateResult = await duplicateResponse.json()

        if (duplicateResult.errors) {
          console.error("[v0] Monday API error duplicating item:", duplicateResult.errors)
          throw new Error(duplicateResult.errors[0]?.message || "Failed to duplicate item")
        }

        const newItemId = duplicateResult.data.duplicate_item.id

        const updateNameMutation = `
          mutation {
            change_simple_column_value (
              item_id: ${newItemId},
              board_id: ${ENTREE_STOCK_BOARD_ID},
              column_id: "name",
              value: ${JSON.stringify(product.name)}
            ) {
              id
            }
          }
        `

        await fetch("https://api.monday.com/v2", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify({ query: updateNameMutation }),
        })

        // Update the quantity for the duplicated item
        const updateQuantityMutation = `
          mutation {
            change_multiple_column_values (
              item_id: ${newItemId},
              board_id: ${ENTREE_STOCK_BOARD_ID},
              column_values: ${JSON.stringify(
                JSON.stringify({
                  quantit__produit: Number.parseFloat(roll.quantity),
                }),
              )}
            ) {
              id
            }
          }
        `

        const updateQuantityResponse = await fetch("https://api.monday.com/v2", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify({ query: updateQuantityMutation }),
        })

        const updateQuantityResult = await updateQuantityResponse.json()

        if (updateQuantityResult.errors) {
          console.error("[v0] Monday API error updating quantity:", updateQuantityResult.errors)
          throw new Error(updateQuantityResult.errors[0]?.message || "Failed to update quantity")
        }

        createdItems.push({
          rollIndex: i + 1,
          itemId: newItemId,
          quantity: roll.quantity,
          location: roll.location,
        })

        console.log(`[v0] Created roll ${i + 1}:`, newItemId)
      }
    } else {
      // Livraison totale: Update original line to first roll, create N-1 additional lines
      if (receptionData.rolls.length > 0) {
        const firstRoll = receptionData.rolls[0]

        // Update original line with first roll quantity
        const updateMutation = `
          mutation {
            change_multiple_column_values (
              item_id: ${product.id},
              board_id: ${ENTREE_STOCK_BOARD_ID},
              column_values: ${JSON.stringify(
                JSON.stringify({
                  quantit__produit: Number.parseFloat(firstRoll.quantity),
                }),
              )}
            ) {
              id
            }
          }
        `

        const updateResponse = await fetch("https://api.monday.com/v2", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify({ query: updateMutation }),
        })

        const updateResult = await updateResponse.json()

        if (updateResult.errors) {
          console.error("[v0] Monday API error updating original item:", updateResult.errors)
          throw new Error(updateResult.errors[0]?.message || "Failed to update original item")
        }

        createdItems.push({
          rollIndex: 1,
          itemId: product.id,
          quantity: firstRoll.quantity,
          location: firstRoll.location,
        })

        console.log("[v0] Updated original item with first roll quantity")
      }

      // Create N-1 additional lines for remaining rolls
      for (let i = 1; i < receptionData.rolls.length; i++) {
        const roll = receptionData.rolls[i]

        // Duplicate the item
        const duplicateMutation = `
          mutation {
            duplicate_item (
              board_id: ${ENTREE_STOCK_BOARD_ID},
              item_id: ${product.id},
              with_updates: true
            ) {
              id
              name
            }
          }
        `

        const duplicateResponse = await fetch("https://api.monday.com/v2", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify({ query: duplicateMutation }),
        })

        const duplicateResult = await duplicateResponse.json()

        if (duplicateResult.errors) {
          console.error("[v0] Monday API error duplicating item:", duplicateResult.errors)
          throw new Error(duplicateResult.errors[0]?.message || "Failed to duplicate item")
        }

        const newItemId = duplicateResult.data.duplicate_item.id

        const updateNameMutation = `
          mutation {
            change_simple_column_value (
              item_id: ${newItemId},
              board_id: ${ENTREE_STOCK_BOARD_ID},
              column_id: "name",
              value: ${JSON.stringify(product.name)}
            ) {
              id
            }
          }
        `

        await fetch("https://api.monday.com/v2", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify({ query: updateNameMutation }),
        })

        // Update the quantity for the duplicated item
        const updateQuantityMutation = `
          mutation {
            change_multiple_column_values (
              item_id: ${newItemId},
              board_id: ${ENTREE_STOCK_BOARD_ID},
              column_values: ${JSON.stringify(
                JSON.stringify({
                  quantit__produit: Number.parseFloat(roll.quantity),
                }),
              )}
            ) {
              id
            }
          }
        `

        const updateQuantityResponse = await fetch("https://api.monday.com/v2", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify({ query: updateQuantityMutation }),
        })

        const updateQuantityResult = await updateQuantityResponse.json()

        if (updateQuantityResult.errors) {
          console.error("[v0] Monday API error updating quantity:", updateQuantityResult.errors)
          throw new Error(updateQuantityResult.errors[0]?.message || "Failed to update quantity")
        }

        createdItems.push({
          rollIndex: i + 1,
          itemId: newItemId,
          quantity: roll.quantity,
          location: roll.location,
        })

        console.log(`[v0] Duplicated item ${i + 1}:`, newItemId)
      }
    }

    return NextResponse.json({
      success: true,
      message: `${createdItems.length} rouleau(x) traité(s)`,
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
