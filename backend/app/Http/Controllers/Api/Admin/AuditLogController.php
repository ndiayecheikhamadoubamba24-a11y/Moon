<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\ResourceSuggestion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(
            AuditLog::with('user:id,name,role')
                ->when($request->action, fn ($q, $a) => $q->where('action', 'like', "{$a}%"))
                ->when($request->user_id, fn ($q, $u) => $q->where('user_id', $u))
                ->latest('id')
                ->paginate(50)
        );
    }

    public function suggestions(Request $request): JsonResponse
    {
        return response()->json(
            ResourceSuggestion::when($request->input('status', 'pending'), fn ($q, $s) => $q->where('status', $s))
                ->latest()->paginate(25)
        );
    }

    public function updateSuggestion(Request $request, ResourceSuggestion $suggestion): JsonResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(['pending', 'accepted', 'rejected'])]]);
        $suggestion->update($data);
        AuditLog::record('resource_suggestion.'.$data['status'], $suggestion);

        return response()->json($suggestion);
    }
}
