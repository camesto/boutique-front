import { useEffect, useRef, useState } from 'react'
import './App.css'

const api = (import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337').replace(/\/$/, '')
const format = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
const euros = (centimes) => format.format(centimes / 100)
const stock = (produit) => Math.max(0, Number(produit.stock) || 0)
const prix = (produit) => Math.round(Number(produit.prix) * 100)
const clePanier = 'boutique-panier'

function lirePanier() {
  try {
    const lignes = JSON.parse(localStorage.getItem(clePanier))
    if (!Array.isArray(lignes)) return {}
    return Object.fromEntries(lignes
      .filter((ligne) => typeof ligne?.documentId === 'string' && Number.isInteger(ligne.quantite) && ligne.quantite > 0)
      .map(({ documentId, quantite }) => [documentId, quantite]))
  } catch {
    return {}
  }
}

function Photo({ produit, ...props }) {
  const url = produit.image?.formats?.small?.url || produit.image?.url
  return url
    ? <img src={new URL(url, api).href} alt={produit.image.alternativeText || produit.nom} {...props} />
    : <span className="photo-vide">Photo indisponible</span>
}

export default function App() {
  const [produits, setProduits] = useState(null)
  const [erreur, setErreur] = useState('')
  const [essai, setEssai] = useState(0)
  const [categorie, setCategorie] = useState('')
  const [recherche, setRecherche] = useState('')
  const [quantites, setQuantites] = useState(lirePanier)
  const [produitActif, setProduitActif] = useState(null)
  const [email, setEmail] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [erreurCommande, setErreurCommande] = useState('')
  const [commande, setCommande] = useState(null)
  const [annonce, setAnnonce] = useState('')
  const fiche = useRef(null)
  const panier = useRef(null)
  const verrou = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    async function charger() {
      try {
        const resultat = []
        let page = 1
        let pages = 1
        do {
          const reponse = await fetch(
            `${api}/api/produits?populate=*&sort=id:asc&pagination[page]=${page}`,
            { signal: controller.signal }
          )
          if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`)
          const json = await reponse.json()
          if (!Array.isArray(json.data)) throw new Error('Réponse inattendue')
          resultat.push(...json.data)
          pages = json.meta?.pagination?.pageCount ?? 1
          page += 1
        } while (page <= pages)
        setProduits(resultat)
      } catch (error) {
        if (!controller.signal.aborted) setErreur(`Catalogue indisponible. ${error.message}`)
      }
    }
    charger()
    return () => controller.abort()
  }, [essai])

  useEffect(() => {
    try {
      localStorage.setItem(clePanier, JSON.stringify(
        Object.entries(quantites).map(([documentId, quantite]) => ({ documentId, quantite }))
      ))
    } catch {
      // Le panier reste utilisable en mémoire si le stockage est indisponible.
    }
  }, [quantites])

  const catalogue = produits ?? []
  const vedette = catalogue.find((p) => p.featured && p.image?.url)
  const categories = [...new Map(catalogue.filter((p) => p.categorie?.slug)
    .map((p) => [p.categorie.slug, p.categorie.nom]))]
  const visibles = catalogue.filter((p) =>
    (!categorie || p.categorie?.slug === categorie)
    && p.nom.toLocaleLowerCase('fr').includes(recherche.trim().toLocaleLowerCase('fr'))
  )
  const lignes = catalogue
    .map((produit) => ({ produit, quantite: Math.min(quantites[produit.documentId] ?? 0, stock(produit)) }))
    .filter(({ quantite }) => quantite > 0)
  const nombre = lignes.reduce((somme, ligne) => somme + ligne.quantite, 0)
  const total = lignes.reduce((somme, { produit, quantite }) => somme + prix(produit) * quantite, 0)

  function modifier(produit, delta) {
    if (verrou.current) return
    const id = produit.documentId
    setQuantites((avant) => {
      const valeur = Math.min(stock(produit), avant[id] ?? 0)
      const suivant = Math.max(0, Math.min(stock(produit), valeur + delta))
      const copie = { ...avant }
      if (suivant) copie[id] = suivant
      else delete copie[id]
      return copie
    })
    if (delta > 0) setAnnonce(`${produit.nom} ajouté au panier.`)
  }

  useEffect(() => {
    if (produitActif && !fiche.current.open) fiche.current.showModal()
  }, [produitActif])

  async function commander(event) {
    event.preventDefault()
    if (verrou.current || lignes.length === 0) return
    verrou.current = true
    setEnvoi(true)
    setErreurCommande('')
    setCommande(null)

    try {
      const numero = `CMD-${crypto.randomUUID()}`
      const reponse = await fetch(`${api}/api/commandes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            numero,
            total: total / 100,
            statut: 'en-attente',
            email: email.trim(),
            contenu: lignes.map(({ produit, quantite }) => ({
              documentId: produit.documentId,
              nom: produit.nom,
              prix: prix(produit) / 100,
              quantite,
            })),
          },
        }),
      })
      const resultat = await reponse.json().catch(() => null)
      if (!reponse.ok) throw new Error(resultat?.error?.message || `HTTP ${reponse.status}`)
      setQuantites({})
      setEmail('')
      setCommande({ numero, total })
    } catch (error) {
      setErreurCommande(`La commande n’a pas pu être confirmée. ${error.message}`)
    } finally {
      verrou.current = false
      setEnvoi(false)
    }
  }

  return (
    <>
      <header className="barre">
        <div className="cadre navigation">
          <a className="marque" href="#"><span aria-hidden="true">◈</span> SÉLECTION<span className="point">.</span></a>
          <a className="lien-catalogue" href="#catalogue">Catalogue</a>
          <button className="bouton bouton-sombre" onClick={() => panier.current.showModal()}>
            Panier <span className="compteur">{nombre}</span>
          </button>
        </div>
      </header>

      <main className="cadre">
        <section className="hero">
          <div className="hero-texte">
            <p className="surtitre">LA BOUTIQUE DU QUOTIDIEN</p>
            <h1>Les essentiels<br />bien choisis<span className="point">.</span></h1>
            <p>Chaussures, vêtements et audio. Une sélection simple pour bouger, s’habiller et écouter.</p>
            <a className="bouton bouton-acide" href="#catalogue">Explorer le catalogue <span aria-hidden="true">↘</span></a>
          </div>
          <div className="hero-visuel">
            {vedette && <Photo produit={vedette} />}
            <span className="edition">{vedette?.nom ?? 'Sélection du moment'}</span>
          </div>
        </section>

        <section id="catalogue" className="catalogue">
          <p className="surtitre">LA COLLECTION</p>
          <div className="titre-section">
            <h2>Tous les produits</h2>
            <input type="search" aria-label="Rechercher un produit" placeholder="Rechercher un produit"
              value={recherche} onChange={(event) => setRecherche(event.target.value)} />
          </div>
          <div className="filtres" aria-label="Catégories">
            {[['', 'Tout'], ...categories].map(([slug, nom]) => (
              <button key={slug} aria-pressed={categorie === slug} onClick={() => setCategorie(slug)}>{nom}</button>
            ))}
          </div>
          {erreur && <div role="alert" className="message">
            <p>{erreur}</p>
            <button className="bouton bouton-sombre" onClick={() => { setErreur(''); setEssai(essai + 1) }}>Réessayer</button>
          </div>}
          {!produits && !erreur && <p role="status" className="message">Chargement du catalogue…</p>}
          {produits && visibles.length === 0 && <p className="message">Aucun produit trouvé.</p>}
          <div className="grille">
            {visibles.map((produit) => (
              <article className="carte" key={produit.documentId}>
                <button className="carte-photo" aria-label={`Voir ${produit.nom}`} onClick={() => setProduitActif(produit)}>
                  <Photo produit={produit} loading="lazy" />
                  {produit.featured && <span className="badge">À la une</span>}
                </button>
                <div className="carte-info">
                  <p className="categorie">{produit.categorie?.nom || 'Collection'}</p>
                  <h3><button onClick={() => setProduitActif(produit)}>{produit.nom}</button></h3>
                  <div className="carte-bas">
                    <strong>{euros(prix(produit))}</strong>
                    <button className="ajout" aria-label={`Ajouter ${produit.nom} au panier`}
                      disabled={envoi || (quantites[produit.documentId] ?? 0) >= stock(produit)}
                      onClick={() => modifier(produit, 1)}>+</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="cadre pied"><strong>SÉLECTION.</strong><span>Chaussures · vêtements · audio</span></footer>
      <p className="sr-only" role="status">{annonce} {nombre} article(s) au panier.</p>

      <dialog className="fiche" ref={fiche} onClose={() => setProduitActif(null)} aria-labelledby="titre-fiche">
        {produitActif && <>
          <button className="fermer" aria-label="Fermer la fiche" onClick={() => fiche.current.close()}>×</button>
          <div className="fiche-photo"><Photo produit={produitActif} /></div>
          <div className="fiche-info">
            <p className="surtitre">{produitActif.categorie?.nom || 'Collection'}</p>
            <h2 id="titre-fiche">{produitActif.nom}</h2>
            <p className="prix-fiche">{euros(prix(produitActif))}</p>
            <p>{produitActif.description}</p>
            <p>{stock(produitActif) ? `${stock(produitActif)} en stock` : 'Rupture de stock'}</p>
            <button className="bouton bouton-acide"
              disabled={envoi || (quantites[produitActif.documentId] ?? 0) >= stock(produitActif)}
              onClick={() => modifier(produitActif, 1)}>Ajouter au panier</button>
            <p className="categorie">Dans le panier · {lignes.find(({ produit }) => produit.documentId === produitActif.documentId)?.quantite ?? 0}</p>
          </div>
        </>}
      </dialog>

      <dialog className="tiroir" ref={panier} aria-labelledby="titre-panier">
        <div className="tiroir-entete">
          <p className="surtitre">TA SÉLECTION</p>
          <h2 id="titre-panier">Ton panier <span className="point">({nombre})</span></h2>
          <button className="fermer" aria-label="Fermer le panier" onClick={() => panier.current.close()}>×</button>
        </div>
        {commande && <div className="confirmation" role="status">
          <strong>Commande enregistrée</strong>
          <p>{commande.numero}</p>
          <p>{euros(commande.total)} · En attente</p>
        </div>}
        {nombre === 0 ? <p>{produits ? 'Ton panier est vide.' : 'Le panier sera disponible après le chargement du catalogue.'}</p> : <>
          <ul className="lignes">
            {lignes.map(({ produit, quantite }) => (
              <li key={produit.documentId}>
                <div className="miniature"><Photo produit={produit} /></div>
                <div>
                  <strong>{produit.nom}</strong>
                  <div className="quantite">
                    <button aria-label={`Retirer une unité de ${produit.nom}`} disabled={envoi} onClick={() => modifier(produit, -1)}>−</button>
                    <span>{quantite}</span>
                    <button aria-label={`Ajouter une unité de ${produit.nom}`} disabled={envoi || quantite >= stock(produit)} onClick={() => modifier(produit, 1)}>+</button>
                  </div>
                </div>
                <strong>{euros(prix(produit) * quantite)}</strong>
              </li>
            ))}
          </ul>
          <form className="commande" onSubmit={commander}>
            <div className="total"><strong>Total</strong><strong>{euros(total)}</strong></div>
            <label htmlFor="email">Adresse e-mail</label>
            <input id="email" type="email" autoComplete="email" placeholder="toi@exemple.fr"
              value={email} onChange={(event) => setEmail(event.target.value)} required disabled={envoi} />
            {erreurCommande && <p className="erreur" role="alert">{erreurCommande}</p>}
            <button className="bouton bouton-acide" type="submit" disabled={envoi}>
              {envoi ? 'Enregistrement…' : 'Commander'}
            </button>
            <p className="categorie">Commande de démonstration · Aucun débit</p>
          </form>
        </>}
      </dialog>
    </>
  )
}
