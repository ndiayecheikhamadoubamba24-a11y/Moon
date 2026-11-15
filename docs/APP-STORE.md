# Publier Moon sur l'App Store (iPhone)

Ce guide publie l'application mobile Moon sur l'App Store d'Apple. L'application est construite et envoyée par **Expo (EAS)** : **pas besoin de Mac**.

> Avant de commencer, l'API doit être en ligne (voir `docs/HEBERGEMENT.md`) : Apple teste l'application pour de vrai, avec le serveur de production.

---

## 1. Ce qu'il faut

| Quoi | Où | Coût / délai |
|---|---|---|
| **Compte Apple Developer Program** | developer.apple.com/programs | 99 $ US par an |
| **Numéro D-U-N-S** de la structure (si le compte est au nom d'une organisation) | Demande gratuite via Apple (developer.apple.com/support/D-U-N-S) | Gratuit, compter 1 à 2 semaines |
| **Compte Expo** | Déjà créé : propriétaire `codefire221` | Gratuit pour commencer |
| **API en ligne** sur votre domaine (`https://moon.sn`) | Voir `HEBERGEMENT.md` | — |

### Compte personnel ou compte d'organisation ?

Inscrivez le compte **au nom de l'organisation qui porte Moon** (association, ministère, UNFPA…), pas au nom d'une personne :

- le nom affiché sous l'app dans l'App Store sera celui de l'organisation, ce qui inspire confiance pour une app de santé destinée à des jeunes ;
- Apple attend souvent qu'une app qui traite des **données de santé** soit publiée par une organisation, pas par un particulier ;
- le compte ne dépend pas d'une seule personne.

Il faut alors le numéro D-U-N-S et une personne habilitée à engager l'organisation. Les ministères et ONG peuvent demander une **exonération des frais** (Apple Developer Program → *fee waiver*, réservée aux organismes publics et à but non lucratif reconnus).

---

## 2. Ce qui est déjà prêt dans le code

| Point vérifié par Apple | État |
|---|---|
| Identifiant de l'app (`bundleIdentifier`) | `org.moon.app` (`mobile/app.json`) |
| Icône 1024 × 1024 sans transparence | `mobile/assets/icon.png` ✓ |
| Explication de l'usage de la position et de Face ID | Textes en français dans `app.json` ✓ |
| Chiffrement : seulement HTTPS standard | `usesNonExemptEncryption: false` : pas de question à chaque envoi ✓ |
| Suppression du compte depuis l'app (obligatoire) | Profil → Mes données → Supprimer mon compte ✓ |
| Politique de confidentialité en ligne | `https://moon.sn/confidentialite` ✓ (mentionne Fatou) |
| Assistante IA (Fatou) : information et accord avant usage | Écran « Avant de discuter avec Fatou » ✓ |
| La position n'est pas envoyée au serveur | Filtrage des centres sur le téléphone ✓ |
| Captures d'écran 6,7 pouces (1290 × 2796) | `docs/app-store/captures-6.7/` ✓ |

**À vérifier avant de construire** : dans `mobile/eas.json`, profil `production`, remplacez `moon.sn` par votre vrai domaine si ce n'est pas celui-là.

---

## 3. Créer l'application dans App Store Connect

Sur **appstoreconnect.apple.com** → *Apps* → **+** → *Nouvelle app* :

| Champ | Valeur |
|---|---|
| Plateformes | iOS |
| Nom | `Moon – Ton cycle sans tabou` (30 caractères max, unique dans l'App Store ; si le nom est pris, essayez `Moon Sénégal – cycle & santé`) |
| Langue principale | Français |
| Identifiant de lot (Bundle ID) | `org.moon.app` (s'il n'apparaît pas dans la liste, laissez EAS le créer à l'étape 4 puis revenez) |
| SKU | `moon-ios` (référence interne, libre) |
| Accès utilisateur | Accès complet |

---

## 4. Construire et envoyer l'application

Sur votre ordinateur (Windows, Mac ou Linux), dans le dossier `mobile/` :

**1. Se connecter à Expo**

```bash
npx eas-cli@latest login
```

**2. Construire la version iPhone** (EAS demande l'identifiant Apple et crée lui-même les certificats : répondez « oui » quand il propose de les générer)

```bash
npx eas-cli@latest build -p ios --profile production
```

La construction se fait sur les serveurs d'Expo (15 à 30 minutes).

**3. Envoyer la construction à App Store Connect**

```bash
npx eas-cli@latest submit -p ios --latest
```

Choisissez l'app « Moon » créée à l'étape 3. Après 10 à 30 minutes de traitement par Apple, la construction apparaît dans App Store Connect → onglet **TestFlight**.

**4. Tester avec TestFlight (fortement conseillé).** Dans TestFlight, ajoutez des testeuses et testeurs internes (membres de l'équipe) : ils installent l'app *TestFlight* sur leur iPhone et reçoivent Moon. Testez l'inscription, le calendrier, les jeux, la carte, Fatou et la suppression de compte **avec le vrai serveur**.

---

## 5. Remplir la fiche de l'App Store

App Store Connect → Moon → *Distribution* → version 1.0.

### Textes (à copier-coller)

**Sous-titre** (30 caractères max)
```
Cycle, hygiène et santé intime
```

**Texte promotionnel** (170 caractères max, modifiable sans nouvelle version)
```
Suis ton cycle, apprends en jouant et trouve un centre de santé près de chez toi. Gratuit, confidentiel et pensé pour les jeunes du Sénégal.
```

**Description**
```
Moon t'accompagne pour comprendre ton corps et vivre tes règles sans tabou.

SUIS TON CYCLE
• Calendrier simple : règles, période fertile et prochaines règles estimées
• Journal du jour : humeur, flux, symptômes, notes personnelles
• Rappels discrets : prochaines règles, changement de protection, boire de l'eau

APPRENDS EN JOUANT
• Modules courts : cycle, hygiène menstruelle, protections, mythes et réalités
• Quiz et défis, points et badges à gagner
• Des réponses claires aux questions que tu te poses

TROUVE DE L'AIDE
• Pose tes questions à l'équipe Moon, en toute confidentialité
• Fatou, l'assistante virtuelle, répond à tes questions à tout moment
• Carte des centres de santé et d'écoute près de chez toi, avec leurs horaires
• Numéros d'urgence à portée de main

TES DONNÉES T'APPARTIENNENT
• Un pseudo suffit : pas besoin de ton vrai nom
• Code ou Face ID pour protéger l'app
• Fonctionne même sans connexion internet
• Tu peux exporter ou supprimer tes données à tout moment
• Aucune publicité, aucune revente de données

Moon est une initiative soutenue par le Ministère de la Jeunesse et des Sports, l'UNFPA et la DPSJ.

Moon informe et ne remplace pas l'avis d'un professionnel de santé.
```

**Mots-clés** (100 caractères max, séparés par des virgules, sans espace)
```
règles,cycle,menstruation,calendrier,hygiène,puberté,santé,jeunes,Sénégal,filles,quiz,ovulation
```

**URL d'assistance** : `https://moon.sn`
**URL marketing** : `https://moon.sn`
**URL de politique de confidentialité** : `https://moon.sn/confidentialite`
**Copyright** : `2026 <nom de l'organisation>`

### Catégories

- Principale : **Santé et forme**
- Secondaire : **Éducation**

### Captures d'écran

Envoyez les 10 images de `docs/app-store/captures-6.7/` dans l'emplacement **iPhone 6,9 pouces / 6,7 pouces** (1290 × 2796). Apple réutilise automatiquement ces images pour les plus petits iPhone. Ordre conseillé :

1. `01-accueil` 2. `02-calendrier` 3. `05-jeu` 4. `04-apprendre` 5. `07-centres` 6. `06-aide` 7. `03-fiche-du-jour` 8. `09-fatou-accord` 9. `08-confidentialite` 10. `00-bienvenue-hors-connexion`

> Ces captures ont été faites avec des données de démonstration (centres marqués « exemple »). Pour la fiche définitive, refaites-les idéalement sur un iPhone avec l'app TestFlight et les vrais centres : bouton latéral + volume haut sur un iPhone 15 Plus, 15 Pro Max ou plus récent donne directement la bonne taille.

L'app est réservée à l'iPhone (`supportsTablet: false`) : aucune capture iPad n'est demandée.

---

## 6. Confidentialité de l'app (« étiquettes nutritionnelles »)

App Store Connect → *Confidentialité de l'app* → *Commencer*. Réponses correspondant à ce que fait Moon :

**Collectez-vous des données ?** Oui.

| Type de données (Apple) | Ce que c'est dans Moon | Lié à l'identité | Pistage |
|---|---|---|---|
| Santé et forme → **Santé** | Dates des règles, journal (humeur, flux, symptômes, notes) | Oui | Non |
| Coordonnées → **Adresse e-mail** | Si l'inscription se fait par e-mail | Oui | Non |
| Coordonnées → **Numéro de téléphone** | Si l'inscription se fait par téléphone | Oui | Non |
| Coordonnées → **Nom** | Le pseudo choisi | Oui | Non |
| Contenu utilisateur → **Autre contenu utilisateur** | Questions à l'équipe, messages à Fatou | Oui | Non |
| Identifiants → **Identifiant utilisateur** | Numéro de compte interne | Oui | Non |
| Utilisation → **Interactions avec le produit** | Modules lus, scores des quiz, badges | Oui | Non |
| Identifiants → **Identifiant d'appareil** | Jeton des notifications push | Oui | Non |

Pour chaque type, finalité : **Fonctionnalités de l'app** uniquement (pas de publicité, pas d'analytique tierce).

**Pistage (tracking)** : **Non** pour tout. Moon ne suit pas les utilisatrices dans d'autres apps et n'a aucune publicité ; l'app n'affiche donc pas la demande « Autoriser le suivi ».

**Position** : ne la déclarez pas : elle sert uniquement sur le téléphone à trier les centres et n'est jamais envoyée au serveur.

> Les messages envoyés à Fatou passent par un service d'IA externe (Groq, ou Google Gemini en secours). Ils sont bien « collectés » au sens d'Apple (ils quittent le téléphone) : c'est pour cela que « Autre contenu utilisateur » est déclaré. L'app l'explique et demande l'accord avant la première discussion.

---

## 7. Classification par âge

App Store Connect → *Informations sur l'app* → *Classification par âge*. Répondez honnêtement au questionnaire ; repères pour Moon :

| Question | Réponse |
|---|---|
| Informations médicales ou sur les traitements | **Oui, peu fréquent / léger** (informations éducatives sur le cycle, pas de diagnostic) |
| Contenu sexuel ou nudité | **Aucun** (illustrations éducatives non explicites) |
| Contenu généré par les utilisateurs / communication entre utilisateurs | **Non** : les questions ne sont lues que par l'équipe, rien n'est publié entre utilisatrices |
| Navigateur web non restreint | Non |
| Fonctionnalité d'IA / chatbot | **Oui** si la question est posée (Fatou) |
| Jeux d'argent, violence, alcool, drogues | Aucun |

Ne cochez **pas** la catégorie « Enfants » (Kids) : elle impose des règles strictes (aucun lien externe, aucun service tiers) incompatibles avec Fatou et les liens vers les cartes et le téléphone.

---

## 8. Informations pour la vérification d'Apple (App Review)

Apple doit pouvoir se connecter. **Créez un compte de test dans la production** : depuis l'app (TestFlight), inscrivez-vous par e-mail, par exemple :

- E-mail : `revue.apple@moon.sn` (une adresse que vous contrôlez)
- Mot de passe : un mot de passe long, uniquement pour ce compte
- Tranche d'âge : 18-24 ans ; saisissez quelques dates de règles pour que le calendrier soit rempli

Dans *Informations pour la vérification de l'app* :

- **Connexion requise** : cochée, avec l'e-mail et le mot de passe ci-dessus.
- **Coordonnées** : nom, téléphone et e-mail d'une personne de l'équipe joignable pendant la vérification.
- **Notes** (à copier, en anglais car lues par l'équipe d'Apple) :

```
Moon is a free menstrual health education app for young people in Senegal, supported by the Senegalese Ministry of Youth and Sports, UNFPA and DPSJ. The interface is in French.

Test account: use the e-mail and password above ("J'ai déjà un compte" > "E-mail").

Main features: cycle calendar (Calendrier), daily journal (tap a day), learning modules (Apprendre), quizzes (Jouer), confidential questions to the Moon team and a map of health centres (Aide).

"Fatou" (pink button) is an AI assistant. Before the first use, the app explains that messages are sent to an external AI provider (Groq or Google Gemini) and asks for consent. Fatou gives general educational information only and redirects to health professionals and emergency numbers.

Health information is educational; the app never provides a diagnosis. Location is used only on the device to sort nearby centres and is never sent to our server. Account deletion: Profil > Mes données > Supprimer mon compte.
```

---

## 9. Envoyer en vérification

1. Dans la version 1.0, section *Build*, sélectionnez la construction envoyée à l'étape 4.
2. *Tarification et disponibilité* : **Gratuit** ; pays : **Sénégal** (et d'autres pays si vous le souhaitez).
3. *Ajouter pour vérification* → *Soumettre*.

La vérification prend en général 1 à 3 jours. En cas de refus, Apple explique la règle en cause dans *Centre de résolution* : corrigez, renvoyez une construction (étape 4) ou répondez simplement si c'est une question.

---

## 10. Après la publication

**Activer le bouton App Store du site.** Récupérez le lien de l'app (App Store Connect → *Informations sur l'app* → *Afficher dans l'App Store*, de la forme `https://apps.apple.com/app/id1234567890`), mettez-le dans `deploy/.env` :

```
APP_STORE_URL=https://apps.apple.com/app/id1234567890
```

puis reconstruisez le site sur le serveur :

```bash
docker compose up -d --build web
```

Le lien `https://moon.sn/telecharger` (affiches, QR codes) ouvre alors l'App Store sur iPhone et Google Play sur Android.

**Nouvelles versions.** Augmentez `version` dans `mobile/app.json` (par exemple `1.0.1`), puis reprenez l'étape 4 (`build` puis `submit`) et créez une nouvelle version dans App Store Connect. Le numéro de construction s'incrémente tout seul (`autoIncrement`).

---

## Motifs de refus fréquents à éviter

| Règle Apple | Comment Moon y répond |
|---|---|
| 2.1 – App incomplète, serveur hors ligne | L'API doit être en ligne et le compte de test fonctionnel le jour de la vérification |
| 1.4.1 – Santé : informations médicales | Mention « ne remplace pas un professionnel » dans l'app et la description ; contenus validés par un professionnel de santé |
| 5.1.1(v) – Suppression de compte | Disponible dans le profil |
| 5.1.2 – Données envoyées à une IA tierce | Écran d'information et d'accord avant Fatou, politique de confidentialité à jour |
| 4.2 – Fonctionnalités minimales | Calendrier, journal, modules, jeux, aide, carte : app complète |
| 5.2 – Droits sur les logos | Gardez l'autorisation écrite d'utiliser les logos MJS, UNFPA et DPSJ : Apple peut la demander |
