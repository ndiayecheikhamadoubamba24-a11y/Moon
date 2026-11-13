<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HelpRequest;
use App\Models\Resource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Espace « Je suis là pour toi ». */
class HelpRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(
            $request->user()->helpRequests()
                ->withCount('publicMessages')
                ->latest()
                ->get(['id', 'type', 'subject', 'status', 'priority', 'is_anonymous', 'created_at', 'updated_at'])
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(HelpRequest::TYPES)],
            'subject' => ['nullable', 'string', 'max:150'],
            'message' => ['required', 'string', 'min:3', 'max:3000'],
            'is_anonymous' => ['boolean'],
            'faq_consent' => ['boolean'],
            'urgent' => ['boolean'],
        ]);

        $help = new HelpRequest([
            ...collect($data)->except('urgent')->all(),
            'priority' => ($request->boolean('urgent') || $data['type'] === 'medical') ? 'urgent' : 'normal',
        ]);
        $help->user()->associate($request->user());
        $help->save();

        return response()->json([
            'request' => $help->fresh(),
            'message' => 'Ta demande est bien reçue. Une personne de l\'équipe Moon te répondra ici.',
            'emergency_contacts' => $help->priority === 'urgent' ? $this->emergencyList() : [],
        ], 201);
    }

    public function show(Request $request, HelpRequest $helpRequest): JsonResponse
    {
        $this->authorizeOwner($request, $helpRequest);
        $helpRequest->load(['publicMessages' => fn ($q) => $q->select(['id', 'help_request_id', 'from_staff', 'body', 'created_at'])]);

        return response()->json($helpRequest);
    }

    public function reply(Request $request, HelpRequest $helpRequest): JsonResponse
    {
        $this->authorizeOwner($request, $helpRequest);
        abort_if($helpRequest->status === 'resolved', 422, 'Cette demande est clôturée. Tu peux en créer une nouvelle.');
        $data = $request->validate(['body' => ['required', 'string', 'max:3000']]);

        $message = $helpRequest->messages()->create([
            'sender_id' => $request->user()->id,
            'from_staff' => false,
            'body' => $data['body'],
        ]);
        $helpRequest->touch();

        return response()->json($message, 201);
    }

    /** Bouton « besoin d'aide urgente » : lignes d'écoute et urgences. */
    public function emergency(): JsonResponse
    {
        return response()->json($this->emergencyList());
    }

    private function emergencyList()
    {
        return Resource::where('is_active', true)
            ->where(fn ($q) => $q->where('is_emergency', true)->orWhere('type', 'hotline'))
            ->get(['id', 'name', 'type', 'phone', 'description']);
    }

    private function authorizeOwner(Request $request, HelpRequest $helpRequest): void
    {
        abort_unless($helpRequest->user_id === $request->user()->id, 404);
    }
}
