import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const supplier = searchParams.get("supplier")

  if (!supplier) {
    return NextResponse.json({ error: "Supplier parameter is required" }, { status: 400 })
  }

  const MONDAY_TOKEN = process.env.MONDAY_TOKEN
  const BOARD_ID = "7678082330"

  if (!MONDAY_TOKEN) {
    return NextResponse.json({ error: "Monday.com token not configured" }, { status: 500 })
  }

  try {
    // Fetch all items from the board
    const query = `
      query {
        boards(ids: [${BOARD_ID}]) {
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

    const response = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: MONDAY_TOKEN,
      },
      body: JSON.stringify({ query }),
    })

    if (!response.ok) {
      throw new Error(`Monday.com API error: ${response.statusText}`)
    }

    const data = await response.json()
    const items = data.data?.boards?.[0]?.items_page?.items || []

    // Filter items by supplier and extract product information
    const products = items
      .filter((item: any) => {
        const supplierColumn = item.column_values.find((col: any) => col.id === "texte9")
        return supplierColumn?.text === supplier
      })
      .map((item: any) => {
        const descriptionColumn = item.column_values.find((col: any) => col.id === "texte2")
        const quantityColumn = item.column_values.find((col: any) => col.id === "quantit__produit")
        const unitColumn = item.column_values.find((col: any) => col.id === "texte25")
        const referenceColumn = item.column_values.find((col: any) => col.id === "texte__1")
        const statusColumn = item.column_values.find((col: any) => col.id === "statut")

        return {
          id: item.id,
          name: item.name,
          description: descriptionColumn?.text || "Sans description",
          quantity: quantityColumn?.text || "0",
          unit: unitColumn?.text || "",
          reference: referenceColumn?.text || "",
          status: statusColumn?.text || "",
        }
      })

    console.log(`[v0] Found ${products.length} products for supplier: ${supplier}`)

    return NextResponse.json({ products })
  } catch (error) {
    console.error("[v0] Error fetching supplier products:", error)
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}
