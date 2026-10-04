<?php

namespace App\Http\Controllers\Lookups;

use App\Models\Amenity;

/** @extends LookupController<Amenity> */
class AmenityController extends LookupController
{
    protected string $model = Amenity::class;

    protected string $page = 'amenities';

    protected string $singular = 'Amenity';
}
