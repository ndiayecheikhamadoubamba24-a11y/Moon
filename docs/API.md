# API Moon — v1

Base : `/api/v1`. Authentification : en-tête `Authorization: Bearer <token>` (Laravel Sanctum).
Toutes les réponses sont en JSON. Les erreurs de validation renvoient `422` avec `errors`.

## Authentification

| Méthode | Route | Corps | Notes |
|---|---|---|---|
| POST | `/auth/register` | `name, email+password` **ou** `phone`, `age_range`, `language?`, `consent`, `guardian_consent` (obligatoire si < 18 ans) | E-mail : renvoie `token`. Téléphone : envoie un OTP |
| POST | `/auth/login` | `email, password` | → `token, user` |
| POST | `/auth/otp/request` | `identifier` (e-mail ou téléphone) | Toujours `200` (pas d'énumération) |
| POST | `/auth/otp/verify` | `identifier, code` | → `token, user` |
| POST | `/auth/password/forgot` | `identifier` | Envoie un OTP de réinitialisation |
| POST | `/auth/password/reset` | `identifier, code, password, password_confirmation` | |
| POST | `/auth/logout` | | |

## Profil

| Méthode | Route | Notes |
|---|---|---|
| GET / PATCH | `/me` | `name, age_range, language, mode, avatar, region, cycle_length, period_length, leaderboard_opt_in, notification_settings{discreet,enabled}` |
| PUT | `/me/push-token` | `token` (Expo) |
| GET | `/me/export` | Export complet des données |
| DELETE | `/me` | Suppression définitive |

## Écrans → routes

### Accueil
`GET /home` renvoie en un seul appel : utilisatrice, résumé du cycle (jour, phase, prochaines règles), semaine en cours,
humeur du jour, 3 conseils du jour, « Continuer d'apprendre », défi du jour (mythe ou réalité) et défi de la semaine.

### Calendrier

| Méthode | Route | Notes |
|---|---|---|
| GET | `/cycle/summary` | `today{cycle_day, phase, is_period…}`, `next_period_date`, `days_until_next_period`, `next_ovulation_date`, `irregularities[]` |
| GET | `/cycle/calendar?month=2026-11` | Vue mois (semaines complètes, du lundi au dimanche) |
| GET | `/cycle/calendar?year=2026` | Vue année |
| GET | `/cycle/day/2026-11-09` | Fiche du jour : phase, `tip`, `log` |
| POST | `/cycle/period/start` | « Mes règles ont commencé » (`date?`) |
| POST | `/cycle/period/end` | « Mes règles sont terminées » (`date?`) |
| GET/POST | `/cycles` · PATCH/DELETE `/cycles/{id}` | « Corriger mes dates de règles » |

Chaque jour du calendrier contient : `cycle_day, phase (menstrual|follicular|ovulation|luteal), is_period,
is_predicted_period, is_fertile, is_ovulation, is_today, has_log, has_symptoms`.

### Journal

| Méthode | Route | Corps |
|---|---|---|
| GET | `/logs?from=&to=` | |
| GET / PUT / DELETE | `/logs/{date}` | `mood (great|good|neutral|sad|crying|angry)`, `flow`, `pain_level 0-10`, `symptoms[]`, `notes` |
| GET / PUT | `/reminders` · `/reminders/{type}` | `period_soon, change_protection, hydration, daily_log` → `enabled, time, interval_hours` |

### Hors ligne
`POST /sync` : `{ logs: [...], period_starts: [...], game_scores: [{game_id, client_uuid, played_at, answers}] }`.
Idempotent : on peut renvoyer le même lot sans créer de doublons.

### Apprendre
`GET /categories`, `GET /modules?category=&q=`, `GET /modules/{slug}`, `PUT /modules/{id}/progress {progress}`,
`GET /tips?phase=&topic=`, `GET /guides`, `GET /guides/{slug}`, `GET /faqs?q=&category=`.

### Jouer

| Méthode | Route | Notes |
|---|---|---|
| GET | `/games` | Points, série, 7 derniers jours, défi de la semaine, jeux, badges |
| GET | `/games/{id}` | Questions sans réponses (`?offline=1` les inclut pour jouer hors ligne) |
| POST | `/questions/{id}/check` | `answer` → `correct, expected, explanation` (« À retenir ») |
| POST | `/games/{id}/scores` | `answers[{question_id, answer}], client_uuid?, played_at?` → score, points, `is_record`, `new_badges`, défis |
| GET | `/badges` · `/leaderboard` · `/challenges/current` | Classement anonyme, sur inscription volontaire |

Format des réponses : quiz `"A"`, mythe ou réalité `"myth"` / `"fact"`, association `{"0":2,"1":0,"2":1}`
(indice à gauche → indice à droite).

### Aide « Je suis là pour toi »
`GET/POST /help-requests` (`type: information|support|protections|medical|question`, `message`, `is_anonymous`,
`faq_consent`, `urgent`), `GET /help-requests/{id}`, `POST /help-requests/{id}/messages`, `GET /emergency-contacts`.

### Carte des centres

| Méthode | Route | Notes |
|---|---|---|
| GET | `/resources` | `lat, lng, radius` (km), `types[]`, `services[]`, `open_now`, `free`, `accessible`, `language`, `q`, `bounds{north,south,east,west}`, `sort` → `distance_km`, `walking_minutes`, `opening{open, closes_at / opens_at}` |
| GET | `/resources/{id}` | Fiche du centre |
| GET | `/resources/places?q=` | Suggestions de quartiers et villes |
| GET | `/resources/offline?region=` | Paquet à télécharger pour le mode hors ligne |
| GET | `/resources/saved` · POST/DELETE `/resources/{id}/save` | Enregistrer un centre |
| POST | `/resource-suggestions` | « Proposer un centre » / « Signaler une erreur » |
| POST | `/reports` | `type (module|faq|help_message|resource), id, reason` |

## Back-office (`/admin`)

| Rôle | Accès |
|---|---|
| Tous les membres de l'équipe | `GET /admin/dashboard` |
| Éducateur | `modules` (+ `POST modules/{id}/status`), `categories`, `tips`, `guides`, `faqs`, `games`, `questions`, `challenges`, `badges`, `announcements` |
| Modérateur | `users` (suspend, activate, reset-access, delete), `reports` |
| Responsable d'accompagnement | `help-requests` (PATCH priorité/statut/assignation, `messages` avec `is_internal`, `faq`), `resources`, `resource-suggestions`, `announcements` |
| Super administrateur | Tout, plus `POST /admin/staff`, `PATCH /admin/users/{id}/role`, `GET /admin/audit-logs` |

Workflow des modules : `draft → review → published → archived` (publication programmable via `scheduled_at`).
