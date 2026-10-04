import { useTranslation } from '@/hooks/use-translation';

export type NoticeItem = {
    id: number;
    title: string;
    description: string | null;
};

/** Latest notices, as shown on the tenant and maintainer dashboards. */
export function NoticeList({ notices }: { notices: NoticeItem[] }) {
    const { t } = useTranslation();

    return notices.length ? (
        <ul className="grid gap-3">
            {notices.map((n) => (
                <li key={n.id}>
                    <div className="font-medium">{n.title}</div>
                    {n.description && (
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                            {n.description}
                        </p>
                    )}
                </li>
            ))}
        </ul>
    ) : (
        <p className="text-sm text-muted-foreground">{t('No notices yet')}</p>
    );
}
