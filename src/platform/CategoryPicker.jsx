import { useMemo, useState } from 'react'
import { LuSearch, LuCheck, LuChevronDown } from 'react-icons/lu'

const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// Seletor de categorias do catálogo, agrupado por área e com busca
export default function CategoryPicker({ catalog, selected, onToggle }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const groups = useMemo(() => {
    const term = norm(q.trim())
    const map = new Map()
    for (const c of catalog) {
      if (term && !norm(`${c.label} ${c.group} ${(c.aliases || []).join(' ')}`).includes(term)) continue
      if (!map.has(c.group)) map.set(c.group, [])
      map.get(c.group).push(c)
    }
    return [...map.entries()]
  }, [catalog, q])
  const chosen = new Set(selected.map(norm))
  if (!catalog.length) return null

  return (
    <div className={`catpick ${open ? 'is-open' : ''}`}>
      <button type="button" className="catpick__toggle" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        Ver todas as categorias ({catalog.length}) <LuChevronDown aria-hidden="true" />
      </button>
      {open && (
        <div className="catpick__panel">
          <label className="catpick__search">
            <LuSearch aria-hidden="true" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar: barbearia, oficina, buffet…" autoFocus />
          </label>
          <div className="catpick__groups">
            {groups.length === 0 && <p className="muted small">Nenhuma categoria encontrada. Digite o termo no campo acima que buscamos pelo nome.</p>}
            {groups.map(([group, items]) => (
              <div key={group} className="catpick__group">
                <span className="catpick__label">{group}</span>
                <div className="catpick__chips">
                  {items.map(c => {
                    const on = chosen.has(norm(c.label))
                    return (
                      <button type="button" key={c.key} className={`catpick__chip ${on ? 'is-on' : ''}`} onClick={() => onToggle(c.label, on)}
                        title={c.aliases?.length ? `Inclui: ${c.aliases.join(', ')}` : undefined}>
                        {on && <LuCheck aria-hidden="true" />}{c.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
