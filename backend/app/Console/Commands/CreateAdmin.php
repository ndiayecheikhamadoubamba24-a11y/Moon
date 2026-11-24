<?php

namespace App\Console\Commands;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

/**
 * Crée (ou promeut) un super administrateur, par exemple juste après la mise en ligne :
 *   php artisan moon:create-admin admin@moon.sn --name="Fatou Diallo"
 */
class CreateAdmin extends Command
{
    protected $signature = 'moon:create-admin {email} {--name=Administrateur Moon} {--role=super_admin}';

    protected $description = "Crée un compte de l'équipe Moon (super administrateur par défaut)";

    public function handle(): int
    {
        $email = strtolower(trim($this->argument('email')));
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('Adresse e-mail invalide.');

            return self::FAILURE;
        }
        $role = $this->option('role');
        if (! in_array($role, User::STAFF_ROLES, true)) {
            $this->error('Rôle inconnu. Rôles possibles : '.implode(', ', User::STAFF_ROLES));

            return self::FAILURE;
        }

        $password = $this->secret('Mot de passe (laisser vide pour en générer un)') ?: Str::password(8, symbols: false);
        if (strlen($password) < 8) {
            $this->error('Le mot de passe doit faire au moins 8 caractères.');

            return self::FAILURE;
        }

        $user = User::firstOrNew(['email' => $email]);
        $user->fill(['name' => $this->option('name'), 'password' => $password]);
        $user->forceFill(['role' => $role, 'status' => 'active', 'email_verified_at' => now(), 'consented_at' => $user->consented_at ?? now()])->save();
        AuditLog::record('staff.created_cli', $user, ['role' => $role]);

        $this->info("Compte prêt : {$email} ({$role}).");
        $this->line("Mot de passe : {$password}");
        $this->warn('Note-le en lieu sûr : il ne sera plus affiché. Change-le après la première connexion si besoin.');

        return self::SUCCESS;
    }
}
