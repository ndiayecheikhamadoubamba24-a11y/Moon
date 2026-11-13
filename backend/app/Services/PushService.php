<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/** Envoi de notifications push via le service Expo. */
class PushService
{
    private const ENDPOINT = 'https://exp.host/--/api/v2/push/send';

    /**
     * @param  array<int, string>  $tokens
     */
    public function send(array $tokens, string $title, string $body, array $data = []): int
    {
        $tokens = array_values(array_filter(array_unique($tokens), fn ($t) => str_starts_with((string) $t, 'ExponentPushToken')));
        if (! $tokens || ! config('services.expo.enabled', true)) {
            return 0;
        }

        $sent = 0;
        foreach (array_chunk($tokens, 100) as $chunk) {
            $messages = array_map(fn ($token) => [
                'to' => $token,
                'title' => $title,
                'body' => $body,
                'data' => $data,
                'sound' => 'default',
            ], $chunk);

            try {
                Http::withToken(config('services.expo.access_token'))
                    ->timeout(15)
                    ->post(self::ENDPOINT, $messages)
                    ->throw();
                $sent += count($chunk);
            } catch (\Throwable $e) {
                Log::warning('Échec envoi push Expo : '.$e->getMessage());
            }
        }

        return $sent;
    }
}
