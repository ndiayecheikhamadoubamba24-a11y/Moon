# Moon — application mobile

React Native + Expo (SDK 58), Expo Router, TypeScript.

## Lancer l'app

```bash
npm install
EXPO_PUBLIC_API_URL=http://<ip-de-ton-ordinateur>:8000/api/v1 npx expo start
```

- Lance d'abord l'API Laravel (`cd ../backend && php artisan serve --host 0.0.0.0`).
- Sur l'émulateur Android, l'URL par défaut `http://10.0.2.2:8000/api/v1` pointe vers l'ordinateur.
- Compte de démonstration : `bamba@moon.test`, mot de passe `password`.

Certaines bibliothèques (cartes, biométrie, notifications) demandent un *development build* :

```bash
npx expo run:android
```

## Structure

```
src/
  app/            écrans (Expo Router)
    (auth)/       bienvenue, inscription, connexion, code OTP
    (tabs)/       Accueil, Calendrier, Apprendre, Jouer, Aide
    day/[date]    fiche du jour (feuille du bas)
    journal/      journal du jour
    game/[id]     quiz, mythe ou réalité, association
    centers/      carte et liste des centres, fiche, suggestion
    help/         demande d'aide, conversation, aide urgente
    onboarding    premier lancement
    profile       profil, confidentialité, rappels, données
  components/     composants d'interface (calendrier, anneau du cycle…)
  context/        authentification, cycle (hors ligne), verrouillage PIN
  lib/            API, calcul du cycle, dates, stockage, thème
```

## Hors ligne

- Le calendrier, les prévisions et le journal sont calculés et enregistrés **sur le téléphone** (`src/lib/cycle.ts`, même logique que le serveur).
- Les modifications sont mises en file d'attente puis envoyées à `POST /sync` dès que le réseau revient.
- Les réponses de l'API sont mises en cache. Les jeux se jouent hors ligne et les scores sont synchronisés plus tard.
- Les centres de la région peuvent être téléchargés pour une consultation sans réseau.

## Confidentialité

- Jeton de connexion et code PIN dans le trousseau chiffré (SecureStore).
- Verrouillage par code et biométrie, à l'ouverture et après une minute en arrière-plan.
- Notifications discrètes par défaut.
- Toutes les données locales sont effacées à la déconnexion.

## Avant la publication

- Clé Google Maps Android dans `app.json` (`REMPLACER_PAR_LA_CLE_GOOGLE_MAPS`).
- Projet EAS (`npx eas-cli@latest init`) pour les notifications push et les builds Play Store.

## Vérifications

```bash
npm run typecheck
```
