import { NextResponse } from "next/server"

export async function GET() {
  const token = process.env.MONDAY_TOKEN

  if (!token) {
    return NextResponse.json({ error: "Monday token not configured" }, { status: 500 })
  }

  try {
    const boardId = "3506204000"

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
      // Find the "Label" column (id: "label")
      const labelColumn = item.column_values.find((col: any) => col.id === "label")

      // Find the "Statut produit" column (id: "priority")
      const statusColumn = item.column_values.find((col: any) => col.id === "priority")

      // Check if Label is "ATELIER" (index 0)
      let isAtelier = false
      if (labelColumn?.value) {
        try {
          const labelValue = JSON.parse(labelColumn.value)
          // Index 0 corresponds to "ATELIER"
          isAtelier = labelValue.index === 0
        } catch (e) {
          // If parsing fails, check text value
          isAtelier = labelColumn.text === "ATELIER" || labelColumn.text === "Atelier"
        }
      }

      // Check if Statut produit is "À faire" (index 10) or "ENVOI PARTIEL" (index 11)
      let hasValidStatus = false
      if (statusColumn?.value) {
        try {
          const statusValue = JSON.parse(statusColumn.value)
          // Index 10 = "À faire", Index 11 = "ENVOI PARTIEL"
          hasValidStatus = statusValue.index === 10 || statusValue.index === 11
        } catch (e) {
          // If parsing fails, check text value
          hasValidStatus = statusColumn.text === "À faire" || statusColumn.text === "ENVOI PARTIEL"
        }
      }

      console.log(
        `[v0] Item ${item.name}: Label=${labelColumn?.text} (isAtelier=${isAtelier}), Status=${statusColumn?.text} (hasValidStatus=${hasValidStatus})`,
      )

      return isAtelier && hasValidStatus
    })

    console.log(`[v0] Total items: ${items.length}, Filtered items: ${filteredItems.length}`)

    return NextResponse.json({
      clients: filteredItems,
      columns: columns,
      boardId: board.id,
      boardName: board.name,
    })
  } catch (error) {
    console.error("[v0] Error fetching Monday data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
