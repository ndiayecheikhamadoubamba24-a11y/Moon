<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        RateLimiter::for('api', fn (Request $r) => Limit::perMinute(120)->by($r->user()?->id ?: $r->ip()));
        RateLimiter::for('auth', fn (Request $r) => Limit::perMinute(10)->by($r->ip()));
        // Codes OTP : limite par identifiant et par IP (coût SMS, abus)
        RateLimiter::for('otp', fn (Request $r) => [
            Limit::perHour(5)->by('otp:'.strtolower((string) $r->input('identifier'))),
            Limit::perHour(20)->by('otp-ip:'.$r->ip()),
        ]);
        RateLimiter::for('help', fn (Request $r) => Limit::perHour(20)->by($r->user()?->id ?: $r->ip()));
    }
}
