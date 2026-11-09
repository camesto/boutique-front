# SÉLECTION — Projet CMS

Boutique React qui affiche les produits enregistrés dans Strapi.

## Prérequis

- Git, Node.js et npm
- L’archive `catalogue.tar` pour retrouver les produits et les images de la démo. Elle est à récupérer auprès de l’équipe.

## 1. Démarrer Strapi

Depuis la racine du dépôt, ouvre un premier terminal.

```bash
cd backend
npm ci
mkdir -p public/uploads
```

Pour le premier lancement, crée le fichier `.env` local à partir du modèle. La commande génère des clés aléatoires et conserve un éventuel `.env` déjà présent.

```bash
node -e 'const fs = require("node:fs"); const { randomBytes } = require("node:crypto"); const modele = fs.readFileSync(".env.example", "utf8"); const env = modele.replace(/remplacer(?:-cle-[12])?/g, () => randomBytes(32).toString("hex")); if (!fs.existsSync(".env")) fs.writeFileSync(".env", env, { flag: "wx", mode: 0o600 });'
```

Pour retrouver le catalogue de démo, place `catalogue.tar` dans `backend/`, puis lance l’import **sur une base locale vide**. L’import remplace les données de la base de destination.

```bash
npm run strapi import -- -f catalogue.tar
```

Démarre ensuite Strapi.

```bash
npm run develop
```

- Administration Strapi — http://localhost:1337/admin
- API des produits — http://localhost:1337/api/produits?populate=*

Si tu pars sans archive, crée et publie des produits dans Strapi. Si l’API répond `403`, vérifie que le rôle Public a la permission `find` sur les produits.

## 2. Démarrer React

Garde Strapi ouvert. Dans un deuxième terminal, repars de la racine du dépôt.

```bash
cd frontend
npm ci
npm run dev
```

Ouvre l’adresse `Local` affichée par Vite. React se connecte à Strapi sur `http://localhost:1337`.
