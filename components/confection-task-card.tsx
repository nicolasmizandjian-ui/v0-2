"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, Users, Package, Clock, Pause, Play, CheckCircle } from "lucide-react"
import { useState, useEffect } from "react"

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
  isCompleted?: boolean
}

interface ConfectionTaskCardProps {
  task: ConfectionTask
  onRemove: (taskId: string) => void
  onComplete?: (taskId: string) => void
}

export function ConfectionTaskCard({ task, onRemove, onComplete }: ConfectionTaskCardProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(true)
  const [isCompleted, setIsCompleted] = useState(task.isCompleted || false)
  const [startTime] = useState(Date.now())
  const [pausedTime, setPausedTime] = useState(0)

  useEffect(() => {
    if (!isRunning || isCompleted) return

    const interval = setInterval(() => {
      const now = Date.now()
      const elapsed = Math.floor((now - startTime - pausedTime) / 1000)
      setElapsedSeconds(elapsed)
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning, isCompleted, startTime, pausedTime])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleTogglePause = () => {
    if (isRunning) {
      setPausedTime((prev) => prev + (Date.now() - startTime - prev - elapsedSeconds * 1000))
    }
    setIsRunning(!isRunning)
  }

  const handleComplete = async () => {
    setIsCompleted(true)
    setIsRunning(false)

    const durationMinutes = Math.floor(elapsedSeconds / 60)

    console.log("[v0] Task completed:", {
      taskId: task.id,
      elapsedTime: formatTime(elapsedSeconds),
      durationMinutes,
      products: task.products.map((p) => p.reference),
      assignedTo: task.assignedTo,
    })

    // Appeler l'API pour mettre à jour le statut à "a_expedier"
    try {
      const response = await fetch("/api/supabase/confection/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientName: task.clientName,
          durationMinutes, // Send duration to API
          products: task.products.map((p) => ({
            reference: p.reference,
            id: p.id,
          })),
        }),
      })

      if (!response.ok) {
        console.error("[v0] Failed to update confection status")
      } else {
        console.log("[v0] Confection status updated successfully to a_expedier")
      }
    } catch (error) {
      console.error("[v0] Error calling confection complete API:", error)
    }

    onComplete?.(task.id)
  }

  return (
    <Card
      className={`border-2 ${isCompleted ? "border-green-200 bg-green-50/50" : "border-purple-200 bg-purple-50/50"}`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className={`h-2 w-2 rounded-full ${isCompleted ? "bg-green-600" : "bg-purple-600 animate-pulse"}`} />
              <h3 className="text-lg font-bold text-foreground">
                {isCompleted ? "Confection terminée" : "Confection en cours"} - {task.clientName}
              </h3>
            </div>

            <div className="space-y-3 mt-3">
              <div className="flex items-start gap-2">
                <Package className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Produits ({task.products.length})</p>
                  <div className="space-y-1">
                    {task.products.map((product) => (
                      <div key={product.id} className="text-sm text-foreground">
                        <span className="font-medium">{product.reference}</span>
                        <span className="text-purple-600 ml-2">Qté: {product.realizedQuantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Assigné à</p>
                  <p className="text-sm text-foreground">{task.assignedTo.join(", ")}</p>
                </div>
              </div>
            </div>

            {!isCompleted && (
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={handleTogglePause} className="gap-2 bg-transparent">
                  {isRunning ? (
                    <>
                      <Pause className="h-4 w-4" />
                      Arrêter
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Reprendre
                    </>
                  )}
                </Button>
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
            <div className="flex items-center gap-2 text-blue-600">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-mono font-medium">{formatTime(elapsedSeconds)}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemove(task.id)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
