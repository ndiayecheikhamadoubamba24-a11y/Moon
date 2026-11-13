<?php

use App\Http\Controllers\Api;
use App\Http\Controllers\Api\Admin;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Moon — v1
|--------------------------------------------------------------------------
| Application mobile : /api/v1/...
| Back-office web    : /api/v1/admin/...
*/

Route::prefix('v1')->group(function () {

    // --- Authentification -------------------------------------------------
    Route::prefix('auth')->middleware('throttle:auth')->group(function () {
        Route::post('register', [Api\AuthController::class, 'register']);
        Route::post('login', [Api\AuthController::class, 'login']);
        Route::post('otp/request', [Api\AuthController::class, 'requestOtp'])->middleware('throttle:otp');
        Route::post('otp/verify', [Api\AuthController::class, 'verifyOtp']);
        Route::post('password/forgot', [Api\AuthController::class, 'forgotPassword'])->middleware('throttle:otp');
        Route::post('password/reset', [Api\AuthController::class, 'resetPassword']);
    });

    Route::middleware(['auth:sanctum', 'active'])->group(function () {
        Route::post('auth/logout', [Api\AuthController::class, 'logout']);

        // --- Profil et données personnelles -------------------------------
        Route::get('me', [Api\ProfileController::class, 'show']);
        Route::patch('me', [Api\ProfileController::class, 'update']);
        Route::delete('me', [Api\ProfileController::class, 'destroy']);
        Route::get('me/export', [Api\ProfileController::class, 'export']);
        Route::put('me/push-token', [Api\ProfileController::class, 'pushToken']);

        Route::get('home', Api\HomeController::class);
        Route::post('sync', Api\SyncController::class);

        // --- Cycle et calendrier ------------------------------------------
        Route::get('cycle/summary', [Api\CycleController::class, 'summary']);
        Route::get('cycle/calendar', [Api\CycleController::class, 'calendar']);
        Route::get('cycle/day/{date}', [Api\CycleController::class, 'day'])->where('date', '\d{4}-\d{2}-\d{2}');
        Route::post('cycle/period/start', [Api\CycleController::class, 'startPeriod']);
        Route::post('cycle/period/end', [Api\CycleController::class, 'endPeriod']);
        Route::get('cycles', [Api\CycleController::class, 'index']);
        Route::post('cycles', [Api\CycleController::class, 'store']);
        Route::patch('cycles/{cycle}', [Api\CycleController::class, 'update']);
        Route::delete('cycles/{cycle}', [Api\CycleController::class, 'destroy']);

        // --- Journal ------------------------------------------------------
        Route::get('logs', [Api\DailyLogController::class, 'index']);
        Route::get('logs/{date}', [Api\DailyLogController::class, 'show'])->where('date', '\d{4}-\d{2}-\d{2}');
        Route::put('logs/{date}', [Api\DailyLogController::class, 'upsert'])->where('date', '\d{4}-\d{2}-\d{2}');
        Route::delete('logs/{date}', [Api\DailyLogController::class, 'destroy'])->where('date', '\d{4}-\d{2}-\d{2}');

        Route::get('reminders', [Api\ReminderController::class, 'index']);
        Route::put('reminders/{type}', [Api\ReminderController::class, 'update']);

        // --- Contenus -----------------------------------------------------
        Route::get('categories', [Api\ContentController::class, 'categories']);
        Route::get('modules', [Api\ContentController::class, 'modules']);
        Route::get('modules/{slug}', [Api\ContentController::class, 'module']);
        Route::put('modules/{module}/progress', [Api\ContentController::class, 'progress'])->whereNumber('module');
        Route::get('tips', [Api\ContentController::class, 'tips']);
        Route::get('guides', [Api\ContentController::class, 'guides']);
        Route::get('guides/{slug}', [Api\ContentController::class, 'guide']);
        Route::get('faqs', [Api\ContentController::class, 'faqs']);

        // --- Jeux ---------------------------------------------------------
        Route::get('games', [Api\GameController::class, 'index']);
        Route::get('games/{game}', [Api\GameController::class, 'show']);
        Route::post('games/{game}/scores', [Api\GameController::class, 'submit']);
        Route::post('questions/{question}/check', [Api\GameController::class, 'check']);
        Route::get('badges', [Api\GameController::class, 'badges']);
        Route::get('leaderboard', [Api\GameController::class, 'leaderboard']);
        Route::get('challenges/current', [Api\GameController::class, 'challenge']);

        // --- Aide « Je suis là pour toi » -----------------------------------
        Route::get('help-requests', [Api\HelpRequestController::class, 'index']);
        Route::post('help-requests', [Api\HelpRequestController::class, 'store'])->middleware('throttle:help');
        Route::get('help-requests/{helpRequest}', [Api\HelpRequestController::class, 'show']);
        Route::post('help-requests/{helpRequest}/messages', [Api\HelpRequestController::class, 'reply'])->middleware('throttle:help');
        Route::get('emergency-contacts', [Api\HelpRequestController::class, 'emergency']);

        // --- Centres (carte) ----------------------------------------------
        Route::get('resources', [Api\ResourceController::class, 'index']);
        Route::get('resources/places', [Api\ResourceController::class, 'places']);
        Route::get('resources/offline', [Api\ResourceController::class, 'offline']);
        Route::get('resources/saved', [Api\ResourceController::class, 'saved']);
        Route::get('resources/{resource}', [Api\ResourceController::class, 'show'])->whereNumber('resource');
        Route::post('resources/{resource}/save', [Api\ResourceController::class, 'save'])->whereNumber('resource');
        Route::delete('resources/{resource}/save', [Api\ResourceController::class, 'unsave'])->whereNumber('resource');
        Route::post('resource-suggestions', [Api\ResourceController::class, 'suggest'])->middleware('throttle:help');

        Route::post('reports', [Api\ReportController::class, 'store'])->middleware('throttle:help');

        // =================================================================
        // Back-office
        // =================================================================
        Route::prefix('admin')->middleware('role')->group(function () {
            Route::get('dashboard', Admin\DashboardController::class);

            // Contenus : éducateurs
            Route::get('me', fn (Request $r) => $r->user()->only(['id', 'name', 'email', 'role']));

            Route::middleware('role:educator')->group(function () {
                Route::get('modules/{module}/stats', [Admin\ModuleController::class, 'stats']);
                Route::get('games-overview', [Admin\QuestionController::class, 'overview']);
                Route::get('questions/{question}/stats', [Admin\QuestionController::class, 'stats']);
                Route::post('questions/{question}/validate', [Admin\QuestionController::class, 'validateMedically']);
                Route::post('questions/bulk', [Admin\QuestionController::class, 'bulk']);
                Route::post('questions/import', [Admin\QuestionController::class, 'import']);
                Route::apiResource('modules', Admin\ModuleController::class);
                Route::post('modules/{module}/status', [Admin\ModuleController::class, 'transition']);
                Route::apiResource('categories', Admin\CategoryController::class);
                Route::apiResource('tips', Admin\TipController::class);
                Route::apiResource('guides', Admin\GuideController::class);
                Route::apiResource('faqs', Admin\FaqController::class);
                Route::apiResource('games', Admin\GameAdminController::class);
                Route::apiResource('questions', Admin\QuestionController::class);
                Route::apiResource('challenges', Admin\ChallengeController::class);
                Route::apiResource('badges', Admin\BadgeController::class);
            });

            // Utilisateurs : modérateurs
            Route::middleware('role:moderator')->group(function () {
                Route::get('users', [Admin\UserController::class, 'index']);
                Route::get('users-overview', [Admin\UserController::class, 'overview']);
                Route::get('users-registrations', [Admin\UserController::class, 'registrations']);
                Route::get('users/{user}', [Admin\UserController::class, 'show']);
                Route::post('users/{user}/suspend', [Admin\UserController::class, 'suspend']);
                Route::post('users/{user}/activate', [Admin\UserController::class, 'activate']);
                Route::post('users/{user}/reset-access', [Admin\UserController::class, 'resetAccess']);
                Route::delete('users/{user}', [Admin\UserController::class, 'destroy']);
            });

            // Signalements : modérateurs
            Route::middleware('role:moderator')->group(function () {
                Route::get('reports', [Admin\ReportController::class, 'index']);
                Route::patch('reports/{report}', [Admin\ReportController::class, 'update']);
            });

            // Demandes d'aide et ressources : responsables d'accompagnement
            Route::middleware('role:support')->group(function () {
                Route::get('help-requests', [Admin\HelpRequestController::class, 'index']);
                Route::get('help-requests/{helpRequest}', [Admin\HelpRequestController::class, 'show']);
                Route::patch('help-requests/{helpRequest}', [Admin\HelpRequestController::class, 'update']);
                Route::post('help-requests/{helpRequest}/messages', [Admin\HelpRequestController::class, 'message']);
                Route::post('help-requests/{helpRequest}/faq', [Admin\HelpRequestController::class, 'publishToFaq']);
                Route::get('resources-overview', [Admin\ResourceAdminController::class, 'overview']);
                Route::post('resources/bulk', [Admin\ResourceAdminController::class, 'bulk']);
                Route::post('resources/import', [Admin\ResourceAdminController::class, 'import']);
                Route::apiResource('resources', Admin\ResourceAdminController::class);
                Route::get('resource-suggestions', [Admin\AuditLogController::class, 'suggestions']);
                Route::patch('resource-suggestions/{suggestion}', [Admin\AuditLogController::class, 'updateSuggestion']);
            });

            // Annonces : éducateurs et responsables
            Route::middleware('role:educator,support')->group(function () {
                Route::get('announcements', [Admin\AnnouncementController::class, 'index']);
                Route::post('announcements', [Admin\AnnouncementController::class, 'store']);
                Route::post('announcements/{announcement}/send', [Admin\AnnouncementController::class, 'send']);
            });

            // Super administrateur
            Route::middleware('role:super_admin')->group(function () {
                Route::post('staff', [Admin\UserController::class, 'storeStaff']);
                Route::patch('users/{user}/role', [Admin\UserController::class, 'updateRole']);
                Route::get('audit-logs', [Admin\AuditLogController::class, 'index']);
            });
        });
    });
});
