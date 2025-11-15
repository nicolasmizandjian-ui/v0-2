import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

function normalizeCategory(category: string): string {
  return category
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .toUpperCase()
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Smart search route called")

    const body = await request.json()
    const { productReference, quantityNeeded } = body

    console.log("[v0] Product reference:", productReference)
    console.log("[v0] Quantity needed:", quantityNeeded)

    if (!productReference) {
      return NextResponse.json({ error: "Product reference is required" }, { status: 400 })
    }

    const supabase = await createClient()

    const productCode = productReference.split("_")[0]
    console.log("[v0] Extracted product code:", productCode)

    // Step 1: Searching for finished products in stock_monday_produits_finis matching:
    console.log("[v0] Step 1: Searching for finished products in stock_monday_produits_finis")

    let finishedProducts: any[] = []
    try {
      const { data, error } = await supabase
        .from("stock_monday_produits_finis")
        .select("*")
        .ilike("reference_sonefi", `${productCode}%`)
        .gt("quantite", 0)

      if (error) {
        console.error("[v0] Error fetching finished products:", error.message)
      } else {
        finishedProducts = data || []
        console.log("[v0] Found", finishedProducts.length, "finished products")
      }
    } catch (fetchError: any) {
      console.error("[v0] Exception fetching finished products:", fetchError.message)
    }

    const finishedRolls =
      finishedProducts.map((product: any) => ({
        id: product.batch_sonefi,
        batch: product.reference_sonefi,
        stock: product.quantite,
        unit: product.unite || "ML",
        sellsyRef: product.reference_sellsy,
        category: product.categorie,
        laize: product.laize_mm,
        location: product.emplacement,
        isFinishedProduct: true,
        isExactMatch: true,
      })) || []

    const totalFinishedStock = finishedRolls.reduce((sum, roll) => sum + (roll.stock || 0), 0)
    console.log("[v0] Total finished stock available:", totalFinishedStock)

    const remainingQuantity = quantityNeeded ? quantityNeeded - totalFinishedStock : 0
    console.log("[v0] Remaining quantity needed:", remainingQuantity)

    // Step 2: Searching for raw materials
    console.log("[v0] Step 2: Searching for raw materials in stock_monday_matieres")

    const parts = productReference.split("_")
    const materialRef = parts.length >= 2 ? parts[1] : null

    if (!materialRef) {
      console.log("[v0] No material reference found in product reference")
      return NextResponse.json({
        rolls: finishedRolls,
        searchType: finishedRolls.length > 0 ? "finished" : "none",
        remainingQuantity,
      })
    }

    console.log("[v0] Extracted material reference:", materialRef)

    console.log("[v0] Fetching sample materials to see database content")
    const { data: sampleMaterials, error: sampleError } = await supabase
      .from("stock_monday_matieres")
      .select("*")
      .gt("quantite", 0)
      .limit(5)

    if (sampleError) {
      console.error("[v0] Error fetching sample materials:", sampleError.message)
    } else {
      console.log("[v0] Sample materials:", JSON.stringify(sampleMaterials, null, 2))
    }

    console.log("[v0] Looking up category for material:", materialRef)

    const { data: materialInfo, error: materialInfoError } = await supabase
      .from("table_matiere")
      .select("categorie")
      .eq("reference_sellsy", materialRef)
      .limit(1)
      .maybeSingle()

    if (materialInfoError) {
      console.error("[v0] Error looking up material category:", materialInfoError.message)
    }

    const materialCategory = materialInfo?.categorie
    console.log("[v0] Found category:", materialCategory || "none")

    let rawMaterials: any[] = []

    if (materialCategory) {
      const normalizedCategory = normalizeCategory(materialCategory)
      console.log("[v0] Normalized category:", normalizedCategory)

      console.log("[v0] Strategy 1: Searching with exact category:", materialCategory)

      const { data: exactMatch, error: exactError } = await supabase
        .from("stock_monday_matieres")
        .select("*")
        .eq("categorie", materialCategory)
        .gt("quantite", 0)

      if (exactError) {
        console.error("[v0] Strategy 1 error:", exactError.message)
      } else if (exactMatch && exactMatch.length > 0) {
        rawMaterials = exactMatch
        console.log("[v0] Strategy 1 found", rawMaterials.length, "materials")
      }

      if (rawMaterials.length === 0 && normalizedCategory !== materialCategory) {
        console.log("[v0] Strategy 2: Trying with normalized category (no accents):", normalizedCategory)

        const { data: normalizedMatch, error: normalizedError } = await supabase
          .from("stock_monday_matieres")
          .select("*")
          .eq("categorie", normalizedCategory)
          .gt("quantite", 0)

        if (normalizedError) {
          console.error("[v0] Strategy 2 error:", normalizedError.message)
        } else if (normalizedMatch && normalizedMatch.length > 0) {
          rawMaterials = normalizedMatch
          console.log("[v0] Strategy 2 found", rawMaterials.length, "materials")
        }
      }

      if (rawMaterials.length === 0) {
        const categoryWithSpaces = materialCategory.replace(/_/g, " ")
        console.log("[v0] Strategy 3: Trying with spaces:", categoryWithSpaces)

        const { data: spaceMatch, error: spaceError } = await supabase
          .from("stock_monday_matieres")
          .select("*")
          .ilike("categorie", categoryWithSpaces)
          .gt("quantite", 0)

        if (spaceError) {
          console.error("[v0] Strategy 3 error:", spaceError.message)
        } else if (spaceMatch && spaceMatch.length > 0) {
          rawMaterials = spaceMatch
          console.log("[v0] Strategy 3 found", rawMaterials.length, "materials")
        }
      }

      if (rawMaterials.length === 0) {
        console.log("[v0] Strategy 4: Trying case-insensitive with normalized category")

        const { data: caseInsensitiveMatch, error: caseError } = await supabase
          .from("stock_monday_matieres")
          .select("*")
          .ilike("categorie", normalizedCategory)
          .gt("quantite", 0)

        if (caseError) {
          console.error("[v0] Strategy 4 error:", caseError.message)
        } else if (caseInsensitiveMatch && caseInsensitiveMatch.length > 0) {
          rawMaterials = caseInsensitiveMatch
          console.log("[v0] Strategy 4 found", rawMaterials.length, "materials")
        }
      }

      if (rawMaterials.length === 0) {
        console.log("[v0] Strategy 5: Searching by material reference:", materialRef)

        const { data: refMatch, error: refError } = await supabase
          .from("stock_monday_matieres")
          .select("*")
          .or(`reference_sonefi.ilike.%${materialRef}%,reference_sellsy.ilike.%${materialRef}%`)
          .gt("quantite", 0)

        if (refError) {
          console.error("[v0] Strategy 5 error:", refError.message)
        } else {
          rawMaterials = refMatch || []
          console.log("[v0] Strategy 5 found", rawMaterials.length, "materials")
        }
      }
    } else {
      console.log("[v0] No category found, searching directly by reference:", materialRef)

      const { data: refMatch, error: refError } = await supabase
        .from("stock_monday_matieres")
        .select("*")
        .or(`reference_sonefi.ilike.%${materialRef}%,reference_sellsy.ilike.%${materialRef}%`)
        .gt("quantite", 0)

      if (refError) {
        console.error("[v0] Direct reference search error:", refError.message)
      } else {
        rawMaterials = refMatch || []
        console.log("[v0] Direct reference search found", rawMaterials.length, "materials")
      }
    }

    const materialsMap = new Map()

    rawMaterials.forEach((material: any) => {
      const sonefiRef = material.reference_sonefi

      if (!materialsMap.has(sonefiRef)) {
        materialsMap.set(sonefiRef, {
          id: sonefiRef,
          batch: sonefiRef,
          sellsyRef: material.reference_sellsy,
          stock: 0,
          unit: material.unite || "ML",
          category: material.categorie,
          laize: material.laize_mm,
          isFinishedProduct: false,
          isExactMatch: true,
        })
      }

      const existing = materialsMap.get(sonefiRef)
      existing.stock += material.quantite || 0
    })

    const rawMaterialRolls = Array.from(materialsMap.values())
    console.log("[v0] Returning", rawMaterialRolls.length, "unique raw materials")

    const allRolls = [...finishedRolls, ...rawMaterialRolls]
    const searchType =
      finishedRolls.length > 0 && rawMaterialRolls.length > 0 ? "mixed" : finishedRolls.length > 0 ? "finished" : "raw"

    return NextResponse.json({
      rolls: allRolls,
      searchType,
      remainingQuantity,
      finishedProductsCount: finishedRolls.length,
      rawMaterialsCount: rawMaterialRolls.length,
    })
  } catch (error: any) {
    console.error("[v0] Smart search error:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}
