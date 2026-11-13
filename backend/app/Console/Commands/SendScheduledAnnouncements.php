<?php

namespace App\Console\Commands;

use App\Http\Controllers\Api\Admin\AnnouncementController;
use App\Models\Announcement;
use App\Services\PushService;
use Illuminate\Console\Command;

class SendScheduledAnnouncements extends Command
{
    protected $signature = 'moon:publish-scheduled';

    protected $description = 'Envoie les annonces programmées';

    public function handle(PushService $push): int
    {
        $announcements = Announcement::whereNull('sent_at')->whereNotNull('scheduled_at')->where('scheduled_at', '<=', now())->get();
        foreach ($announcements as $announcement) {
            AnnouncementController::deliver($announcement, $push);
        }
        $this->info($announcements->count().' annonce(s) envoyée(s).');

        return self::SUCCESS;
    }
}
