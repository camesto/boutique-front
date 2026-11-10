
import { useEffect, useRef, useState } from 'react'

const api = (import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337').replace(/\/$/, '')

export default function Auth({ onAuthChange }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState('')
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const dialog = useRef(null)
  const restoration = useRef(null)

  useEffect(() => {
    let active = true

    if (!restoration.current) {
      restoration.current = (async () => {
        const response = await fetch(`${api}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        })

        if (!response.ok) return null

        const data = await response.json()
        if (!data.jwt) return null

        const me = await fetch(`${api}/api/users/me`, {
          headers: { Authorization: `Bearer ${data.jwt}` },
          credentials: 'include',
        })

        if (!me.ok) return null

        return { user: await me.json(), token: data.jwt }
      })()
    }

    restoration.current
      .then((session) => {
        if (!active || !session) return
        setUser(session.user)
        setToken(session.token)
        onAuthChange?.(session)
      })
      .catch(() => {})

    return () => { active = false }
  }, [])

  function ouvrir() {
    setError('')
    setMessage('')
    dialog.current?.showModal()
  }

  async function envoyer(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')

    try {
      if (mode === 'register') {
        const response = await fetch(`${api}/api/auth/local/register`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.trim(),
            email: email.trim(),
            password,
          }),
        })

        const data = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(data?.error?.message || 'Inscription impossible.')
        }

        setMode('login')
        setMessage('Compte créé ! Tu peux maintenant te connecter.')
        setPassword('')
      } else {
        const response = await fetch(`${api}/api/auth/local`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: email.trim(),
            password,
          }),
        })

        const data = await response.json().catch(() => null)

        if (!response.ok || !data?.jwt) {
          throw new Error(data?.error?.message || 'Identifiants incorrects.')
        }

        setUser(data.user)
        setToken(data.jwt)
        onAuthChange?.({ user: data.user, token: data.jwt })
        setPassword('')
        dialog.current?.close()
      }
    } catch (err) {
      setError(err.message || 'Une erreur est survenue.')
    } finally {
      setBusy(false)
    }
  }

  async function deconnecter() {
    try {
      if (token) {
        await fetch(`${api}/api/auth/logout`, {
          method: 'POST',
          credentials: 'include',
          headers: { Authorization: `Bearer ${token}` },
        })
      }
    } finally {
      setUser(null)
      setToken('')
      onAuthChange?.(null)
    }
  }

  return (
    <>
      {user ? (
        <div className="auth-status">
          <span>{user.username || user.email}</span>
          <button className="bouton bouton-sombre" onClick={deconnecter}>
            Déconnexion
          </button>
        </div>
      ) : (
        <button className="bouton bouton-sombre" onClick={ouvrir}>
          Connexion
        </button>
      )}

      <dialog className="auth-dialog" ref={dialog}>
        <button
          className="fermer"
          type="button"
          aria-label="Fermer"
          onClick={() => dialog.current?.close()}
        >
          ×
        </button>

        <p className="surtitre">ESPACE CLIENT</p>
        <h2>{mode === 'login' ? 'Connexion' : 'Créer un compte'}</h2>

        <form className="auth-form" onSubmit={envoyer}>
          {mode === 'register' && (
            <>
              <label htmlFor="auth-username">Nom d'utilisateur</label>
              <input
                id="auth-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </>
          )}

          <label htmlFor="auth-email">Adresse e-mail</label>
          <input
            id="auth-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          <label htmlFor="auth-password">Mot de passe</label>
          <input
            id="auth-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={6}
            required
          />

          {error && <p className="erreur" role="alert">{error}</p>}
          {message && <p className="auth-message" role="status">{message}</p>}

          <button className="bouton bouton-acide" type="submit" disabled={busy}>
            {busy
              ? 'Patiente...'
              : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login' ? 'Pas encore de compte ?' : 'Déjà un compte ?'}
          {' '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login')
              setError('')
              setMessage('')
            }}
          >
            {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
          </button>
        </p>

        <p className="categorie">Tu peux aussi commander sans compte.</p>
      </dialog>
    </>
  )
}
