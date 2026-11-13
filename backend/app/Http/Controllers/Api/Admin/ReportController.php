<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Report;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ReportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(
            Report::with('reportable')
                ->when($request->input('status', 'open'), fn ($q, $s) => $s === 'all' ? $q : $q->where('status', $s))
                ->latest()
                ->paginate(25)
        );
    }

    public function update(Request $request, Report $report): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['resolved', 'dismissed', 'open'])],
            'resolution' => ['nullable', 'string', 'max:1000'],
            // Action optionnelle sur le contenu signalé
            'action' => ['nullable', Rule::in(['unpublish', 'delete'])],
        ]);

        $target = $report->reportable;
        if ($target && ($data['action'] ?? null) === 'unpublish') {
            match (true) {
                isset($target->is_published) => $target->forceFill(['is_published' => false])->save(),
                isset($target->is_active) => $target->forceFill(['is_active' => false])->save(),
                isset($target->status) => $target->forceFill(['status' => 'archived'])->save(),
                default => null,
            };
        } elseif ($target && ($data['action'] ?? null) === 'delete') {
            $target->delete();
        }

        $report->forceFill([
            'status' => $data['status'],
            'resolution' => $data['resolution'] ?? null,
            'handled_by' => $request->user()->id,
        ])->save();
        AuditLog::record('report.'.$data['status'], $report, ['action' => $data['action'] ?? null]);

        return response()->json($report);
    }
}
