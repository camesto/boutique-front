# SÉLECTION — Projet CMS

Boutique en ligne développée avec React et Strapi. Les produits sont enregistrés dans Strapi et affichés sur le site React grâce à l'API REST.

## Prérequis

- Git
- Node.js et npm
- L'archive `backend/catalogue.tar`, incluse dans ce dépôt GitHub pour récupérer les données et les images de démonstration.

## 1. Démarrer Strapi

Depuis la racine du dépôt, ouvre un premier terminal.

```bash
cd backend
npm ci
mkdir -p public/uploads
```

### Configuration de l'environnement

Pour le premier lancement, crée le fichier `.env` local à partir du modèle `.env.example`.

La commande génère des clés aléatoires et conserve un éventuel `.env` déjà présent.

```bash
node -e 'const fs = require("node:fs"); const { randomBytes } = require("node:crypto"); const modele = fs.readFileSync(".env.example", "utf8"); const env = modele.replace(/remplacer(?:-cle-[12])?/g, () => randomBytes(32).toString("hex")); if (!fs.existsSync(".env")) fs.writeFileSync(".env", env, { flag: "wx", mode: 0o600 });'
```

### Importer les données de démonstration

L'archive `catalogue.tar` se trouve déjà dans le dossier `backend/`.

Sur une base de données locale vide, lance l'import :

```bash
npm run strapi import -- -f catalogue.tar
```

**Attention :** l'import remplace les données présentes dans la base de destination. Ne le lance pas sur une base contenant des données à conserver.

### Lancer Strapi

```bash
npm run develop
```

- **Administration Strapi :** http://localhost:1337/admin
- **API des produits :** http://localhost:1337/api/produits?populate=*

Si l'API répond `403`, vérifie que le rôle Public possède la permission `find` sur les produits dans les paramètres des permissions Strapi.

## 2. Démarrer React

Garde Strapi ouvert. Dans un deuxième terminal, repars de la racine du dépôt.

```bash
cd frontend
npm ci
npm run dev
```

Ouvre l'adresse `Local` affichée par Vite.

React se connecte à Strapi sur :

```text
http://localhost:1337
```

## 3. Accès au projet

- **Site React :** adresse locale affichée par Vite.
- **Administration Strapi :** http://localhost:1337/admin
- **API REST :** http://localhost:1337/api/produits?populate=*