import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { itemId } = await request.json()

    const MONDAY_TOKEN = process.env.MONDAY_TOKEN
    if (!MONDAY_TOKEN) {
      return NextResponse.json({ error: "Monday token not configured" }, { status: 500 })
    }

    const updateStatusQuery = `mutation {
      change_simple_column_value(
        item_id: ${itemId},
        board_id: 7678082330,
        column_id: "color_mkwj76qt",
        value: "ENTRER"
      ) {
        id
      }
    }`

    console.log("[v0] Updating status to ENTRER for item:", itemId)

    const updateResponse = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: MONDAY_TOKEN,
      },
      body: JSON.stringify({ query: updateStatusQuery }),
    })

    const updateData = await updateResponse.json()

    if (updateData.errors) {
      console.error("[v0] Error updating status:", updateData.errors)
      return NextResponse.json({ error: "Failed to update status", details: updateData.errors }, { status: 500 })
    }

    console.log("[v0] Successfully updated status to ENTRER")

    return NextResponse.json({
      success: true,
      itemId,
      message: "Status updated to ENTRER - Monday automation will handle the rest",
    })
  } catch (error) {
    console.error("[v0] Error finalizing validation:", error)
    return NextResponse.json({ error: "Failed to finalize validation" }, { status: 500 })
  }
}
