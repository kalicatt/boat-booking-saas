"use client"

import { useEffect, useState } from "react"

export default function ThemeToggle() {
  const [theme, setTheme] = useState<string>("system")

  useEffect(() => {
    const stored = localStorage.getItem("sn-theme") || "system"
    setTheme(stored)
    applyTheme(stored)
  }, [])

  const applyTheme = (t: string) => {
    const root = document.documentElement
    if (t === "dark") {
      root.classList.add("dark")
    } else if (t === "light") {
      root.classList.remove("dark")
    } else {
      // system: follow prefers-color-scheme
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) root.classList.add("dark")
      else root.classList.remove("dark")
    }
  }

  const cycle = () => {
    const next = theme === "system" ? "light" : theme === "light" ? "dark" : "system"
    setTheme(next)
    localStorage.setItem("sn-theme", next)
    applyTheme(next)
  }

  const label = theme === "system" ? "Auto" : theme === "light" ? "Light" : "Dark"
  const icon = theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "🖥️"

  return (
    <button onClick={cycle} className="sn-btn-primary px-3 py-2" title="Toggle theme">
      <span className="mr-2">{icon}</span>
      {label}
    </button>
  )
}
