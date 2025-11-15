import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { client, products, datasheets } = await request.json()

    console.log("[v0] Generating manufacturing order for:", client)

    // Generate HTML manufacturing order
    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ordre de Fabrication - ${client}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 32px;
    }
    .header p {
      margin: 5px 0;
      font-size: 16px;
      opacity: 0.9;
    }
    .section {
      background: white;
      padding: 25px;
      border-radius: 10px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .section h2 {
      margin: 0 0 20px 0;
      color: #333;
      font-size: 24px;
      border-bottom: 3px solid #667eea;
      padding-bottom: 10px;
    }
    .product-card {
      background: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 15px;
      margin-bottom: 15px;
      border-radius: 5px;
    }
    .product-card h3 {
      margin: 0 0 10px 0;
      color: #667eea;
      font-size: 18px;
    }
    .product-card p {
      margin: 5px 0;
      color: #555;
    }
    .batch-info {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 10px;
      margin: 10px 0;
      border-radius: 5px;
    }
    .batch-info strong {
      color: #856404;
    }
    .delaizage {
      background: #ffe5cc;
      border-left: 4px solid #ff6b35;
    }
    .datasheet-link {
      display: inline-block;
      background: #007bff;
      color: white;
      padding: 8px 15px;
      text-decoration: none;
      border-radius: 5px;
      margin: 5px 5px 5px 0;
      font-size: 14px;
      transition: background 0.3s;
    }
    .datasheet-link:hover {
      background: #0056b3;
    }
    .datasheet-section {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 2px dashed #ddd;
    }
    @media print {
      body {
        background: white;
      }
      .section {
        box-shadow: none;
        page-break-inside: avoid;
      }
      .datasheet-link {
        background: #007bff;
        color: white;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📋 Ordre de Fabrication</h1>
    <p><strong>Client:</strong> ${client}</p>
    <p><strong>Date:</strong> ${new Date().toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })}</p>
    <p><strong>Heure:</strong> ${new Date().toLocaleTimeString("fr-FR")}</p>
  </div>

  <div class="section">
    <h2>🔧 Détails de Production</h2>
    ${products
      .map(
        (product: any) => `
      <div class="product-card">
        <h3>${product.productReference}</h3>
        <p><strong>Matière:</strong> ${product.rollBatch}</p>
        
        ${
          product.batchNumbers && product.batchNumbers.length > 0
            ? `
          <div style="margin-top: 15px;">
            <strong>Batchs sélectionnés:</strong>
            ${product.batchNumbers
              .map((batchId: string) => {
                const cuttingType = product.cuttingTypes?.[batchId] || "normal"
                const widthReduction = product.widthReductions?.[batchId]
                const surfaceArea = product.surfaceAreas?.[batchId]

                return `
              <div class="batch-info ${cuttingType === "delaizage" ? "delaizage" : ""}">
                <p><strong>Batch ID:</strong> ${batchId}</p>
                <p><strong>Type de découpe:</strong> ${cuttingType === "delaizage" ? "✂️ Délaizage" : "🔲 Découpe normale"}</p>
                ${
                  cuttingType === "delaizage" && widthReduction
                    ? `<p><strong>⚠️ Largeur à enlever:</strong> ${widthReduction}mm</p>`
                    : ""
                }
                ${surfaceArea ? `<p><strong>Surface à décompter:</strong> ${surfaceArea} ML</p>` : ""}
              </div>
            `
              })
              .join("")}
          </div>
        `
            : ""
        }
        
        ${
          datasheets && datasheets[product.rollBatch] && datasheets[product.rollBatch].length > 0
            ? `
          <div class="datasheet-section">
            <strong>📄 Fiches techniques:</strong><br>
            ${datasheets[product.rollBatch]
              .map(
                (ds: any) => `
              <a href="${ds.url}" target="_blank" class="datasheet-link">
                📥 ${ds.name}
              </a>
            `,
              )
              .join("")}
          </div>
        `
            : `
          <div class="datasheet-section">
            <p style="color: #999; font-style: italic;">Aucune fiche technique disponible</p>
          </div>
        `
        }
      </div>
    `,
      )
      .join("")}
  </div>

  <div class="section" style="background: #e8f5e9; border-left: 4px solid #4caf50;">
    <h2 style="color: #2e7d32; border-color: #4caf50;">✅ Instructions</h2>
    <ol style="color: #2e7d32; line-height: 1.8;">
      <li>Vérifier la disponibilité de tous les batchs listés</li>
      <li>Consulter les fiches techniques avant de commencer</li>
      <li>Pour les délaizages: mesurer précisément la largeur à enlever</li>
      <li>Enregistrer les surfaces décomptées après chaque découpe</li>
      <li>Mettre à jour le stock dans le système</li>
    </ol>
  </div>

  <script>
    // Auto-print option
    // window.print();
  </script>
</body>
</html>
    `

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    })
  } catch (error) {
    console.error("[v0] Error generating manufacturing order:", error)
    return NextResponse.json({ error: "Failed to generate manufacturing order" }, { status: 500 })
  }
}
