<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\AuditLog;
use App\Models\User;
use App\Services\PushService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Notifications push ciblées et annonces (nouveau module, campagne). */
class AnnouncementController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Announcement::latest()->paginate(25));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:100'],
            'body' => ['required', 'string', 'max:300'],
            'audience' => ['nullable', 'array'],
            'audience.age_range' => ['nullable', 'array'],
            'audience.age_range.*' => [Rule::in(User::AGE_RANGES)],
            'audience.language' => ['nullable', Rule::in(['fr', 'wo'])],
            'audience.region' => ['nullable', 'string'],
            'push' => ['boolean'],
            'scheduled_at' => ['nullable', 'date', 'after:now'],
        ]);
        $announcement = new Announcement($data);
        $announcement->author_id = $request->user()->id;
        $announcement->save();
        AuditLog::record('announcement.created', $announcement);

        return response()->json($announcement, 201);
    }

    public function send(Announcement $announcement, PushService $push): JsonResponse
    {
        abort_if($announcement->sent_at, 422, 'Annonce déjà envoyée.');
        $count = self::deliver($announcement, $push);
        AuditLog::record('announcement.sent', $announcement, ['recipients' => $count]);

        return response()->json($announcement->fresh());
    }

    public static function deliver(Announcement $announcement, PushService $push): int
    {
        $audience = $announcement->audience ?? [];
        $tokens = User::where('role', User::ROLE_USER)->where('status', 'active')->whereNotNull('push_token')
            ->when($audience['age_range'] ?? null, fn ($q, $a) => $q->whereIn('age_range', $a))
            ->when($audience['language'] ?? null, fn ($q, $l) => $q->where('language', $l))
            ->when($audience['region'] ?? null, fn ($q, $r) => $q->where('region', $r))
            ->pluck('push_token')->all();

        $count = $announcement->push ? $push->send($tokens, $announcement->title, $announcement->body, ['type' => 'announcement', 'id' => $announcement->id]) : 0;
        $announcement->forceFill(['sent_at' => now(), 'recipients_count' => $count])->save();

        return $count;
    }
}
