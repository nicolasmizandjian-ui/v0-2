"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ClientsDialog } from "@/components/clients-dialog"
import { SuppliersDialog } from "@/components/suppliers-dialog"
import { ConfectionDialog } from "@/components/confection-dialog"
import { ConfectionTaskCard } from "@/components/confection-task-card"
import { CuttingCompletionDialog } from "@/components/cutting-completion-dialog"
import { ExpeditionDialog } from "@/components/expedition-dialog"
import { AssemblageDialog } from "@/components/assemblage-dialog"
import { AssemblageTaskCard } from "@/components/assemblage-task-card"
import { Check } from 'lucide-react'

const stages = [
  {
    id: 1,
    name: "Découpe",
    description: "Lancement du processus de découpe",
    status: "En attente",
    color: "bg-[var(--stage-blue)]",
    borderColor: "border-[var(--stage-blue)]",
  },
  {
    id: 2,
    name: "Nettoyage",
    description: "Nettoyage et préparation des pièces",
    status: "En attente",
    color: "bg-[var(--stage-cyan)]",
    borderColor: "border-[var(--stage-cyan)]",
  },
  {
    id: 3,
    name: "Assemblage",
    description: "Assemblage des composants",
    status: "En attente",
    color: "bg-[var(--stage-green)]",
    borderColor: "border-[var(--stage-green)]",
  },
  {
    id: 4,
    name: "Confection",
    description: "Finalisation du produit",
    status: "En attente",
    color: "bg-[var(--stage-purple)]",
    borderColor: "border-[var(--stage-purple)]",
  },
  {
    id: 5,
    name: "Mise en Stock",
    description: "Mise en stock du produit fini",
    status: "En attente",
    color: "bg-[var(--stage-orange)]",
    borderColor: "border-[var(--stage-orange)]",
  },
  {
    id: 6,
    name: "Retirer du Stock",
    description: "Retrait du produit du stock",
    status: "En attente",
    color: "bg-[var(--stage-red)]",
    borderColor: "border-[var(--stage-red)]",
  },
]

interface Product {
  id: string
  reference: string
  clientName: string
  description: string
  realizedQuantity: string
}

interface ConfectionTask {
  id: string
  clientName: string
  products: Product[]
  assignedTo: string[]
  createdAt: Date
  isCompleted: boolean
}

interface CuttingAction {
  id: string
  client: string
  productsCount: number
  products: Array<{
    reference: string
    quantity: number
    unit: string
  }>
  rolls: Array<{
    rollReference: string
    rollBatch: string
    plannedQuantity: number
    unit: string
    sellsyRef?: string
    laize?: string
    metrage?: number
  }>
  createdAt: Date
}

interface AssemblageTask {
  id: string
  client: string
  products: any[]
  person: string
  createdAt: Date
}

export default function ProductionPage() {
  const [showClientsDialog, setShowClientsDialog] = useState(false)
  const [showSuppliersDialog, setShowSuppliersDialog] = useState(false)
  const [showConfectionDialog, setShowConfectionDialog] = useState(false)
  const [showCuttingCompletionDialog, setShowCuttingCompletionDialog] = useState(false)
  const [showExpeditionDialog, setShowExpeditionDialog] = useState(false)
  const [showAssemblageDialog, setShowAssemblageDialog] = useState(false)
  const [selectedCuttingAction, setSelectedCuttingAction] = useState<CuttingAction | null>(null)
  const [confectionTasks, setConfectionTasks] = useState<ConfectionTask[]>([])
  const [cuttingActions, setCuttingActions] = useState<CuttingAction[]>([])
  const [assemblageTasks, setAssemblageTasks] = useState<AssemblageTask[]>([])

  useEffect(() => {
    const savedTasks = localStorage.getItem("confection-tasks")
    if (savedTasks) {
      try {
        const parsed = JSON.parse(savedTasks)
        const tasksWithDates = parsed.map((task: any) => ({
          ...task,
          createdAt: new Date(task.createdAt),
        }))
        setConfectionTasks(tasksWithDates)
      } catch (error) {
        console.error("Failed to load confection tasks from localStorage:", error)
      }
    }

    const savedActions = localStorage.getItem("cutting-actions")
    if (savedActions) {
      try {
        const parsed = JSON.parse(savedActions)
        const actionsWithDates = parsed.map((action: any) => ({
          ...action,
          createdAt: new Date(action.createdAt),
        }))
        setCuttingActions(actionsWithDates)
      } catch (error) {
        console.error("Failed to load cutting actions from localStorage:", error)
      }
    }

    const savedAssemblageTasks = localStorage.getItem("assemblage-tasks")
    if (savedAssemblageTasks) {
      try {
        const parsed = JSON.parse(savedAssemblageTasks)
        const tasksWithDates = parsed.map((task: any) => ({
          ...task,
          createdAt: new Date(task.createdAt),
        }))
        setAssemblageTasks(tasksWithDates)
      } catch (error) {
        console.error("Failed to load assemblage tasks from localStorage:", error)
      }
    }

    const handleNewCuttingAction = (event: CustomEvent) => {
      const newAction: CuttingAction = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${event.detail.client.replace(/\s+/g, '-')}`,
        client: event.detail.client,
        productsCount: event.detail.productsCount,
        products: event.detail.products || [],
        rolls: event.detail.rolls || [],
        createdAt: new Date(),
      }
      setCuttingActions((prev) => [...prev, newAction])
    }

    window.addEventListener("cuttingActionStarted" as any, handleNewCuttingAction)

    return () => {
      window.removeEventListener("cuttingActionStarted" as any, handleNewCuttingAction)
    }
  }, [])

  useEffect(() => {
    if (confectionTasks.length > 0) {
      localStorage.setItem("confection-tasks", JSON.stringify(confectionTasks))
    } else {
      localStorage.removeItem("confection-tasks")
    }
  }, [confectionTasks])

  useEffect(() => {
    if (cuttingActions.length > 0) {
      localStorage.setItem("cutting-actions", JSON.stringify(cuttingActions))
    } else {
      localStorage.removeItem("cutting-actions")
    }
  }, [cuttingActions])

  useEffect(() => {
    if (assemblageTasks.length > 0) {
      localStorage.setItem("assemblage-tasks", JSON.stringify(assemblageTasks))
    } else {
      localStorage.removeItem("assemblage-tasks")
    }
  }, [assemblageTasks])

  const handleDecoupeClick = () => {
    setShowClientsDialog(true)
  }

  const handleStockEntryClick = () => {
    setShowSuppliersDialog(true)
  }

  const handleConfectionClick = () => {
    setShowConfectionDialog(true)
  }

  const handleTaskComplete = (taskId: string) => {
    setConfectionTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, isCompleted: true } : task)))
  }

  const handleRemoveTask = (taskId: string) => {
    setConfectionTasks((prev) => prev.filter((task) => task.id !== taskId))
  }

  const handleCompleteCuttingAction = (action: CuttingAction) => {
    setSelectedCuttingAction(action)
    setShowCuttingCompletionDialog(true)
  }

  const handleCuttingCompleted = (actionId: string) => {
    setCuttingActions((prev) => prev.filter((action) => action.id !== actionId))
    setSelectedCuttingAction(null)
  }

  const handleExpeditionClick = () => {
    setShowExpeditionDialog(true)
  }

  const handleConfectionTaskCreated = async (newTask: ConfectionTask) => {
    try {
      const response = await fetch("/api/supabase/confection/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientName: newTask.clientName,
          products: newTask.products.map((p) => ({
            reference: p.reference,
          })),
        }),
      })

      if (!response.ok) {
        console.error("[v0] Failed to start confection in database")
      } else {
        console.log("[v0] Confection started successfully in database")
      }
    } catch (error) {
      console.error("[v0] Error calling confection start API:", error)
    }

    setConfectionTasks((prev) => [...prev, newTask])
  }

  const handleAssemblageClick = () => {
    setShowAssemblageDialog(true)
  }

  const handleAssemblageTaskCreated = async (newTask: any) => {
    try {
      const response = await fetch("/api/supabase/assemblage/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientName: newTask.client,
          products: newTask.products.map((p: any) => ({
            reference: p.reference,
          })),
        }),
      })

      if (!response.ok) {
        console.error("[v0] Failed to start assemblage in database")
      } else {
        console.log("[v0] Assemblage started successfully in database")
      }
    } catch (error) {
      console.error("[v0] Error calling assemblage start API:", error)
    }

    setAssemblageTasks((prev) => [...prev, newTask])
  }

  const handleCompleteAssemblageTask = async (taskId: string) => {
    const task = assemblageTasks.find((t) => t.id === taskId)
    if (!task) return

    try {
      const productIds = task.products.map((p: any) => p.id)
      await fetch("/api/supabase/assemblage/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds }),
      })

      setAssemblageTasks((prev) => prev.filter((t) => t.id !== taskId))
    } catch (error) {
      console.error("[v0] Error completing assemblage:", error)
    }
  }

  const handleRemoveAssemblageTask = (taskId: string) => {
    setAssemblageTasks((prev) => prev.filter((t) => t.id !== taskId))
  }

  const productsInConfection = confectionTasks
    .filter((task) => !task.isCompleted)
    .reduce((total, task) => {
      const taskTotal = task.products.reduce((sum, product) => {
        const quantity = Number.parseFloat(product.realizedQuantity) || 0
        return sum + quantity
      }, 0)
      return total + taskTotal
    }, 0)

  const productsInFabrication = cuttingActions.reduce((total, action) => {
    if (!action.products || !Array.isArray(action.products)) {
      return total
    }
    const actionTotal = action.products.reduce((sum, product) => sum + product.quantity, 0)
    return total + actionTotal
  }, 0)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Production</h1>
        <p className="mt-2 text-muted-foreground">Gestion du processus de fabrication</p>
      </div>

      <div className="mb-8 flex gap-6">
        <div className="rounded-lg border border-border bg-card px-6 py-3">
          <div className="text-2xl font-bold text-foreground">0</div>
          <div className="text-sm text-muted-foreground">En cours</div>
        </div>
        <div className="rounded-lg border border-border bg-card px-6 py-3">
          <div className="text-2xl font-bold text-foreground">0</div>
          <div className="text-sm text-muted-foreground">Terminés</div>
        </div>
        <div className="rounded-lg border border-border bg-card px-6 py-3">
          <div className="text-2xl font-bold text-foreground">0</div>
          <div className="text-sm text-muted-foreground">En stock</div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {stages.map((stage) => (
          <Card key={stage.id}>
            <div className="p-6">
              <h3 className="text-xl font-bold text-foreground">{stage.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{stage.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{stage.status}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className={`border-2 ${stage.borderColor}`}
                  onClick={
                    stage.name === "Découpe"
                      ? handleDecoupeClick
                      : stage.name === "Mise en Stock"
                        ? handleStockEntryClick
                        : stage.name === "Confection"
                          ? handleConfectionClick
                          : stage.name === "Assemblage"
                            ? handleAssemblageClick
                            : undefined
                  }
                >
                  Lancer l'action
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <Card className="border-2 border-blue-500 bg-gradient-to-r from-blue-50 to-blue-100">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-blue-900">À Expédier</h3>
                <p className="mt-1 text-sm text-blue-700">Gestion des produits prêts à l'expédition</p>
              </div>
              <Button
                size="lg"
                onClick={handleExpeditionClick}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8"
              >
                Lancer l'action
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-12 space-y-8">
        <section>
          <h2 className="mb-4 text-2xl font-bold text-foreground">État du système</h2>
          <Card className="p-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <div className="text-sm text-muted-foreground">Produits en fabrication</div>
                <div className="mt-1 text-2xl font-bold text-foreground">{productsInFabrication}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Produits en confection</div>
                <div className="mt-1 text-2xl font-bold text-purple-600">{productsInConfection}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Produits terminés</div>
                <div className="mt-1 text-2xl font-bold text-foreground">0</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Produits en stock</div>
                <div className="mt-1 text-2xl font-bold text-foreground">0</div>
              </div>
            </div>
          </Card>
        </section>

        {cuttingActions.length > 0 && (
          <section>
            <h2 className="mb-4 text-2xl font-bold text-foreground">Actions en cours</h2>
            <div className="space-y-4">
              {cuttingActions.map((action) => (
                <Card key={action.id} className="p-6 border-2 border-blue-200 bg-blue-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                        <h3 className="text-lg font-bold text-blue-900">Découpe en cours</h3>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p className="text-blue-800">
                          <span className="font-semibold">Client:</span> {action.client}
                        </p>
                        <p className="text-blue-800">
                          <span className="font-semibold">Produits:</span> {action.productsCount} référence
                          {action.productsCount > 1 ? "s" : ""}
                        </p>
                        {action.products && action.products.length > 0 && (
                          <div className="mt-3 space-y-1.5">
                            <p className="font-semibold text-blue-900">Détail des produits:</p>
                            {action.products.map((product, index) => (
                              <div
                                key={index}
                                className="bg-white rounded-md p-2 border border-blue-300 flex items-center justify-between"
                              >
                                <span className="text-xs font-medium text-blue-900">{product.reference}</span>
                                <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                                  {product.quantity} {product.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {action.rolls && action.rolls.length > 0 && (
                          <div className="mt-3 space-y-1.5">
                            <p className="font-semibold text-blue-900">Détail des rouleaux:</p>
                            {action.rolls.map((roll, index) => (
                              <div
                                key={index}
                                className="bg-white rounded-md p-2 border border-blue-300 flex items-center justify-between"
                              >
                                <span className="text-xs font-medium text-blue-900">{roll.rollReference}</span>
                                <span className="text-xs font-medium text-blue-900">Batch: {roll.rollBatch}</span>
                                {roll.sellsyRef && (
                                  <span className="text-xs font-medium text-blue-900">
                                    Sellsy Ref: {roll.sellsyRef}
                                  </span>
                                )}
                                {roll.laize && (
                                  <span className="text-xs font-medium text-blue-900">Laize: {roll.laize}</span>
                                )}
                                {roll.metrage !== undefined && (
                                  <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                                    {roll.metrage} m
                                  </span>
                                )}
                                <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                                  {roll.plannedQuantity} {roll.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-blue-700 text-xs mt-2">
                          Démarrée il y a {Math.floor((Date.now() - action.createdAt.getTime()) / 60000)} minute
                          {Math.floor((Date.now() - action.createdAt.getTime()) / 60000) !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleCompleteCuttingAction(action)}
                      className="bg-green-600 hover:bg-green-700 text-white gap-2"
                    >
                      <Check className="h-4 w-4" />
                      Découpe Terminée
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {confectionTasks.length > 0 && (
          <section>
            <h2 className="mb-4 text-2xl font-bold text-foreground">Tâches en cours</h2>
            <div className="space-y-4">
              {confectionTasks.map((task) => (
                <ConfectionTaskCard
                  key={task.id}
                  task={task}
                  onRemove={handleRemoveTask}
                  onComplete={handleTaskComplete}
                />
              ))}
            </div>
          </section>
        )}

        {assemblageTasks.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 text-2xl font-bold text-foreground">Tâches d'assemblage en cours</h2>
            <div className="space-y-4">
              {assemblageTasks.map((task) => (
                <AssemblageTaskCard
                  key={task.id}
                  task={task}
                  onRemove={handleRemoveAssemblageTask}
                  onComplete={handleCompleteAssemblageTask}
                />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-4 text-2xl font-bold text-foreground">Inventaire annuel</h2>
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <span className="text-sm font-medium text-muted-foreground">Période autorisée</span>
                <span className="text-sm text-foreground">Du 01/01/2024 au 31/12/2024</span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-4">
                <span className="text-sm font-medium text-muted-foreground">Statut</span>
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">Actif</span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-4">
                <span className="text-sm font-medium text-muted-foreground">Catégories</span>
                <span className="text-sm text-foreground">Toutes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Méthode</span>
                <span className="text-sm text-foreground">QR Code</span>
              </div>
            </div>
          </Card>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-bold text-foreground">Processus</h2>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">
              Le processus de production suit un flux séquentiel de la découpe jusqu'à la mise en stock. Chaque étape
              doit être validée avant de passer à la suivante.
            </p>
          </Card>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-bold text-foreground">Objectifs</h2>
          <Card className="p-6">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Optimiser le temps de production</li>
              <li>• Réduire les erreurs de fabrication</li>
              <li>• Améliorer la traçabilité des produits</li>
              <li>• Maintenir un stock optimal</li>
            </ul>
          </Card>
        </section>

        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">⚠️ L'inventaire est temporairement indisponible pour maintenance</p>
        </div>
      </div>

      <ClientsDialog open={showClientsDialog} onOpenChange={setShowClientsDialog} />
      <SuppliersDialog open={showSuppliersDialog} onOpenChange={setShowSuppliersDialog} />
      <ConfectionDialog
        open={showConfectionDialog}
        onOpenChange={setShowConfectionDialog}
        onTaskCreated={handleConfectionTaskCreated}
      />
      <CuttingCompletionDialog
        open={showCuttingCompletionDialog}
        onOpenChange={setShowCuttingCompletionDialog}
        action={selectedCuttingAction}
        onComplete={handleCuttingCompleted}
      />
      <ExpeditionDialog open={showExpeditionDialog} onOpenChange={setShowExpeditionDialog} />
      <AssemblageDialog
        open={showAssemblageDialog}
        onOpenChange={setShowAssemblageDialog}
        onTaskCreated={handleAssemblageTaskCreated}
      />
    </div>
  )
}
