<?php

namespace App\Http\Controllers\Lookups;

use App\Models\Advantage;

/** @extends LookupController<Advantage> */
class AdvantageController extends LookupController
{
    protected string $model = Advantage::class;

    protected string $page = 'advantages';

    protected string $singular = 'Advantage';
}
