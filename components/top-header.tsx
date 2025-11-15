"use client"

import { useEffect, useState } from "react"

export function TopHeader() {
  const [currentDate, setCurrentDate] = useState<string>("")
  const [currentDay, setCurrentDay] = useState<string>("")
  const [weekNumber, setWeekNumber] = useState<string>("")

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date()
      const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]
      const day = days[now.getDay()]
      const date = now.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })

      const getWeekNumber = (d: Date) => {
        const target = new Date(d.valueOf())
        const dayNr = (d.getDay() + 6) % 7
        target.setDate(target.getDate() - dayNr + 3)
        const firstThursday = target.valueOf()
        target.setMonth(0, 1)
        if (target.getDay() !== 4) {
          target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7))
        }
        return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000)
      }

      const week = getWeekNumber(now)

      setCurrentDay(day)
      setCurrentDate(date)
      setWeekNumber(`Semaine ${week}`)
    }

    updateDateTime()
    const interval = setInterval(updateDateTime, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="sticky top-0 z-30 flex h-16 items-center justify-end bg-background px-6">
      <div className="text-right">
        <p className="text-sm font-medium text-foreground">{currentDay}</p>
        <p className="text-xs text-muted-foreground">{currentDate}</p>
        <p className="text-xs font-medium text-muted-foreground">{weekNumber}</p>
      </div>
    </div>
  )
}
