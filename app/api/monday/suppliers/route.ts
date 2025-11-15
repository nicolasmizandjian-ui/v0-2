import { NextResponse } from "next/server"

const MONDAY_API_URL = "https://api.monday.com/v2"
const BOARD_ID = "7678082330"

export async function GET() {
  try {
    const token = process.env.MONDAY_TOKEN

    if (!token) {
      return NextResponse.json({ error: "Monday.com token not configured" }, { status: 500 })
    }

    const query = `
      query {
        boards(ids: [${BOARD_ID}]) {
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
                type
                text
                value
              }
            }
          }
        }
      }
    `

    const response = await fetch(MONDAY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({ query }),
    })

    if (!response.ok) {
      throw new Error(`Monday API error: ${response.statusText}`)
    }

    const data = await response.json()

    if (data.errors) {
      console.error("[v0] Monday API errors:", data.errors)
      return NextResponse.json({ error: "Failed to fetch data from Monday.com" }, { status: 500 })
    }

    const board = data.data?.boards?.[0]
    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 })
    }

    const items = board.items_page?.items || []

    const suppliersSet = new Set<string>()
    items.forEach((item: any) => {
      const supplierColumn = item.column_values.find((col: any) => col.id === "texte9")
      if (supplierColumn?.text && supplierColumn.text.trim()) {
        suppliersSet.add(supplierColumn.text.trim())
      }
    })

    const suppliers = Array.from(suppliersSet).sort()

    console.log("[v0] Found suppliers:", suppliers.length)

    return NextResponse.json({
      suppliers,
      totalItems: items.length,
    })
  } catch (error) {
    console.error("[v0] Error fetching suppliers:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
