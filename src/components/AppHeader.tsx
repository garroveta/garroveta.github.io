export function AppHeader() {
  return (
    <header className="app-header">
      <a className="brand" href="#inicio" aria-label="MTG Community, inicio">
        <span className="brand__mark" aria-hidden="true">
          M
        </span>
        <span className="brand__text">
          <strong>MTG Community</strong>
          <small>Tienda piloto</small>
        </span>
      </a>

      <span className="prototype-badge">Prototipo</span>
    </header>
  )
}
