import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

export function dateToISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function hojeISO(): string {
  return dateToISO(new Date())
}

function normalizar(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export function fuzzySearch<T>(items: T[], query: string, getLabel: (item: T) => string): T[] {
  const q = normalizar(query.trim())
  if (!q) return []

  const scored: { item: T; score: number }[] = []

  for (const item of items) {
    const text = normalizar(getLabel(item))

    // Substring exato tem prioridade máxima (score 1000 - posição)
    const idx = text.indexOf(q)
    if (idx !== -1) {
      scored.push({ item, score: 1000 - idx })
      continue
    }

    // Fuzzy: todos os caracteres aparecem em ordem
    let ti = 0
    let qi = 0
    let score = 0
    let consecutivos = 0

    while (ti < text.length && qi < q.length) {
      if (text[ti] === q[qi]) {
        score += consecutivos * 3 + 1 // consecutivos valem mais
        consecutivos++
        qi++
      } else {
        consecutivos = 0
      }
      ti++
    }

    if (qi === q.length) {
      scored.push({ item, score })
    }
  }

  return scored.sort((a, b) => b.score - a.score).map((s) => s.item)
}
