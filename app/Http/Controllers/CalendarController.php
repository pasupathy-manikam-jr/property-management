<?php

namespace App\Http\Controllers;

use App\Models\Agreement;
use App\Models\Lease;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

/**
 * One month of key dates: lease and agreement start/end, invoice due dates and maintenance requests.
 */
class CalendarController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $month = preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', (string) $request->query('month'))
            ? Carbon::createFromFormat('!Y-m', (string) $request->query('month'))
            : now()->startOfMonth();
        $range = [$month->toDateString(), $month->copy()->endOfMonth()->toDateString()];

        $leases = Lease::query()->with('tenant.user:id,name', 'unit:id,name')
            ->where(fn ($q) => $q->whereBetween('start_date', $range)->orWhereBetween('end_date', $range))
            ->get();
        $agreements = Agreement::query()->with('tenant.user:id,name')
            ->where(fn ($q) => $q->whereBetween('start_date', $range)->orWhereBetween('end_date', $range))
            ->get();

        $events = collect()
            ->merge($this->startEnd($leases, 'lease', $range, fn (Lease $l) => "{$l->tenant->user->name} · {$l->unit->name}", fn (Lease $l) => route('tenants.show', $l->tenant_id)))
            ->merge($this->startEnd($agreements, 'agreement', $range, fn (Agreement $a) => "{$a->number} · {$a->tenant->user->name}", fn (Agreement $a) => route('agreements.show', $a)));

        // Invoices and maintenance belong to other modules; show them once their tables exist.
        if (Schema::hasTable('invoices')) {
            $events = $events->merge(DB::table('invoices')->whereBetween('end_date', $range)->get(['id', 'number', 'end_date'])
                ->map(fn ($row) => ['id' => "invoice-{$row->id}", 'type' => 'invoice_due', 'date' => $row->end_date, 'title' => $row->number ?? "#{$row->id}", 'href' => Route::has('invoices.show') ? route('invoices.show', $row->id) : null]));
        }

        if (Schema::hasTable('maintenance_requests')) {
            $events = $events->merge(DB::table('maintenance_requests')->join('units', 'units.id', '=', 'maintenance_requests.unit_id')
                ->whereBetween('request_date', $range)->get(['maintenance_requests.id', 'request_date', 'units.name'])
                ->map(fn ($row) => ['id' => "maintenance-{$row->id}", 'type' => 'maintenance', 'date' => $row->request_date, 'title' => $row->name, 'href' => Route::has('maintenance-requests.show') ? route('maintenance-requests.show', $row->id) : null]));
        }

        return Inertia::render('calendar/index', [
            'month' => $month->format('Y-m'),
            'events' => $events->sortBy('date')->values(),
        ]);
    }

    /**
     * Start and end events for records whose start_date / end_date falls in the range.
     *
     * @template T of Lease|Agreement
     *
     * @param  Collection<int, T>  $records
     * @param  array{string, string}  $range
     * @param  callable(T): string  $title
     * @param  callable(T): string  $href
     * @return Collection<int, array{id: string, type: string, date: string, title: string, href: string}>
     */
    private function startEnd(Collection $records, string $type, array $range, callable $title, callable $href): Collection
    {
        return $records->flatMap(fn ($record) => collect(['start' => $record->start_date, 'end' => $record->end_date])
            ->filter(fn (CarbonInterface $date) => $date->toDateString() >= $range[0] && $date->toDateString() <= $range[1])
            ->map(fn (CarbonInterface $date, string $edge) => [
                'id' => "{$type}-{$edge}-{$record->id}",
                'type' => "{$type}_{$edge}",
                'date' => $date->toDateString(),
                'title' => $title($record),
                'href' => $href($record),
            ])->values());
    }
}
