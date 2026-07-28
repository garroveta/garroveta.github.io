const prototypeAreas = [
  {
    title: 'Eventos',
    description: 'Agenda, inscripciones, listas de espera y clasificaciones.',
  },
  {
    title: 'Cartas',
    description: 'Ofertas, búsquedas y coincidencias entre miembros.',
  },
  {
    title: 'Comunidad',
    description: 'Noticias y comunicaciones organizadas por etiquetas.',
  },
]

export function App() {
  return (
    <main className="app-shell">
      <section className="hero" aria-labelledby="page-title">
        <span className="eyebrow">Prototipo local</span>
        <h1 id="page-title">MTG Community</h1>
        <p className="hero__description">
          Un espacio para organizar la comunidad de jugadores de tu tienda.
        </p>
      </section>

      <section className="prototype-grid" aria-label="Áreas del prototipo">
        {prototypeAreas.map((area) => (
          <article className="prototype-card" key={area.title}>
            <h2>{area.title}</h2>
            <p>{area.description}</p>
          </article>
        ))}
      </section>

      <p className="prototype-status">
        La estructura inicial está lista. Las experiencias interactivas se
        añadirán paso a paso.
      </p>
    </main>
  )
}
