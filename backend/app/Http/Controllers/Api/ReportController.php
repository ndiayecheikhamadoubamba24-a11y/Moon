<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Faq;
use App\Models\HelpMessage;
use App\Models\Module;
use App\Models\Report;
use App\Models\Resource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ReportController extends Controller
{
    private const TYPES = [
        'module' => Module::class,
        'faq' => Faq::class,
        'help_message' => HelpMessage::class,
        'resource' => Resource::class,
    ];

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(array_keys(self::TYPES))],
            'id' => ['required', 'integer'],
            'reason' => ['required', Rule::in(Report::REASONS)],
            'details' => ['nullable', 'string', 'max:1000'],
        ]);
        $class = self::TYPES[$data['type']];
        abort_unless($class::whereKey($data['id'])->exists(), 404);

        $report = Report::create([
            'reporter_id' => $request->user()->id,
            'reportable_type' => $class,
            'reportable_id' => $data['id'],
            'reason' => $data['reason'],
            'details' => $data['details'] ?? null,
        ]);

        return response()->json(['id' => $report->id, 'message' => 'Merci, l\'équipe va vérifier.'], 201);
    }
}
