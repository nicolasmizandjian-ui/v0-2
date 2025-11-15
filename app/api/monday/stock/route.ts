import { NextResponse } from "next/server"

const MONDAY_API_URL = "https://api.monday.com/v2"
const STOCK_BOARD_ID = "7677892120"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category")

  try {
    const token = process.env.MONDAY_TOKEN

    if (!token) {
      return NextResponse.json({ error: "Monday.com token not configured" }, { status: 500 })
    }

    let allItems: any[] = []
    let cursor: string | null = null
    let hasMore = true

    // Fetch all items using pagination
    while (hasMore) {
      const query = `
        query {
          boards(ids: [${STOCK_BOARD_ID}]) {
            id
            name
            columns {
              id
              title
              type
            }
            items_page(limit: 500${cursor ? `, cursor: "${cursor}"` : ""}) {
              cursor
              items {
                id
                name
                group {
                  id
                  title
                }
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

      const data = await response.json()

      if (data.errors) {
        console.error("[v0] Monday API errors:", data.errors)
        return NextResponse.json({ error: "Failed to fetch stock data", details: data.errors }, { status: 500 })
      }

      const board = data.data?.boards?.[0]
      if (!board) {
        return NextResponse.json({ error: "Stock board not found" }, { status: 404 })
      }

      const pageItems = board.items_page.items
      allItems = [...allItems, ...pageItems]

      // Check if there are more items to fetch
      cursor = board.items_page.cursor
      hasMore = pageItems.length === 500 && cursor !== null

      console.log(`[v0] Fetched ${pageItems.length} items, total so far: ${allItems.length}`)
    }

    console.log(`[v0] Total items retrieved from all pages: ${allItems.length}`)

    const stockEnCoursItems = allItems.filter((item: any) => {
      const groupTitle = item.group?.title || ""
      return groupTitle === "STOCK TOTAL EN COURS"
    })

    console.log(`[v0] Items in STOCK TOTAL EN COURS: ${stockEnCoursItems.length} out of ${allItems.length} total`)

    const newItem = stockEnCoursItems.find((item: any) => item.id === "18146607975")
    if (newItem) {
      console.log(
        "[v0] ✅ Found newly created item in STOCK TOTAL EN COURS:",
        newItem.id,
        newItem.name,
        "Group:",
        newItem.group?.title,
      )
      const categoryCol = newItem.column_values.find((col: any) => col.id === "label__1")
      console.log("[v0] New item category column:", categoryCol)
    } else {
      console.log("[v0] ❌ Newly created item (18146607975) NOT FOUND in STOCK TOTAL EN COURS")
    }

    // Filter by category if specified
    let filteredItems = stockEnCoursItems
    if (category && category !== "all") {
      filteredItems = stockEnCoursItems.filter((item: any) => {
        const categoryColumn = item.column_values.find((col: any) => col.id === "label__1")

        if (!categoryColumn || !categoryColumn.text) {
          return false
        }

        const categoryText = categoryColumn.text.toLowerCase()

        // Map categories to filter types
        if (category === "matieres-premieres") {
          const isExcluded =
            categoryText === "accessoires" ||
            categoryText.includes("produits finis") ||
            categoryText.includes("semi-finis")
          return !isExcluded
        } else if (category === "produits-finis") {
          return categoryText.includes("produits finis") || categoryText.includes("semi-finis")
        } else if (category === "accessoires") {
          return categoryText === "accessoires"
        }

        return false
      })
    }

    console.log("[v0] Total items:", allItems.length, "Filtered items:", filteredItems.length)

    // Get board info from the last fetch (they're all the same)
    const lastQuery = `
      query {
        boards(ids: [${STOCK_BOARD_ID}]) {
          id
          name
          columns {
            id
            title
            type
          }
        }
      }
    `

    const boardResponse = await fetch(MONDAY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({ query: lastQuery }),
    })

    const boardData = await boardResponse.json()
    const board = boardData.data?.boards?.[0]

    return NextResponse.json({
      board: {
        id: board.id,
        name: board.name,
        columns: board.columns,
      },
      items: filteredItems,
      total: filteredItems.length,
    })
  } catch (error) {
    console.error("[v0] Error fetching stock:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
