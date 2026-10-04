import { CalendarIcon, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useFormat } from '@/hooks/use-format';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

const pad = (n: number) => String(n).padStart(2, '0');

// Calendar dates travel as "YYYY-MM-DD" (what Laravel validates); parse them as local, never UTC.
const toIso = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (value: string) => {
    const [y, m, d] = value.split('-').map(Number);

    return y && m && d ? new Date(y, m - 1, d) : undefined;
};

/**
 * shadcn date picker (Popover + Calendar) holding a "YYYY-MM-DD" string,
 * shown in the Settings date format.
 */
export function DatePicker({
    id,
    value,
    onChange,
    placeholder = 'Pick a date',
    clearable = true,
    className,
}: {
    id?: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    clearable?: boolean;
    className?: string;
}) {
    const { t } = useTranslation();
    const { date } = useFormat();
    const [open, setOpen] = useState(false);
    const selected = value ? fromIso(value) : undefined;

    return (
        <div className={cn('relative', className)}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id={id}
                        type="button"
                        variant="outline"
                        className={cn(
                            'w-full justify-start pe-9 font-normal',
                            !selected && 'text-muted-foreground',
                        )}
                    >
                        <CalendarIcon className="text-muted-foreground" />
                        {selected ? date(selected) : t(placeholder)}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        captionLayout="dropdown"
                        startMonth={new Date(2000, 0)}
                        endMonth={new Date(new Date().getFullYear() + 10, 11)}
                        selected={selected}
                        defaultMonth={selected}
                        onSelect={(day) => {
                            onChange(day ? toIso(day) : '');
                            setOpen(false);
                        }}
                    />
                </PopoverContent>
            </Popover>
            {clearable && selected && (
                <button
                    type="button"
                    aria-label={t('Clear date')}
                    onClick={() => onChange('')}
                    className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                    <X className="size-3.5" />
                </button>
            )}
        </div>
    );
}
