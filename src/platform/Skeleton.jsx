// Esqueletos de carregamento: blocos com brilho no formato da página que vai aparecer
export function PageSkeleton({ cards = 4, rows = 2 }) {
  return (
    <div className="page" aria-busy="true" aria-label="Carregando">
      <div className="sk-head">
        <span className="sk sk--icon" />
        <div><span className="sk sk--title" /><span className="sk sk--line" /></div>
      </div>
      <div className="sk-grid">
        {Array.from({ length: cards }, (_, i) => <div key={i} className="sk-card" style={{ '--i': i }}><span className="sk sk--small" /><span className="sk sk--num" /><span className="sk sk--line" /></div>)}
      </div>
      {Array.from({ length: rows }, (_, i) => <div key={i} className="sk-block" style={{ '--i': i + cards }}><span className="sk sk--line" /><span className="sk sk--wide" /><span className="sk sk--wide" /></div>)}
    </div>
  )
}

export function ListSkeleton({ rows = 5 }) {
  return (
    <div className="sk-list" aria-busy="true" aria-label="Carregando">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="sk-row" style={{ '--i': i }}>
          <span className="sk sk--avatar" />
          <div><span className="sk sk--line" /><span className="sk sk--small" /></div>
        </div>
      ))}
    </div>
  )
}
