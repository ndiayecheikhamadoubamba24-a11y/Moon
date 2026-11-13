<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    public const ROLE_USER = 'user';

    public const ROLE_SUPER_ADMIN = 'super_admin';

    public const ROLE_EDUCATOR = 'educator';

    public const ROLE_MODERATOR = 'moderator';

    public const ROLE_SUPPORT = 'support';

    public const STAFF_ROLES = [
        self::ROLE_SUPER_ADMIN, self::ROLE_EDUCATOR, self::ROLE_MODERATOR, self::ROLE_SUPPORT,
    ];

    public const AGE_RANGES = ['12-14', '15-17', '18-21', '22-25', '25+'];

    protected $fillable = [
        'name', 'email', 'phone', 'password', 'age_range', 'language', 'mode', 'avatar',
        'region', 'cycle_length', 'period_length', 'leaderboard_opt_in', 'push_token',
        'notification_settings', 'consented_at', 'guardian_consent',
    ];

    protected $hidden = ['password', 'remember_token', 'push_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'phone_verified_at' => 'datetime',
            'consented_at' => 'datetime',
            'last_activity_date' => 'date:Y-m-d',
            'guardian_consent' => 'boolean',
            'leaderboard_opt_in' => 'boolean',
            'notification_settings' => 'array',
            'password' => 'hashed',
        ];
    }

    public function isStaff(): bool
    {
        return in_array($this->role, self::STAFF_ROLES, true);
    }

    public function hasRole(string ...$roles): bool
    {
        return $this->role === self::ROLE_SUPER_ADMIN || in_array($this->role, $roles, true);
    }

    public function isSuspended(): bool
    {
        return $this->status === 'suspended';
    }

    public function isMinor(): bool
    {
        return in_array($this->age_range, ['12-14', '15-17'], true);
    }

    public function cycles(): HasMany
    {
        return $this->hasMany(Cycle::class);
    }

    public function dailyLogs(): HasMany
    {
        return $this->hasMany(DailyLog::class);
    }

    public function reminders(): HasMany
    {
        return $this->hasMany(Reminder::class);
    }

    public function moduleProgress(): HasMany
    {
        return $this->hasMany(ModuleProgress::class);
    }

    public function gameScores(): HasMany
    {
        return $this->hasMany(GameScore::class);
    }

    public function badges(): BelongsToMany
    {
        return $this->belongsToMany(Badge::class, 'user_badges')->withPivot('earned_at');
    }

    public function helpRequests(): HasMany
    {
        return $this->hasMany(HelpRequest::class);
    }

    public function savedResources(): BelongsToMany
    {
        return $this->belongsToMany(Resource::class, 'saved_resources')->withTimestamps();
    }
}
