# 🌙 Moon

Application de sensibilisation et d'accompagnement des jeunes sur l'hygiène menstruelle :
suivi du cycle, conseils personnalisés, modules éducatifs, jeux, espace d'aide et carte des centres.

> Moon informe et sensibilise, elle ne remplace pas un avis médical.

## Structure du dépôt

| Dossier | Contenu | État |
|---|---|---|
| `backend/` | API Laravel 13 + Sanctum. PostgreSQL en production, SQLite en local et pour les tests | ✅ V1 |
| `mobile/` | Application React Native / Expo (voir `mobile/README.md`) | ✅ V1 |
| `admin/` | Back-office React (Vite, Tailwind, Recharts) (voir `admin/README.md`) | ✅ V1 |
| `docs/` | Documentation de l'API | ✅ |

## Démarrer le backend

Prérequis : PHP 8.3+ (extensions `pdo_sqlite`, `pdo_pgsql`) et Composer.

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate --seed
php artisan serve
```

L'API répond sur `http://127.0.0.1:8000/api/v1`.

### Utiliser PostgreSQL

```bash
docker compose up -d postgres
```

Puis dans `backend/.env` :

```
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=moon
DB_USERNAME=moon
DB_PASSWORD=moon
```

### Comptes de démonstration (hors production, mot de passe `password`)

| E-mail | Rôle |
|---|---|
| `admin@moon.test` | Super administrateur |
| `educatrice@moon.test` | Éducatrice (contenus) |
| `moderation@moon.test` | Modératrice |
| `accompagnement@moon.test` | Responsable d'accompagnement |
| `bamba@moon.test` | Utilisatrice avec un historique de cycles |

### Tests

```bash
php artisan test                         # SQLite en mémoire
DB_CONNECTION=pgsql DB_DATABASE=moon_test DB_USERNAME=moon DB_PASSWORD=moon php artisan test
```

La CI GitHub Actions exécute les tests sur les deux bases.

### Tâches planifiées

```bash
php artisan schedule:work   # en local ; en production : cron « * * * * * php artisan schedule:run »
```

- `moon:send-reminders` (toutes les 15 min) : rappels de règles, de changement de protection, d'hydratation et de journal.
- `moon:publish-scheduled` (toutes les 5 min) : annonces programmées.

## Confidentialité et sécurité

- **Minimisation** : prénom ou pseudo, tranche d'âge et langue. Accord parental obligatoire pour les moins de 18 ans.
- **Chiffrement** : les notes du journal sont chiffrées en base (`APP_KEY`), HTTPS obligatoire en production.
- **Cloisonnement** : une utilisatrice n'accède qu'à ses données. Aucune route du back-office n'expose les cycles ou le journal.
- **Statistiques** agrégées uniquement. Les groupes de moins de 5 personnes sont masqués.
- **Demandes anonymes** : l'identité n'est jamais montrée à l'équipe.
- **Droits** : export (`GET /me/export`) et suppression définitive (`DELETE /me`), conformément à la loi sénégalaise (CDP).
- **Journal d'audit** de toutes les actions administratives.
- **Limitation de débit** sur la connexion, les codes OTP et les demandes d'aide.

## Points à compléter avant la production

- Brancher un fournisseur SMS pour les codes OTP (`App\Services\OtpService::sendSms`).
- Remplacer les centres et numéros d'exemple (`ResourceSeeder`) par les partenaires réels vérifiés.
- Faire valider tout le contenu santé (conseils, modules, quiz) par un professionnel de santé.
