import { NextResponse } from "next/server"

export async function GET() {
  const token = process.env.MONDAY_TOKEN

  if (!token) {
    return NextResponse.json({ error: "Monday token not configured" }, { status: 500 })
  }

  try {
    const boardId = "3506204000" // Atelier board

    const itemsQuery = `
      query {
        boards(ids: [${boardId}]) {
          id
          name
          columns {
            id
            title
            type
          }
          items_page(limit: 500) {
            items {
              id
              name
              column_values {
                id
                text
                value
                type
              }
            }
          }
        }
      }
    `

    const itemsResponse = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({ query: itemsQuery }),
    })

    const itemsData = await itemsResponse.json()

    if (itemsData.errors) {
      console.error("[v0] Monday API errors:", itemsData.errors)
      return NextResponse.json({ error: "Failed to fetch items", details: itemsData.errors }, { status: 500 })
    }

    const board = itemsData.data.boards[0]

    if (!board) {
      return NextResponse.json({ error: "Board not found or no access" }, { status: 404 })
    }

    const items = board.items_page?.items || []
    const columns = board.columns || []

    const filteredItems = items.filter((item: any) => {
      const labelColumn = item.column_values.find((col: any) => col.id === "label")
      const statusColumn = item.column_values.find((col: any) => col.id === "priority")

      // Check if Label is "ATELIER" (index 0)
      let isAtelier = false
      if (labelColumn?.value) {
        try {
          const labelValue = JSON.parse(labelColumn.value)
          isAtelier = labelValue.index === 0
        } catch (e) {
          isAtelier = labelColumn.text === "ATELIER" || labelColumn.text === "Atelier"
        }
      }

      // Check if Status is "Découpe terminée"
      let hasValidStatus = false
      if (statusColumn?.text) {
        hasValidStatus = statusColumn.text === "Découpe terminée"
      }

      return isAtelier && hasValidStatus
    })

    const itemsWithQuantity = filteredItems.map((item: any) => {
      const quantityColumn = item.column_values.find((col: any) => col.id === "chiffres7")
      let quantity = 0

      if (quantityColumn?.text) {
        quantity = Number.parseFloat(quantityColumn.text) || 0
      }

      return {
        ...item,
        quantity,
      }
    })

    console.log(`[v0] Confection - Total items: ${items.length}, Filtered items: ${itemsWithQuantity.length}`)

    return NextResponse.json({
      clients: itemsWithQuantity,
      columns: columns,
      boardId: board.id,
      boardName: board.name,
    })
  } catch (error) {
    console.error("[v0] Error fetching Monday data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
