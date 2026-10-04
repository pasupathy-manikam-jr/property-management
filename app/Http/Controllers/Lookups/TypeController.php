<?php

namespace App\Http\Controllers\Lookups;

use App\Models\Type;
use Illuminate\Validation\Rule;

/** @extends LookupController<Type> */
class TypeController extends LookupController
{
    protected string $model = Type::class;

    protected string $page = 'types';

    protected string $singular = 'Type';

    protected function extraFilter(): string
    {
        return 'kind';
    }

    protected function rules(): array
    {
        return ['kind' => ['required', Rule::in(Type::KINDS)]];
    }
}
