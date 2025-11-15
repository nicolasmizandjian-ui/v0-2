import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("[v0] Returning static collaborateurs list")
    
    // Liste statique des collaborateurs de l'atelier
    const collaborateurs = [
      { id: 1, nom: "Justyna", prenom: "Justyna", actif: true },
      { id: 2, nom: "Monique", prenom: "Monique", actif: true },
      { id: 3, nom: "Dodou", prenom: "Dodou", actif: true },
      { id: 4, nom: "Christine", prenom: "Christine", actif: true },
      { id: 5, nom: "Sébastien", prenom: "Sébastien", actif: true },
      { id: 6, nom: "Andy", prenom: "Andy", actif: true },
    ]

    return NextResponse.json({ collaborateurs })
  } catch (error: any) {
    console.error("[v0] Error fetching collaborateurs:", error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nom, prenom, couleur, poste } = body

    // Insertion du code pour la création d'un collaborateur statique
    console.log("[v0] Creating static collaborateur")

    const collaborateur = {
      id: 5, // ID statique pour l'exemple
      nom,
      prenom,
      couleur,
      poste,
      actif: true, // Actif par défaut
    }

    return NextResponse.json({ collaborateur })
  } catch (error: any) {
    console.error("[v0] Error creating collaborateur:", error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
