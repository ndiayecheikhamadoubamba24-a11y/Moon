<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\AuditLog;
use App\Models\Game;
use App\Models\GameScore;
use App\Models\Question;
use App\Models\Report;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** Banque de questions : filtres, statistiques, validation médicale, actions groupées, import CSV. */
class QuestionController extends CrudController
{
    protected string $model = Question::class;

    protected array $searchable = ['prompt', 'topic'];

    protected array $filters = ['game_id', 'is_active', 'difficulty', 'topic', 'module_id'];

    protected array $with = ['game:id,type,title,language', 'validator:id,name'];

    protected string $orderBy = 'id';

    protected function query(Request $request): Builder
    {
        return Question::query()
            ->when($request->type, fn ($q, $t) => $q->whereHas('game', fn ($g) => $g->where('type', $t)))
            ->when($request->language, fn ($q, $l) => $q->whereHas('game', fn ($g) => $g->where('language', $l)))
            ->when($request->validated === '1', fn ($q) => $q->whereNotNull('validated_at'))
            ->when($request->validated === '0', fn ($q) => $q->whereNull('validated_at'));
    }

    public function index(Request $request): JsonResponse
    {
        $page = parent::index($request)->getData(true);
        $stats = self::questionStats(collect($page['data'])->pluck('id'));
        $page['data'] = collect($page['data'])->map(fn ($q) => [...$q, ...($stats[$q['id']] ?? ['plays' => 0, 'success_rate' => null])])->all();
        if ($request->filled('max_success')) {
            $page['data'] = array_values(array_filter($page['data'], fn ($q) => $q['success_rate'] !== null && $q['success_rate'] < (float) $request->max_success));
        }

        return response()->json($page);
    }

    /** Vue d'ensemble « Jeux et défis ». */
    public function overview(): JsonResponse
    {
        $active = Question::where('is_active', true);
        $stats = self::questionStats(Question::pluck('id'));
        $rates = collect($stats)->pluck('success_rate')->filter(fn ($r) => $r !== null);
        $byTopic = Question::where('is_active', true)->get(['topic'])->groupBy(fn ($q) => $q->topic ?: 'Autre')->map->count()->sortDesc();
        $total = max($byTopic->sum(), 1);

        return response()->json([
            'active_questions' => (clone $active)->count(),
            'in_review' => Question::where('is_active', false)->count(),
            'reported' => Report::where('reportable_type', Question::class)->where('status', 'open')->distinct('reportable_id')->count('reportable_id'),
            'average_success_rate' => $rates->isEmpty() ? null : round($rates->avg()),
            'plays_this_month' => GameScore::where('played_at', '>=', now()->startOfMonth())->count(),
            'not_validated' => Question::whereNull('validated_at')->count(),
            'by_topic' => $byTopic->map(fn ($n, $topic) => ['topic' => $topic, 'count' => $n, 'percent' => round($n / $total * 100)])->values(),
        ]);
    }

    /** Statistiques d'une question : répartition des réponses, taux de réussite, signalements. */
    public function stats(string $id): JsonResponse
    {
        $question = Question::with('game')->findOrFail($id);
        $scores = GameScore::where('game_id', $question->game_id)->whereNotNull('answers')->get(['answers', 'missed_question_ids']);
        $given = $scores->map(fn ($s) => $s->answers[$question->id] ?? $s->answers[(string) $question->id] ?? null)->filter(fn ($a) => $a !== null);
        $distribution = $given->map(fn ($a) => is_array($a) ? json_encode($a) : (string) $a)->countBy()->sortDesc();
        $total = max($given->count(), 1);

        $labels = collect($question->options ?? [])->filter(fn ($o) => is_array($o) && isset($o['key']))->pluck('label', 'key');
        if ($question->game->type === 'myth_fact') {
            $labels = collect(['myth' => 'Mythe', 'fact' => 'Réalité']);
        }

        return response()->json([
            'question' => $question,
            ...(self::questionStats(collect([$question->id]))[$question->id] ?? ['plays' => 0, 'success_rate' => null]),
            'distribution' => $distribution->map(fn ($n, $answer) => [
                'answer' => $answer,
                'label' => $labels[$answer] ?? $answer,
                'count' => $n,
                'percent' => round($n / $total * 100),
                'correct' => $question->isCorrect(json_decode($answer, true) ?? $answer),
            ])->values(),
            'reports' => Report::where('reportable_type', Question::class)->where('reportable_id', $question->id)->count(),
        ]);
    }

    /** Validation médicale (ou retrait de la validation). */
    public function validateMedically(Request $request, Question $question): JsonResponse
    {
        $valid = $request->boolean('validated', true);
        $question->forceFill(['validated_by' => $valid ? $request->user()->id : null, 'validated_at' => $valid ? now() : null])->save();
        AuditLog::record($valid ? 'question.validated' : 'question.unvalidated', $question);

        return response()->json($question->fresh($this->with));
    }

    /** Actions groupées : activer, désactiver (relecture), changer de thème, valider. */
    public function bulk(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:200'],
            'ids.*' => ['integer'],
            'action' => ['required', Rule::in(['activate', 'deactivate', 'topic', 'validate', 'delete'])],
            'topic' => ['required_if:action,topic', 'nullable', 'string', 'max:100'],
        ]);
        $query = Question::whereIn('id', $data['ids']);
        $count = match ($data['action']) {
            'activate' => $query->update(['is_active' => true]),
            'deactivate' => $query->update(['is_active' => false]),
            'topic' => $query->update(['topic' => $data['topic']]),
            'validate' => $query->update(['validated_by' => $request->user()->id, 'validated_at' => now()]),
            'delete' => $query->delete(),
        };
        AuditLog::record('question.bulk_'.$data['action'], null, ['ids' => $data['ids']]);

        return response()->json(['updated' => $count]);
    }

    /**
     * Import (lignes déjà lues depuis le CSV côté navigateur).
     * Colonnes : type, enonce, theme, reponse, explication, options (A|B|C|D séparées par « | »), difficulte.
     * ?dry_run=1 : vérifie seulement et renvoie les erreurs ligne par ligne.
     */
    public function import(Request $request): JsonResponse
    {
        $request->validate(['rows' => ['required', 'array', 'max:1000']]);
        $games = Game::where('language', $request->input('language', 'fr'))->get()->keyBy('type');
        $results = [];
        foreach ($request->rows as $i => $row) {
            $errors = [];
            $type = ['quiz' => 'quiz', 'mythe' => 'myth_fact', 'myth_fact' => 'myth_fact', 'mythe_realite' => 'myth_fact'][strtolower(trim($row['type'] ?? ''))] ?? null;
            if (! $type || ! $games->has($type)) {
                $errors[] = 'Type inconnu (quiz ou mythe).';
            }
            if (blank($row['enonce'] ?? null)) {
                $errors[] = 'Énoncé vide.';
            }
            $answer = trim((string) ($row['reponse'] ?? ''));
            $options = null;
            if ($type === 'quiz') {
                $labels = array_values(array_filter(array_map('trim', explode('|', (string) ($row['options'] ?? '')))));
                $options = collect($labels)->map(fn ($l, $k) => ['key' => chr(65 + $k), 'label' => $l])->all();
                if (count($labels) < 2) {
                    $errors[] = 'Au moins 2 options.';
                }
                if (! collect($options)->pluck('key')->contains(strtoupper($answer))) {
                    $errors[] = 'Aucune bonne réponse.';
                }
                $answer = strtoupper($answer);
            } elseif ($type === 'myth_fact') {
                $answer = ['mythe' => 'myth', 'myth' => 'myth', 'realite' => 'fact', 'réalité' => 'fact', 'fact' => 'fact'][mb_strtolower($answer)] ?? null;
                if (! $answer) {
                    $errors[] = 'Réponse attendue : mythe ou réalité.';
                }
            }
            $results[] = ['line' => $i + 1, 'errors' => $errors, 'type' => $type, 'prompt' => $row['enonce'] ?? '', 'topic' => $row['theme'] ?? null];
            if (! $errors && ! $request->boolean('dry_run')) {
                $games[$type]->questions()->create([
                    'prompt' => $row['enonce'], 'topic' => $row['theme'] ?? null, 'answer' => $answer, 'options' => $options,
                    'explanation' => $row['explication'] ?? null, 'difficulty' => $row['difficulte'] ?? 'facile', 'is_active' => false,
                ]);
            }
        }
        $invalid = collect($results)->filter(fn ($r) => $r['errors'])->count();
        if (! $request->boolean('dry_run')) {
            AuditLog::record('question.import', null, ['valid' => count($results) - $invalid, 'invalid' => $invalid]);
        }

        return response()->json(['rows' => $results, 'valid' => count($results) - $invalid, 'invalid' => $invalid]);
    }

    /** Nombre de parties et taux de réussite par question (à partir des réponses enregistrées). */
    public static function questionStats(Collection $ids): array
    {
        if ($ids->isEmpty()) {
            return [];
        }
        $questions = Question::whereIn('id', $ids)->get(['id', 'game_id']);
        $out = [];
        foreach ($questions->groupBy('game_id') as $gameId => $group) {
            $scores = GameScore::where('game_id', $gameId)->get(['answers', 'missed_question_ids']);
            foreach ($group as $q) {
                $played = $scores->filter(fn ($s) => is_array($s->answers) ? array_key_exists($q->id, $s->answers) || array_key_exists((string) $q->id, $s->answers) : false);
                $plays = $played->count();
                $missed = $played->filter(fn ($s) => in_array($q->id, $s->missed_question_ids ?? []))->count();
                $out[$q->id] = ['plays' => $plays, 'success_rate' => $plays ? round(($plays - $missed) / $plays * 100) : null];
            }
        }

        return $out;
    }

    protected function rules(Request $request, ?Model $item): array
    {
        $type = Game::find($request->input('game_id', $item?->game_id))?->type;
        $req = $item ? 'sometimes' : 'required';

        return [
            'game_id' => [$req, 'exists:games,id'],
            'topic' => ['nullable', 'string', 'max:100'],
            'prompt' => [$req, 'string', 'max:1000'],
            'options' => [$type === 'myth_fact' ? 'nullable' : $req, 'nullable', 'array'],
            'answer' => [$req, ...match ($type) {
                'myth_fact' => [Rule::in(['myth', 'fact'])],
                'association' => ['array'],
                default => ['string', 'max:10'],
            }],
            'explanation' => ['nullable', 'string', 'max:1000'],
            'hint' => ['nullable', 'string', 'max:500'],
            'position' => ['nullable', 'integer'],
            'is_active' => ['sometimes', 'boolean'],
            'difficulty' => ['sometimes', Rule::in(['facile', 'moyen', 'difficile'])],
            'module_id' => ['nullable', 'exists:modules,id'],
        ];
    }

    protected function beforeSave(Model $item, array $data, Request $request): void
    {
        if (isset($data['game_id'])) {
            $item->game_id = $data['game_id'];
        }
        // Quiz : exactement une bonne réponse parmi les options
        if (($item->game?->type ?? Game::find($item->game_id)?->type) === 'quiz' && is_array($item->options)) {
            if (! collect($item->options)->pluck('key')->contains($item->answer)) {
                throw ValidationException::withMessages(['answer' => 'La bonne réponse doit faire partie des options.']);
            }
        }
        // Une question modifiée doit être revalidée médicalement.
        if ($item->exists && $item->isDirty(['prompt', 'answer', 'explanation', 'options'])) {
            $item->validated_at = null;
            $item->validated_by = null;
        }
    }
}
