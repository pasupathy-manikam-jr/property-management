<?php

namespace Database\Seeders\Modules;

use App\Models\CustomPage;
use App\Models\NotificationTemplate;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class SettingsSeeder extends Seeder
{
    /**
     * Email notification templates (en/ms/zh) and the website's custom pages.
     */
    public function run(): void
    {
        $data = File::json(database_path('demo/settings.json'), JSON_THROW_ON_ERROR);

        foreach ($data['notification_templates'] as $row) {
            NotificationTemplate::query()->firstOrCreate(['event' => $row['event']], $row);
        }

        foreach ($data['custom_pages'] as $row) {
            CustomPage::query()->firstOrCreate(['slug' => $row['slug']], $row);
        }
    }
}
