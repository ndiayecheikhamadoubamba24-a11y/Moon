<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            ContentSeeder::class,
            GameSeeder::class,
            ResourceSeeder::class,
        ]);

        if (! app()->environment('production')) {
            $this->call(DemoSeeder::class);
        }
    }
}
