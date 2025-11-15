"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, Package, Clock, CheckCircle } from "lucide-react"
import { useState, useEffect } from "react"

interface Product {
  id: string
  reference: string
  realizedQuantity: string
}

interface AssemblageTask {
  id: string
  client: string
  products: Product[]
  createdAt: Date
  isCompleted?: boolean
}

interface AssemblageTaskCardProps {
  task: AssemblageTask
  onRemove: (taskId: string) => void
  onComplete: (taskId: string) => void
}

export function AssemblageTaskCard({ task, onRemove, onComplete }: AssemblageTaskCardProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(true)
  const [isCompleted, setIsCompleted] = useState(task.isCompleted || false)

  useEffect(() => {
    if (!isRunning || isCompleted) return

    const interval = setInterval(() => {
      const now = Date.now()
      const elapsed = Math.floor((now - task.createdAt.getTime()) / 1000)
      setElapsedSeconds(elapsed)
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning, isCompleted, task.createdAt])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleComplete = async () => {
    setIsCompleted(true)
    setIsRunning(false)

    const durationMinutes = Math.floor(elapsedSeconds / 60)

    try {
      const response = await fetch("/api/supabase/assemblage/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productIds: task.products.map((p) => p.id),
          durationMinutes, // Send duration to API
        }),
      })

      if (!response.ok) {
        console.error("[v0] Failed to complete assemblage")
      } else {
        console.log("[v0] Assemblage completed successfully")
      }
    } catch (error) {
      console.error("[v0] Error calling assemblage complete API:", error)
    }

    onComplete(task.id)
  }

  return (
    <Card className={`border-2 ${isCompleted ? "border-green-200 bg-green-50/50" : "border-green-200 bg-green-50/50"}`}>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className={`h-2 w-2 rounded-full ${isCompleted ? "bg-green-600" : "bg-green-600 animate-pulse"}`} />
              <h3 className="text-lg font-bold text-green-900">
                {isCompleted ? "Assemblage terminé" : "Assemblage en cours"} - {task.client}
              </h3>
            </div>

            <div className="space-y-3 mt-3">
              <div className="flex items-start gap-2">
                <Package className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800 mb-1">Produits ({task.products.length})</p>
                  <div className="space-y-1">
                    {task.products.map((product) => (
                      <div key={product.id} className="text-sm text-green-900">
                        <span className="font-medium">{product.reference}</span>
                        <span className="text-green-700 ml-2">Qté: {product.realizedQuantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {!isCompleted && (
              <div className="mt-4">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleComplete}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4" />
                  Terminer la tâche
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2 ml-4">
            <div className="flex items-center gap-2 text-green-700 bg-green-100 px-3 py-1 rounded-full">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-mono font-medium">{formatTime(elapsedSeconds)}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemove(task.id)}
              className="text-green-600 hover:text-green-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
