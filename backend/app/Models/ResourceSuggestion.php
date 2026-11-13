<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ResourceSuggestion extends Model
{
    protected $fillable = ['user_id', 'resource_id', 'kind', 'message', 'status'];
}
