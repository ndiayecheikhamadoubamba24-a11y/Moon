<?php

namespace App\Services;

use App\Models\OtpCode;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Codes à usage unique (OTP) envoyés par SMS ou e-mail.
 * En développement, le code est écrit dans le journal Laravel. Brancher
 * un fournisseur SMS (Orange SMS API, Twilio…) dans sendSms().
 */
class OtpService
{
    public const TTL_MINUTES = 10;

    public const MAX_ATTEMPTS = 5;

    public function send(string $identifier, string $purpose = 'login'): void
    {
        $code = (string) random_int(100000, 999999);

        OtpCode::where('identifier', $identifier)->where('purpose', $purpose)->whereNull('used_at')->delete();
        OtpCode::create([
            'identifier' => $identifier,
            'purpose' => $purpose,
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes(self::TTL_MINUTES),
        ]);

        if (str_contains($identifier, '@')) {
            Mail::raw("Ton code Moon : {$code}\nIl expire dans ".self::TTL_MINUTES.' minutes.', function ($message) use ($identifier) {
                $message->to($identifier)->subject('Ton code Moon');
            });
        } else {
            $this->sendSms($identifier, "Moon : ton code est {$code}");
        }

        if (app()->environment('local', 'testing')) {
            Log::info("OTP {$purpose} pour {$identifier} : {$code}");
            cache()->put("otp_debug:{$identifier}", $code, now()->addMinutes(self::TTL_MINUTES));
        }
    }

    public function verify(string $identifier, string $code, string $purpose = 'login'): bool
    {
        $otp = OtpCode::where('identifier', $identifier)
            ->where('purpose', $purpose)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->latest('id')
            ->first();

        if (! $otp || $otp->attempts >= self::MAX_ATTEMPTS) {
            return false;
        }
        if (! Hash::check($code, $otp->code_hash)) {
            $otp->increment('attempts');

            return false;
        }
        $otp->update(['used_at' => now()]);

        return true;
    }

    protected function sendSms(string $phone, string $message): void
    {
        // TODO : intégrer le fournisseur SMS retenu.
        Log::channel(config('logging.default'))->debug("SMS vers {$phone} : {$message}");
    }
}
