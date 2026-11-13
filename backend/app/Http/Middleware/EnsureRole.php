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
        if ($roles && ! $user->hasRole(...$roles)) {
            abort(403, 'Ton rôle ne permet pas cette action.');
        }

        return $next($request);
    }
}
