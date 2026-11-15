<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\Rule;

class ChatController extends Controller
{
    public function fatou(Request $request): JsonResponse
    {
        $data = $request->validate([
            'messages' => ['required', 'array', 'min:1', 'max:20'],
            'messages.*.role' => ['required', Rule::in(['user', 'assistant'])],
            'messages.*.content' => ['required', 'string', 'max:2000'],
        ]);

        $user = $request->user();
        $systemPrompt = $this->buildSystemPrompt($user->name, $user->age_range, $user->language);

        $reply = $this->askGroq($systemPrompt, $data['messages'])
            ?? $this->askGemini($systemPrompt, $data['messages']);

        if ($reply === null) {
            return response()->json([
                'message' => 'Fatou est momentanément indisponible. Réessaie dans quelques instants ou utilise l’espace Aide.',
            ], 503);
        }

        $reply = str_replace(['**', '«', '»', '"'], ['', '', '', ''], $reply);
        $reply = trim((string) preg_replace('/[ \t]{2,}/', ' ', $reply));

        return response()->json(['reply' => $reply]);
    }

    private function buildSystemPrompt(?string $name, ?string $ageRange, ?string $language): string
    {
        $prenom = $name ?: 'ma sœur';
        $age = $ageRange ? "Tranche d'âge de l'utilisatrice : {$ageRange} ans." : '';
        $lang = $language === 'wo'
            ? 'Réponds en français simple et chaleureux, avec quelques expressions bienveillantes en wolof si cela aide.'
            : 'Réponds en français simple, chaleureux et bienveillant.';

        return <<<PROMPT
Tu es Fatou, la conseillère virtuelle et « grande sœur » bienveillante de l'application Moon.
Tu accompagnes les jeunes filles (et jeunes femmes) pour :
- Les conseiller sur leurs décisions quotidiennes ou importantes (études, amitiés, relations, pression des pairs, confiance en soi, limites personnelles, dire non sans culpabiliser).
- Les aider à adopter des comportements sains, respectueux d'elles-mêmes, sûrs et responsables.
- Les informer avec douceur sur le bien-être, les émotions et l'hygiène menstruelle.

Contexte : tu parles à {$prenom}. {$age} {$lang}

Règles importantes :
- Sois toujours très brève, claire et directe : 2 à 4 phrases courtes maximum, sans longs paragraphes ni longues listes.
- N'utilise ni guillemets, ni astérisques (**), écris en texte simple, naturel et chaleureux.
- Sois empathique, positive et sans jugement, et donne un conseil concret adapté à son âge.
- Ne pose jamais de diagnostic médical et oriente vers l'onglet Aide ou un adulte de confiance en cas de danger ou de détresse grave.
PROMPT;
    }

    private function askGroq(string $systemPrompt, array $messages): ?string
    {
        $key = config('services.groq.key');
        if (! $key) {
            return null;
        }

        $payloadMessages = [
            ['role' => 'system', 'content' => $systemPrompt],
            ...array_map(fn ($m) => ['role' => $m['role'], 'content' => $m['content']], $messages),
        ];

        try {
            $res = Http::withToken($key)
                ->timeout(8)
                ->post('https://api.groq.com/openai/v1/chat/completions', [
                    'model' => config('services.groq.model', 'openai/gpt-oss-20b'),
                    'messages' => $payloadMessages,
                    'temperature' => 0.7,
                    'max_tokens' => 240,
                    'reasoning_effort' => 'low',
                ]);

            if ($res->successful()) {
                $text = trim((string) $res->json('choices.0.message.content'));

                return $text !== '' ? $text : null;
            }
        } catch (\Throwable) {
            return null;
        }

        return null;
    }

    private function askGemini(string $systemPrompt, array $messages): ?string
    {
        $key = config('services.gemini.key');
        if (! $key) {
            return null;
        }

        $model = config('services.gemini.model', 'gemini-2.0-flash');
        $contents = array_map(fn ($m) => [
            'role' => $m['role'] === 'assistant' ? 'model' : 'user',
            'parts' => [['text' => $m['content']]],
        ], $messages);

        try {
            $res = Http::timeout(8)->post(
                "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$key}",
                [
                    'systemInstruction' => ['parts' => [['text' => $systemPrompt]]],
                    'contents' => $contents,
                    'generationConfig' => ['temperature' => 0.7, 'maxOutputTokens' => 320],
                ]
            );

            if ($res->successful()) {
                $text = trim((string) $res->json('candidates.0.content.parts.0.text'));

                return $text !== '' ? $text : null;
            }
        } catch (\Throwable) {
            return null;
        }

        return null;
    }
}

