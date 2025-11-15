"use client"

import Link from "next/link"
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Factory, Package, ChevronRight, ArrowLeftRight } from 'lucide-react'
import { cn } from "@/lib/utils"
import { useState } from "react"

const navigation = [
  {
    name: "Tableau de bord",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Production",
    href: "/production",
    icon: Factory,
  },
  {
    name: "Stock",
    href: "/stock",
    icon: Package,
    subItems: [
      { name: "Matières premières", href: "/stock?tab=matieres-premieres" },
      { name: "Produits finis", href: "/stock?tab=produits-finis" },
      { name: "Accessoires", href: "/stock?tab=accessoires" },
      { name: "Outillages", href: "/stock?tab=outillages" },
      { name: "Emballages", href: "/stock?tab=emballages" },
    ],
  },
  {
    name: "Correspondance",
    href: "/correspondance",
    icon: ArrowLeftRight,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [expandedItem, setExpandedItem] = useState<string | null>("Stock")

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card">
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center border-b border-border px-6">
          <h1 className="text-xl font-bold text-foreground">Plateforme</h1>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "?")
            const isExpanded = expandedItem === item.name

            return (
              <div key={item.name}>
                <Link
                  href={item.href}
                  onClick={(e) => {
                    if (item.subItems) {
                      e.preventDefault()
                      setExpandedItem(isExpanded ? null : item.name)
                    }
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                  {item.subItems && (
                    <ChevronRight className={cn("ml-auto h-4 w-4 transition-transform", isExpanded && "rotate-90")} />
                  )}
                </Link>

                {item.subItems && isExpanded && (
                  <div className="ml-8 mt-1 space-y-1">
                    {item.subItems.map((subItem) => (
                      <Link
                        key={subItem.name}
                        href={subItem.href}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        {subItem.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
