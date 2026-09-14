const exchangeTypes = ["Kaufen", "Verkaufen", "Verschenken", "Suchen"];

export default function HomePage() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="/" aria-label="CampusMarkt Startseite">
          CampusMarkt
        </a>
        <span className="language-note" aria-label="Verfügbare Sprachen">
          DE · EN
        </span>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <p className="eyebrow">Lokal. Einfach. Für alle.</p>
        <h1 id="hero-title">Dein Marktplatz für Braunschweig</h1>
        <p className="lede">
          Gib nützlichen Dingen ein neues Zuhause und finde, was du in deiner
          Nähe brauchst.
        </p>
        <p className="promise">Buy. Sell. Give away. Find what you need.</p>

        <ul
          className="exchange-types"
          aria-label="Möglichkeiten auf CampusMarkt"
        >
          {exchangeTypes.map((exchangeType) => (
            <li key={exchangeType}>{exchangeType}</li>
          ))}
        </ul>
      </section>

      <footer>
        <p>Für die Hochschulcommunity und ganz Braunschweig.</p>
      </footer>
    </main>
  );
}
