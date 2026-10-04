import { Head } from '@inertiajs/react';
import SiteLayout from '@/components/site-layout';
import type { FooterPage } from '@/components/site-layout';

/** A public page from Website › Additional Pages; its content is plain text. */
export default function CustomPage({
    page,
}: {
    page: { title: string; content: string };
    pages: FooterPage[];
}) {
    return (
        <>
            <Head title={page.title} />
            <article className="mx-auto max-w-3xl px-4 py-16">
                <h1 className="text-4xl font-bold tracking-tight">
                    {page.title}
                </h1>
                <div className="mt-8 leading-7 whitespace-pre-line">
                    {page.content}
                </div>
            </article>
        </>
    );
}

CustomPage.layout = SiteLayout;
