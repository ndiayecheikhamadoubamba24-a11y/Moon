# Moon — site vitrine et back-office

React 19 + Vite + TypeScript, Tailwind CSS 4, Recharts, React Router.

## Deux parties dans une même application

| Adresse | Contenu | Accès |
|---|---|---|
| `/` | Site vitrine : présentation de l'app, fonctionnalités, publications, FAQ, liens Google Play et App Store | public |
| `/publications`, `/publications/:slug` | Actualités, événements, campagnes, conseils (rédigés dans le back-office) | public |
| `/telecharger` | Lien unique pour affiches et QR codes : Android → Google Play, iPhone → App Store | public |
| `/confidentialite` | Politique de confidentialité (à valider par un juriste) | public |
| `/connexion` | Redirige vers `/admin` | public |
| `/admin/…` | Back-office de l'équipe (connexion obligatoire) | équipe |

En production, le serveur web doit renvoyer `index.html` pour toutes les adresses (application monopage).

Les liens des stores se règlent dans `.env` (`VITE_PLAY_STORE_URL`, `VITE_APP_STORE_URL`) : tant qu'ils sont vides, les boutons affichent « Bientôt sur… ».

## Lancer

```bash
npm install
cp .env.example .env      # VITE_API_URL=http://localhost:8000/api/v1
npm run dev               # site : http://localhost:5173 · back-office : http://localhost:5173/admin
```

L'API Laravel doit tourner (`cd ../backend && php artisan serve`).
Compte de démonstration : `admin@moon.test`, mot de passe `password`. Les autres rôles sont listés dans le README racine.

## Pages et rôles

| Page | Rôles |
|---|---|
| Tableau de bord | toute l'équipe |
| Modules (liste, éditeur, relecture, publication programmée, statistiques, catégories) | éducatrice |
| Jeux et défis (banque de questions, éditeurs quiz / mythe ou réalité / association, statistiques, import CSV, défis, badges) | éducatrice |
| Conseils et FAQ | éducatrice |
| Demandes d'aide (file, assignation, réponses, notes internes, publication en FAQ) | accompagnement |
| Centres et contacts (liste, vérification, éditeur en 4 étapes, import et export CSV, contacts d'urgence, couverture) | accompagnement |
| Signalements | modération |
| Utilisateurs (références anonymes, suspension, réactivation, accès, suppression, statistiques) | modération |
| Publications du site (actualités, événements, campagnes, conseils ; brouillon, publication, programmation, à la une) | éducatrice, accompagnement |
| Annonces (notifications push ciblées) | éducatrice, accompagnement |
| Administration (équipe, journal d'audit) | super administrateur |

Le super administrateur a accès à tout. Le menu n'affiche que les pages autorisées, et l'API vérifie aussi chaque rôle.

## Confidentialité

- La liste des comptes n'affiche jamais l'e-mail, le téléphone ni les données de santé.
- Les demandes anonymes masquent l'identité.
- Le jeton de connexion est gardé en `sessionStorage` : il est effacé à la fermeture de l'onglet.

## Vérifications

```bash
npm run build
npm run lint
```
