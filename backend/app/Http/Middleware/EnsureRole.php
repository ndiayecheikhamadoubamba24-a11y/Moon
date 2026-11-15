<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Restreint l'accès au back-office. Sans paramètre : tout membre de l'équipe.
 * Avec paramètres (role:educator,moderator) : ces rôles + super administrateur.
 */
class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user || ! $user->isStaff() || $user->isSuspended()) {
            abort(403, 'Accès réservé à l\'équipe Moon.');
        }
        // Premier accès avec le mot de passe donné par un administrateur : seul le changement de mot de passe est permis
        if ($user->must_change_password && ! $request->is('api/v1/admin/me', 'api/v1/admin/password')) {
            abort(403, 'Choisis d\'abord ton mot de passe personnel.');
        }
        if ($roles && ! $user->hasRole(...$roles)) {
            abort(403, 'Ton rôle ne permet pas cette action.');
        }

        return $next($request);
    }
}
