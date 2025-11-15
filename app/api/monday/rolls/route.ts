import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { sellsyReference } = await request.json()

    console.log("[v0] Fetching rolls for Sellsy reference:", sellsyReference)

    const mondayToken = process.env.MONDAY_TOKEN

    if (!mondayToken) {
      return NextResponse.json({ error: "Monday.com token not configured" }, { status: 500 })
    }

    const csvResponse = await fetch(
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/TABLEAU%20DE%20CORRESPONDANCE%20-%20LISTE_REF%20%281%29-PuiBtyJFamsr70A6X1dYr2TmDoop6W.csv",
    )
    const csvText = await csvResponse.text()
    const lines = csvText.split("\n").slice(1) // Skip header

    // Find the Sonefi reference that corresponds to the Sellsy reference
    let sonefiReference = sellsyReference // Default to the same if not found
    for (const line of lines) {
      const parts = line.split(",")
      if (parts.length >= 4) {
        const refSellsy = parts[3]?.trim().replace(/"/g, "")
        const refSonefi = parts[2]?.trim().replace(/"/g, "")
        if (refSellsy === sellsyReference && refSonefi) {
          sonefiReference = refSonefi
          console.log("[v0] Found Sonefi reference:", sonefiReference, "for Sellsy reference:", sellsyReference)
          break
        }
      }
    }

    if (sonefiReference === sellsyReference) {
      console.log("[v0] No Sonefi reference found in CSV, using Sellsy reference as fallback")
    }

    const query = `
      query ($cursor: String) {
        boards(ids: [7677892120]) {
          items_page(limit: 500, cursor: $cursor) {
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
                text
                value
              }
            }
          }
        }
      }
    `

    let allItems: any[] = []
    let cursor: string | null = null
    let hasMore = true

    while (hasMore) {
      const response = await fetch("https://api.monday.com/v2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: mondayToken,
        },
        body: JSON.stringify({
          query,
          variables: { cursor },
        }),
      })

      const data = await response.json()

      if (data.errors) {
        console.error("[v0] Monday.com API errors:", data.errors)
        return NextResponse.json({ error: "Failed to fetch rolls from Monday.com" }, { status: 500 })
      }

      const itemsPage = data.data?.boards?.[0]?.items_page
      if (!itemsPage) break

      allItems = allItems.concat(itemsPage.items)
      cursor = itemsPage.cursor
      hasMore = !!cursor
    }

    console.log("[v0] Total items fetched:", allItems.length)

    const stockItems = allItems.filter((item) => item.group?.title === "STOCK TOTAL EN COURS")
    console.log("[v0] Items in STOCK TOTAL EN COURS:", stockItems.length)

    const matchingRolls = stockItems
      .map((item) => {
        const sonefiCol = item.column_values.find((col: any) => col.id === "texte__1")
        const stockCol = item.column_values.find((col: any) => col.id === "chiffres")
        const laizeCol = item.column_values.find((col: any) => col.id === "laize")
        const locationCol = item.column_values.find((col: any) => col.id === "statut")
        const categoryCol = item.column_values.find((col: any) => col.id === "label__1")

        const sonefiRef = sonefiCol?.text || ""
        const stock = stockCol?.text || "0"
        const laize = laizeCol?.text || ""
        const location = locationCol?.text || ""

        let category = ""
        if (categoryCol?.value) {
          try {
            const parsed = JSON.parse(categoryCol.value)
            category = parsed.label || ""
          } catch (e) {
            category = categoryCol.text || ""
          }
        }

        const matches = sonefiRef === sonefiReference || sonefiRef.includes(sonefiReference)

        if (matches) {
          console.log("[v0] ✅ MATCH - Roll:", item.name, "- Sonefi ref:", sonefiRef, "- Looking for:", sonefiReference)
        }

        return {
          id: item.id,
          batch: item.name,
          sonefiReference: sonefiRef,
          stock: Number.parseFloat(stock) || 0,
          laize: laize,
          location: location,
          category: category,
          matches: matches,
        }
      })
      .filter((roll) => roll.matches && roll.stock > 0)

    console.log("[v0] Matching rolls found:", matchingRolls.length)

    return NextResponse.json({ rolls: matchingRolls })
  } catch (error) {
    console.error("[v0] Error fetching rolls:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
