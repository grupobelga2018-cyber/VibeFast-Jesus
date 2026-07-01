// Filtro de búsqueda para las docs, sin dependencias.
// Insensible a acentos y mayúsculas; rankea título > heading > descripción > body.

export function normalize(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
}

export function searchDocs(index, query, limit = 8) {
  const q = normalize(query).trim()
  if (!q) return []
  const terms = q.split(/\s+/)

  const scored = []
  for (const doc of index) {
    const title = normalize(doc.title)
    const headings = normalize((doc.headings || []).join(" "))
    const description = normalize(doc.description)
    const body = normalize(doc.body)

    let score = 0
    let matchedAll = true
    for (const term of terms) {
      let termScore = 0
      if (title.includes(term)) termScore += title.startsWith(term) ? 12 : 8
      if (headings.includes(term)) termScore += 4
      if (description.includes(term)) termScore += 2
      if (body.includes(term)) termScore += 1
      if (termScore === 0) {
        matchedAll = false
        break
      }
      score += termScore
    }

    if (matchedAll) scored.push({ doc, score })
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.doc)
}
