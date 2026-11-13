<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Faq;
use App\Models\HelpRequest;
use App\Models\User;
use App\Services\PushService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** File des demandes d'aide : priorité, assignation, réponses, notes internes, clôture. */
class HelpRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'status' => ['nullable', Rule::in([...HelpRequest::STATUSES, 'open'])],
            'priority' => ['nullable', Rule::in(HelpRequest::PRIORITIES)],
            'type' => ['nullable', Rule::in(HelpRequest::TYPES)],
        ]);

        $query = HelpRequest::with(['assignee:id,name', 'user:id,name,age_range'])
            ->withCount('messages')
            ->when($request->status === 'open', fn ($q) => $q->where('status', '!=', 'resolved'))
            ->when($request->status && $request->status !== 'open', fn ($q) => $q->where('status', $request->status))
            ->when($request->priority, fn ($q, $p) => $q->where('priority', $p))
            ->when($request->type, fn ($q, $t) => $q->where('type', $t))
            ->when($request->assigned === 'me', fn ($q) => $q->where('assigned_to', $request->user()->id))
            ->when($request->assigned === 'none', fn ($q) => $q->whereNull('assigned_to'))
            // Urgentes d'abord, puis les plus anciennes
            ->orderByRaw("case when priority = 'urgent' then 0 else 1 end")
            ->orderBy('created_at');

        $page = $query->paginate(25);
        $page->getCollection()->transform(fn (HelpRequest $h) => $this->present($h));

        return response()->json($page);
    }

    public function show(HelpRequest $helpRequest): JsonResponse
    {
        $helpRequest->load(['assignee:id,name', 'user:id,name,age_range,language', 'messages.sender:id,name,role']);

        return response()->json($this->present($helpRequest));
    }

    public function update(Request $request, HelpRequest $helpRequest): JsonResponse
    {
        $data = $request->validate([
            'priority' => ['sometimes', Rule::in(HelpRequest::PRIORITIES)],
            'status' => ['sometimes', Rule::in(HelpRequest::STATUSES)],
            'assigned_to' => ['sometimes', 'nullable', Rule::exists('users', 'id')->whereIn('role', User::STAFF_ROLES)],
        ]);
        $helpRequest->forceFill($data);
        if (($data['status'] ?? null) === 'resolved') {
            $helpRequest->closed_at = now();
        } elseif (isset($data['status'])) {
            $helpRequest->closed_at = null;
        }
        if (array_key_exists('assigned_to', $data) && $data['assigned_to'] && $helpRequest->status === 'received') {
            $helpRequest->status = 'in_progress';
        }
        $helpRequest->save();
        AuditLog::record('help_request.updated', $helpRequest, $data);

        return response()->json($this->present($helpRequest->fresh(['assignee:id,name'])));
    }

    /** Réponse dans l'app (visible par l'utilisatrice) ou note interne. */
    public function message(Request $request, HelpRequest $helpRequest, PushService $push): JsonResponse
    {
        $data = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
            'is_internal' => ['boolean'],
        ]);
        $internal = $request->boolean('is_internal');

        $message = $helpRequest->messages()->create([
            'sender_id' => $request->user()->id,
            'from_staff' => true,
            'is_internal' => $internal,
            'body' => $data['body'],
        ]);

        if (! $internal) {
            $helpRequest->first_response_at ??= now();
            if ($helpRequest->status === 'received') {
                $helpRequest->status = 'in_progress';
            }
            $helpRequest->assigned_to ??= $request->user()->id;
            $helpRequest->save();

            // Notification discrète : aucun contenu sensible dans le texte.
            if ($token = $helpRequest->user?->push_token) {
                $push->send([$token], 'Moon', 'Tu as une nouvelle réponse.', ['type' => 'help_reply', 'id' => $helpRequest->id]);
            }
        }
        AuditLog::record($internal ? 'help_request.note' : 'help_request.replied', $helpRequest);

        return response()->json($message, 201);
    }

    /** Publie la question (anonymisée) et sa réponse dans la FAQ, si l'utilisatrice a donné son accord. */
    public function publishToFaq(Request $request, HelpRequest $helpRequest): JsonResponse
    {
        abort_unless($helpRequest->faq_consent, 422, 'L\'utilisatrice n\'a pas donné son accord pour la FAQ.');
        $data = $request->validate([
            'question' => ['required', 'string', 'max:2000'],
            'answer' => ['required', 'string', 'max:5000'],
            'category_id' => ['nullable', 'exists:categories,id'],
        ]);

        $faq = new Faq([...$data, 'help_request_id' => $helpRequest->id, 'language' => $helpRequest->user?->language ?? 'fr']);
        $faq->answered_by = $request->user()->id;
        $faq->save();
        AuditLog::record('faq.published_from_request', $faq, ['help_request_id' => $helpRequest->id]);

        return response()->json($faq, 201);
    }

    private function present(HelpRequest $h): array
    {
        $data = $h->toArray();
        // Demandes anonymes : l'équipe ne voit pas l'identité.
        if ($h->is_anonymous) {
            $data['user'] = ['id' => null, 'name' => 'Anonyme', 'age_range' => $h->user?->age_range];
            $data['user_id'] = null;
        }

        return $data;
    }
}
