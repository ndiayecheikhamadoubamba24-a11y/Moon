<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureActive
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->isSuspended()) {
            $request->user()->currentAccessToken()?->delete();
            abort(403, 'Ce compte est suspendu. Contacte l\'équipe Moon.');
        }

        return $next($request);
    }
}
