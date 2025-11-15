// Script to analyze the product references CSV

const csvUrl =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/TABLEAU%20DE%20CORRESPONDANCE%20-%20LISTE_REF%20%281%29-PuiBtyJFamsr70A6X1dYr2TmDoop6W.csv"

async function analyzeReferences() {
  console.log("[v0] Fetching CSV data...")

  const response = await fetch(csvUrl)
  const csvText = await response.text()

  // Parse CSV
  const lines = csvText.split("\n")
  const headers = lines[0].split(",").map((h) => h.trim())

  console.log("[v0] Headers:", headers)
  console.log("[v0] Total rows:", lines.length - 1)

  // Parse all rows
  const data = []
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue

    const values = lines[i].split(",").map((v) => v.trim())
    const row = {
      id: values[0] || "",
      categorie: values[1] || "",
      referenceSonefi: values[2] || "",
      referenceSellsy: values[3] || "",
      fournisseur: values[4] || "",
    }
    data.push(row)
  }

  console.log("[v0] Sample data (first 10 rows):")
  console.log(JSON.stringify(data.slice(0, 10), null, 2))

  // Analyze categories
  const categories = [...new Set(data.map((d) => d.categorie).filter(Boolean))]
  console.log("[v0] Unique categories:", categories)
  console.log("[v0] Total categories:", categories.length)

  // Analyze suppliers
  const suppliers = [...new Set(data.map((d) => d.fournisseur).filter(Boolean))]
  console.log("[v0] Unique suppliers:", suppliers)
  console.log("[v0] Total suppliers:", suppliers.length)

  // Count by category
  const categoryCount = {}
  data.forEach((row) => {
    if (row.categorie) {
      categoryCount[row.categorie] = (categoryCount[row.categorie] || 0) + 1
    }
  })
  console.log("[v0] Products per category:", categoryCount)

  return data
}

analyzeReferences()
