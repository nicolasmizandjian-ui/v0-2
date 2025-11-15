import { NextResponse } from "next/server"

const CSV_URL =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/TABLEAU%20DE%20CORRESPONDANCE%20-%20LISTE_REF%20%281%29-PuiBtyJFamsr70A6X1dYr2TmDoop6W.csv"

let cachedReferences: Map<string, any> | null = null
let lastFetchTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

async function loadReferences() {
  const now = Date.now()

  if (cachedReferences && now - lastFetchTime < CACHE_DURATION) {
    return cachedReferences
  }

  try {
    const response = await fetch(CSV_URL)
    const csvText = await response.text()

    const lines = csvText.split("\n")
    const references = new Map<string, any>()

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values = line.split(",").map((v) => v.trim())
      const refSonefi = values[2] // REFERENCE_SONEFI
      const refSellsy = values[3] // REFERENCE_SELLSY

      if (refSonefi && refSellsy) {
        // Map both directions: Sellsy -> Sonefi and Sonefi -> Sellsy
        references.set(refSellsy, {
          referenceSonefi: refSonefi,
          referenceSellsy: refSellsy,
        })
      }
    }

    cachedReferences = references
    lastFetchTime = now

    return references
  } catch (error) {
    console.error("[v0] Error loading references:", error)
    return new Map()
  }
}

export async function POST(request: Request) {
  try {
    const { sellsyReferences } = await request.json()

    if (!Array.isArray(sellsyReferences) || sellsyReferences.length === 0) {
      return NextResponse.json({ error: "sellsyReferences array is required" }, { status: 400 })
    }

    console.log("[v0] Batch request for Sellsy references:", sellsyReferences)

    const references = await loadReferences()

    // Convert Sellsy references to Sonefi references
    const sellsyToSonefi = new Map<string, string>()
    const sonefiReferences: string[] = []

    for (const sellsyRef of sellsyReferences) {
      const mapping = references.get(sellsyRef)
      if (mapping) {
        const sonefiRef = mapping.referenceSonefi
        sellsyToSonefi.set(sellsyRef, sonefiRef)
        sonefiReferences.push(sonefiRef)
        console.log(`[v0] Mapped ${sellsyRef} -> ${sonefiRef}`)
      } else {
        console.log(`[v0] No mapping found for ${sellsyRef}, using as-is`)
        sellsyToSonefi.set(sellsyRef, sellsyRef)
        sonefiReferences.push(sellsyRef)
      }
    }

    const MONDAY_TOKEN = process.env.MONDAY_TOKEN
    const BOARD_ID = "7677892120"

    if (!MONDAY_TOKEN) {
      return NextResponse.json({ error: "Monday.com token not configured" }, { status: 500 })
    }

    const query = `
      query ($cursor: String) {
        boards(ids: [${BOARD_ID}]) {
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
                type
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
          Authorization: MONDAY_TOKEN,
        },
        body: JSON.stringify({
          query,
          variables: { cursor },
        }),
      })

      if (!response.ok) {
        throw new Error(`Monday.com API error: ${response.statusText}`)
      }

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

    console.log(`[v0] Found ${allItems.length} total items in Monday.com`)

    const stockItems = allItems.filter((item) => item.group?.title === "STOCK TOTAL EN COURS")
    console.log(`[v0] Items in STOCK TOTAL EN COURS: ${stockItems.length}`)

    const rollsByReference: Record<string, any[]> = {}

    sellsyReferences.forEach((ref: string) => {
      rollsByReference[ref] = []
    })

    stockItems.forEach((item: any) => {
      const referenceCol = item.column_values.find((col: any) => col.id === "texte__1")
      const sonefiRef = referenceCol?.text

      if (sonefiRef && sonefiReferences.includes(sonefiRef)) {
        const stockCol = item.column_values.find((col: any) => col.id === "chiffres")
        const stock = Number.parseFloat(stockCol?.text || "0")

        if (stock > 0) {
          const laizeCol = item.column_values.find((col: any) => col.id === "laize")
          const locationCol = item.column_values.find((col: any) => col.id === "statut")

          const roll = {
            id: item.id,
            batch: item.name,
            stock: stock,
            laize: laizeCol?.text || "",
            location: locationCol?.text || "",
          }

          // Find which Sellsy reference(s) map to this Sonefi reference
          for (const [sellsyRef, mappedSonefiRef] of sellsyToSonefi.entries()) {
            if (mappedSonefiRef === sonefiRef) {
              rollsByReference[sellsyRef].push(roll)
              console.log(`[v0] Added roll ${item.name} (${sonefiRef}) to ${sellsyRef}`)
            }
          }
        }
      }
    })

    // Log results
    for (const [sellsyRef, rolls] of Object.entries(rollsByReference)) {
      console.log(`[v0] ${sellsyRef}: ${rolls.length} rolls found`)
    }

    return NextResponse.json({ rollsByReference })
  } catch (error) {
    console.error("[v0] Error fetching rolls batch:", error)
    return NextResponse.json({ error: "Failed to fetch rolls" }, { status: 500 })
  }
}
