<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('moon:send-reminders')->everyFifteenMinutes()->withoutOverlapping();
Schedule::command('moon:publish-scheduled')->everyFiveMinutes()->withoutOverlapping();
Schedule::command('sanctum:prune-expired --hours=24')->daily();
