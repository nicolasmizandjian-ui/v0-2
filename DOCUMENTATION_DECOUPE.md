# Documentation - Système de Gestion de Découpe SONEFI

## Vue d'ensemble

Ce document décrit le système de gestion de découpe et de production développé pour SONEFI. Le système permet de gérer les commandes clients, optimiser la découpe des matières, et suivre le stock.

## Architecture

### Base de données (Supabase)

#### Tables principales

1. **ATELIER_MONDAY**
   - Contient les commandes clients et produits à fabriquer
   - Colonnes clés : `Référence produit`, `Quantité` (bigint), `Unité` (text), `NOM CLIENT`, `Description`

2. **STOCK_MONDAY_PRODUITS_FINIS**
   - Stock des produits finis disponibles
   - Colonnes clés : `Matière SONEFI`, `Stock`, `Unité`, `Laize (en mm)`, `Loc`

3. **STOCK_MONDAY_MATIERES**
   - Stock des matières premières à découper
   - Colonnes clés : `Matière SELLSY`, `Matière SONEFI`, `Stock`, `Unité`, `Laize (en mm)`, `Catégorie`, `Loc`

4. **STOCK_MONDAY_ACCESSOIRES**
   - Stock des accessoires
   - Colonnes clés : `Matière SONEFI`, `Stock`, `Unité`, `Loc`

5. **TABLE_CATEGORIE**
   - Mapping entre les codes matières et leurs catégories
   - Colonnes : `Code` (première lettre de la référence), `Type` (catégorie)
   - Exemple : Code "P" → Type "AIGUILLETE_FILTRATION"

### Workflow de découpe

#### Étape 1 : Sélection du client
- L'opérateur sélectionne un client depuis ATELIER_MONDAY
- Le système récupère tous les produits à fabriquer pour ce client
- Affichage des quantités nécessaires (Quantité + Unité)

#### Étape 2 : Vérification des produits finis en stock
- Pour chaque produit à fabriquer (ex: `PB198x39_P5_V`) :
  - Extraction du code produit avant le premier underscore (ex: `PB198x39`)
  - Recherche dans `STOCK_MONDAY_PRODUITS_FINIS` des produits correspondants
  - Affichage des produits finis disponibles avec leur stock et unité
- L'opérateur sélectionne les produits finis qu'il souhaite utiliser
- Le système calcule la quantité restante à produire après déduction du stock sélectionné

#### Étape 3 : Sélection des matières à découper
- Pour les quantités restantes à produire :
  - Extraction de la référence matière (ex: `P5` depuis `PB198x39_P5_V`)
  - Recherche de la catégorie via `TABLE_CATEGORIE` (ex: P → AIGUILLETE_FILTRATION)
  - Normalisation des noms de catégories (suppression accents, remplacement espaces par underscores)
  - Recherche dans `STOCK_MONDAY_MATIERES` de toutes les matières de cette catégorie
  - Affichage des matières avec : Référence SONEFI, Stock arrondi, Unité, Laize (en mm)
- L'opérateur sélectionne les rouleaux de matière nécessaires

#### Étape 4 : Informations de découpe
- Pour chaque rouleau sélectionné (produits finis + matières premières) :
  - Saisie du batch exact du rouleau
  - Saisie de la surface à décompter
- Validation finale pour lancer la découpe

## Composants principaux

### `/app/production/page.tsx`
Page principale de production avec navigation vers :
- Découpe (gestion des découpes)
- Confection (assemblage)
- Retirer du Stock

### `/components/clients-dialog.tsx`
Composant principal gérant tout le workflow de découpe :
- Sélection client
- Gestion des 3 onglets (Produits finis / Matières / Informations découpe)
- Calcul des quantités restantes
- Sélection des rouleaux
- Saisie des informations de découpe

### Routes API

#### `/api/supabase/clients/route.ts`
- Récupère la liste des clients depuis ATELIER_MONDAY
- Retourne les clients uniques avec leurs produits

#### `/api/supabase/product-quantities/route.ts`
- Récupère les quantités (Quantité + Unité) pour une liste de références produits
- Interroge directement ATELIER_MONDAY (pas Monday.com API)

#### `/api/supabase/rolls/smart-search/route.ts`
- Recherche intelligente en deux étapes :
  1. Recherche produits finis dans `STOCK_MONDAY_PRODUITS_FINIS`
  2. Si quantité restante > 0, recherche matières dans `STOCK_MONDAY_MATIERES`
- Paramètres : `sellsyReference`, `quantityNeeded`
- Retourne : produits finis, matières premières, quantité restante, avec laizes

## Logique métier importante

### Normalisation des catégories
\`\`\`typescript
function normalizeCategory(category: string): string {
  return category
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .toUpperCase()
}
\`\`\`
Permet de matcher "AIGUILLETE_FILTRATION" avec "AIGUILLETÉ FILTRATION"

### Calcul des quantités restantes
\`\`\`typescript
const selectedFinishedStock = selectedRolls
  .filter(r => r.type === 'finished')
  .reduce((sum, r) => sum + (r.stock || 0), 0)

const remainingQuantity = quantityNeeded - selectedFinishedStock
\`\`\`

### Arrondi des stocks
Tous les stocks affichés sont arrondis sans décimales : `Math.round(stock)`

## Points d'attention

1. **Supabase vs Monday.com** : Pour le stock et l'atelier, toujours utiliser Supabase, pas l'API Monday.com
2. **Colonnes avec accents** : Les noms de colonnes contiennent des accents (Quantité, Unité, Catégorie)
3. **Produits finis** : Filtrer les références commençant par "PF" (ce sont des produits finis, pas des matières premières)
4. **Laizes** : Toujours afficher les laizes pour éviter les erreurs de l'opérateur
5. **Normalisation** : Normaliser les catégories pour matcher correctement entre tables

## État actuel

✅ Fonctionnalités implémentées :
- Sélection client avec récupération des quantités depuis Supabase
- Recherche intelligente produits finis + matières premières
- Workflow en 3 étapes avec onglets
- Décompte des quantités basé sur la sélection
- Affichage des laizes pour les matières
- Saisie batch et surface pour chaque rouleau sélectionné

🔄 Prochaines étapes possibles :
- Finalisation de la découpe (mise à jour des stocks)
- Traçabilité des découpes effectuées
- Gestion de la confection après découpe
- Retrait du stock

## Variables d'environnement

Le projet utilise les variables Supabase suivantes (déjà configurées) :
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_POSTGRES_URL`
- `SUPABASE_SUPABASE_ANON_KEY`
- `SUPABASE_SUPABASE_SERVICE_ROLE_KEY`

## Structure des fichiers clés

\`\`\`
app/
├── production/
│   └── page.tsx                    # Page principale production
├── api/
│   └── supabase/
│       ├── clients/route.ts        # Liste clients
│       ├── product-quantities/route.ts  # Quantités produits
│       └── rolls/
│           ├── smart-search/route.ts    # Recherche intelligente
│           └── alternatives/route.ts    # Alternatives matières
components/
├── clients-dialog.tsx              # Dialog principal workflow découpe
└── ui/                             # Composants shadcn/ui
lib/
└── supabase/
    └── server.ts                   # Client Supabase serveur
\`\`\`

## Notes techniques

- Framework : Next.js 15 avec App Router
- UI : shadcn/ui + Tailwind CSS
- Base de données : Supabase (PostgreSQL)
- Authentification : Désactivée (retirée du système)
- Style : Design tokens personnalisés dans globals.css
