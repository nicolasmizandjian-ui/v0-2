import { NextResponse } from "next/server"

const CSV_URL =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/TABLEAU%20DE%20CORRESPONDANCE%20-%20LISTE_REF%20%281%29-PuiBtyJFamsr70A6X1dYr2TmDoop6W.csv"

// Cache pour éviter de recharger le CSV à chaque requête
let cachedReferences: Map<string, any> | null = null
let lastFetchTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

async function loadReferences() {
  const now = Date.now()

  // Utiliser le cache si disponible et récent
  if (cachedReferences && now - lastFetchTime < CACHE_DURATION) {
    return cachedReferences
  }

  try {
    const response = await fetch(CSV_URL)
    const csvText = await response.text()

    // Parser le CSV
    const lines = csvText.split("\n")
    const headers = lines[0].split(",").map((h) => h.trim())

    const references = new Map<string, any>()

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values = line.split(",").map((v) => v.trim())
      const refSonefi = values[2] // REFERENCE_SONEFI
      const refSellsy = values[3] // REFERENCE_SELLSY
      const categorie = values[1] // CATEGORIE
      const fournisseur = values[4] // FOURNISSEUR

      if (refSonefi) {
        references.set(refSonefi, {
          referenceSonefi: refSonefi,
          referenceSellsy: refSellsy || "",
          categorie: categorie || "",
          fournisseur: fournisseur || "",
        })
      }
    }

    cachedReferences = references
    lastFetchTime = now

    console.log("[v0] Loaded references:", references.size)
    return references
  } catch (error) {
    console.error("[v0] Error loading references:", error)
    return new Map()
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const referenceSonefi = searchParams.get("ref")

    const references = await loadReferences()

    // Si une référence spécifique est demandée
    if (referenceSonefi) {
      const data = references.get(referenceSonefi)
      if (data) {
        return NextResponse.json(data)
      } else {
        return NextResponse.json({ error: "Reference not found" }, { status: 404 })
      }
    }

    // Sinon, retourner toutes les références
    const allReferences = Array.from(references.values())
    return NextResponse.json({ references: allReferences, total: allReferences.length })
  } catch (error) {
    console.error("[v0] Error in references API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
