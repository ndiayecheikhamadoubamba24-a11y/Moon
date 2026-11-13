<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Reminder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ReminderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $existing = $request->user()->reminders()->get()->keyBy('type');

        return response()->json(collect(Reminder::TYPES)->map(fn ($type) => $existing->get($type) ?? [
            'type' => $type, 'enabled' => false, 'time' => null, 'interval_hours' => null,
        ])->values());
    }

    public function update(Request $request, string $type): JsonResponse
    {
        abort_unless(in_array($type, Reminder::TYPES, true), 404);
        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
            'time' => ['nullable', 'date_format:H:i'],
            'interval_hours' => ['nullable', 'integer', Rule::in([2, 3, 4, 6, 8])],
        ]);
        $reminder = $request->user()->reminders()->updateOrCreate(['type' => $type], $data);

        return response()->json($reminder);
    }
}
