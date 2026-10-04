<?php

namespace App\Models;

use App\Models\Concerns\StoresUploads;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A building or plot the company manages, either owned or leased.
 *
 * @property int $id
 * @property string $type
 * @property string $name
 * @property string|null $description
 * @property string $address
 * @property string $city
 * @property string $state
 * @property string $zip_code
 * @property string $country
 * @property bool $display_in_listing
 * @property string|null $listing_type
 * @property string|null $listing_price
 * @property string|null $file_path
 * @property string|null $file_name
 * @property-read string|null $thumbnail
 */
#[Fillable(['type', 'name', 'description', 'address', 'city', 'state', 'zip_code', 'country', 'display_in_listing', 'listing_type', 'listing_price', 'file_path', 'file_name', 'file_type', 'file_size'])]
class Property extends Model
{
    use StoresUploads;

    public const TYPES = ['own', 'lease'];

    public const LISTING_TYPES = ['rent', 'sell'];

    public const UPLOAD_DIRECTORY = 'properties';

    /** @var list<string> */
    protected $hidden = ['file_path', 'file_type', 'file_size'];

    /** @var list<string> */
    protected $appends = ['thumbnail'];

    /**
     * URL of the thumbnail image, served through an authorized route.
     *
     * @return Attribute<string|null, never>
     */
    protected function thumbnail(): Attribute
    {
        return Attribute::get(fn () => $this->file_path
            ? route('properties.thumbnail', ['property' => $this->id, 'v' => substr(md5($this->file_path), 0, 8)])
            : null);
    }

    /**
     * @return HasMany<Unit, $this>
     */
    public function units(): HasMany
    {
        return $this->hasMany(Unit::class);
    }

    /**
     * @return BelongsToMany<Amenity, $this>
     */
    public function amenities(): BelongsToMany
    {
        return $this->belongsToMany(Amenity::class);
    }

    /**
     * @return BelongsToMany<Advantage, $this>
     */
    public function advantages(): BelongsToMany
    {
        return $this->belongsToMany(Advantage::class);
    }

    protected function casts(): array
    {
        return [
            'display_in_listing' => 'boolean',
            'listing_price' => 'decimal:2',
        ];
    }
}
