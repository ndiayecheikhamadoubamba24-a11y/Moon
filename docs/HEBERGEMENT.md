# Héberger Moon

Ce guide met en ligne **le site vitrine, le back-office et l'API** sur un seul serveur, puis publie **l'application mobile** sur Google Play. Pour l'iPhone, voir `docs/APP-STORE.md`.

```
                         https://moon.sn
Téléphones (app Moon) ─┐        │
Navigateurs ───────────┼──► Caddy (HTTPS automatique)
                       │     ├── /            site vitrine
                       │     ├── /admin       back-office
                       │     └── /api/...  ─► API Laravel ─► PostgreSQL
                       │                       └─ tâches planifiées (rappels, annonces)
                       │                                └─ sauvegarde chaque nuit
Google Play ◄── build EAS de l'app mobile
```

Tout est décrit dans `deploy/docker-compose.yml` : une seule commande démarre l'ensemble.

> Dans ce guide, `moon.sn` est un exemple : remplace-le partout par votre vrai domaine.

---

## 1. Ce qu'il faut avant de commencer

| Quoi | Pourquoi | Ordre de grandeur |
|---|---|---|
| **Un nom de domaine** (ex. `moon.sn`) | L'adresse du site, du back-office et de l'API | `.sn` : auprès d'un bureau d'enregistrement agréé par le NIC Sénégal ; `.org`/`.com` : quelques milliers de FCFA par an |
| **Un serveur (VPS)** Ubuntu 24.04 : 2 processeurs, 4 Go de mémoire, 40 Go de disque minimum | Faire tourner le site, l'API et la base de données | Environ 5 à 25 € par mois selon l'hébergeur |
| **Un compte Google Play Console** | Publier l'application Android | 25 $ US, une seule fois |
| **Un compte Expo** (déjà créé : propriétaire `codefire221`) | Construire l'application Android | Gratuit pour commencer |
| **Une clé Google Maps** (Android) | Afficher la carte des centres dans l'app | Gratuit dans la limite du quota mensuel |

Les prix sont indicatifs : vérifie-les auprès des fournisseurs.

### Où héberger ? Point important sur la loi

Moon traite des **données de santé**, souvent de **mineures**. Avec la loi sénégalaise sur les données personnelles :

- **Déclare le traitement à la CDP** (Commission de Protection des Données Personnelles) avant l'ouverture.
- **Si le serveur est à l'étranger**, les données quittent le Sénégal : c'est un transfert, qui demande l'accord de la CDP. Un hébergeur basé au Sénégal, ou un serveur d'un ministère partenaire, évite cette démarche.

Fais valider ce choix par la personne chargée du juridique avant de louer le serveur.

---

## 2. Préparer le domaine (DNS)

Chez le fournisseur du domaine, crée deux enregistrements qui pointent vers l'**adresse IP du serveur** :

| Type | Nom | Valeur |
|---|---|---|
| A | `moon.sn` (ou `@`) | adresse IP du serveur |
| A | `www` | adresse IP du serveur |

La propagation prend de quelques minutes à quelques heures.

---

## 3. Préparer le serveur

Connecte-toi au serveur (`ssh root@ADRESSE_IP`), puis :

**Mettre à jour le système et installer Docker**

```bash
apt update && apt upgrade -y
```

```bash
curl -fsSL https://get.docker.com | sh
```

**Ouvrir seulement les ports nécessaires** (SSH, HTTP, HTTPS)

```bash
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw enable
```

**Récupérer le code**

Le dépôt GitHub est privé : crée d'abord une *deploy key* (GitHub → dépôt → Settings → Deploy keys) ou un jeton d'accès en lecture seule.

```bash
git clone https://github.com/ndiayecheikhamadoubamba24-a11y/moon.git /opt/moon
```

```bash
cd /opt/moon/deploy
```

---

## 4. Configurer

```bash
cp .env.example .env
```

**Générer la clé de chiffrement** (une seule fois, puis ne plus jamais la changer) :

```bash
docker run --rm php:8.3-cli php -r "echo 'base64:'.base64_encode(random_bytes(32)).PHP_EOL;"
```

**Générer un mot de passe pour la base de données** :

```bash
openssl rand -base64 32
```

Ouvre ensuite le fichier (`nano .env`) et remplis au minimum :

| Variable | Exemple | Rôle |
|---|---|---|
| `SITE_DOMAIN` | `moon.sn` | Le domaine, sans `https://` |
| `ACME_EMAIL` | `tech@moon.sn` | Pour le certificat HTTPS |
| `APP_KEY` | `base64:…` (commande ci-dessus) | Chiffre les notes du journal |
| `DB_PASSWORD` | (commande ci-dessus) | Mot de passe de la base |
| `CONTACT_EMAIL` | `contact@moon.sn` | Affiché sur le site |
| `EXPO_ACCESS_TOKEN` | facultatif | Notifications push (expo.dev → Access tokens) |
| `GROQ_API_KEY`, `GEMINI_API_KEY` | facultatif | Chatbot Fatou (Groq en priorité, Gemini en secours) |
| `MAIL_*` | facultatif | Envoi d'e-mails |

> ⚠️ **Garde une copie de `APP_KEY` et `DB_PASSWORD` en lieu sûr, hors du serveur** (coffre-fort de mots de passe). Sans `APP_KEY`, les notes du journal des utilisatrices deviennent illisibles, même avec une sauvegarde.

---

## 5. Démarrer

```bash
docker compose up -d --build
```

La première fois, la construction prend quelques minutes. Au démarrage, l'API crée les tables de la base et Caddy obtient le certificat HTTPS.

**Charger les contenus de départ** (modules, conseils, quiz, badges) :

```bash
docker compose exec api php artisan db:seed --force
```

En production, cette commande n'ajoute **ni comptes de démonstration, ni centres d'exemple, ni publications d'exemple**.

**Créer le premier compte super administrateur** (le mot de passe est demandé) :

```bash
docker compose exec api php artisan moon:create-admin admin@moon.sn --name="Fatou Diallo"
```

**Vérifier**

| Adresse | Attendu |
|---|---|
| `https://moon.sn` | Le site vitrine |
| `https://moon.sn/admin` | La connexion de l'équipe |
| `https://moon.sn/up` | Une page « OK » (l'API fonctionne) |

Ensuite, dans le back-office :

1. Ajoute l'équipe (Administration → Équipe).
2. Ajoute les vrais centres et les numéros d'urgence (Centres et contacts).
3. Écris une première publication (Publications du site).

---

## 6. Publier l'application Android

Sur ton ordinateur, dans le dossier `mobile/` :

**1. Vérifier l'adresse de l'API.** Dans `mobile/eas.json`, les profils `preview` et `production` utilisent `https://moon.sn/api/v1`. Remplace `moon.sn` par votre domaine.

**2. Ajouter la clé Google Maps.** Dans `mobile/app.json`, remplace `REMPLACER_PAR_LA_CLE_GOOGLE_MAPS`.

**3. Construire une version de test** (fichier APK à installer sur des téléphones) :

```bash
npx eas-cli@latest build -p android --profile preview
```

**4. Construire la version Play Store** (fichier AAB) :

```bash
npx eas-cli@latest build -p android --profile production
```

**5. Dans Google Play Console** :

1. Crée l'application « Moon ».
2. Renseigne la fiche (textes, captures : celles du guide d'utilisation conviennent).
3. Indique la politique de confidentialité : `https://moon.sn/confidentialite`.
4. Remplis la *sécurité des données* :
   - données collectées : santé (cycle, journal), identifiants (pseudo, téléphone ou e-mail), activité dans l'app ;
   - chiffrées en transit, suppression possible depuis l'app ;
   - aucun partage, aucune publicité.
5. Remplis la *classification du contenu* et le *public cible*. L'app vise aussi des mineures : réponds avec soin, Google applique des règles « Familles ».
6. Envoie d'abord l'AAB en **test interne**, puis passe en **production**.

Pour envoyer directement le fichier depuis Expo :

```bash
npx eas-cli@latest submit -p android --latest
```

**6. Activer les boutons du site.** Une fois l'app publiée, mets son lien dans `deploy/.env` (`PLAY_STORE_URL=https://play.google.com/store/apps/details?id=org.moon.app`), puis reconstruis le site :

```bash
docker compose up -d --build web
```

Le lien `https://moon.sn/telecharger` (pour les affiches et les QR codes) ouvre alors directement Google Play sur Android.

---

## 7. Mettre à jour

À chaque nouvelle version du code :

```bash
cd /opt/moon && git pull
```

```bash
cd deploy && docker compose up -d --build
```

Les migrations de la base s'appliquent toutes seules au redémarrage de l'API.

---

## 8. Sauvegardes et restauration

- La base est sauvegardée **chaque nuit** dans `/opt/moon/deploy/backups/`. Les sauvegardes de plus de 14 jours sont effacées.
- **Copie régulièrement ce dossier hors du serveur** : si le serveur disparaît, ses sauvegardes disparaissent avec lui.

**Restaurer une sauvegarde** (remplace le contenu actuel de la base) :

```bash
docker compose exec -T db pg_restore -U moon -d moon --clean --if-exists < backups/moon-AAAA-MM-JJ_HHMM.dump
```

Testez une restauration au moins une fois, avant l'ouverture au public.

---

## 9. Surveiller

**État des services**

```bash
docker compose ps
```

**Journaux de l'API en direct**

```bash
docker compose logs -f api
```

Un service gratuit de surveillance (UptimeRobot, Better Stack…) peut vérifier `https://moon.sn/up` toutes les 5 minutes et prévenir par e-mail en cas de panne.

---

## 10. Avant d'ouvrir au public

- [ ] Traitement déclaré à la CDP (et, si le serveur est à l'étranger, transfert autorisé)
- [ ] Politique de confidentialité validée par un juriste
- [ ] Contenus santé (modules, conseils, quiz) validés par un professionnel de santé
- [ ] Vrais centres et numéros d'urgence saisis et vérifiés
- [ ] `APP_KEY` et `DB_PASSWORD` copiés en lieu sûr hors du serveur
- [ ] Une restauration de sauvegarde testée
- [ ] Autorisation écrite d'utiliser les logos MJS, DPSJ et UNFPA
- [ ] Application testée sur plusieurs téléphones Android (dont un d'entrée de gamme)
