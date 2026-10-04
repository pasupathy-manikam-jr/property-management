import type { Auth } from '@/types/auth';

export type GlobalSettings = {
    companyName: string;
    dateFormat: string;
    timeFormat: string;
    currencySymbol: string;
    decimalFormat: number;
    decimalSeparator: string;
    thousandsSeparator: string;
    currencySymbolPosition: 'before' | 'after';
    currencySymbolSpace: boolean;
};

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            sidebarOpen: boolean;
            globalSettings: GlobalSettings;
            locale: string;
            locales: Record<string, [name: string, countryCode: string]>;
            translationsVersion: string;
            [key: string]: unknown;
        };
    }
}
