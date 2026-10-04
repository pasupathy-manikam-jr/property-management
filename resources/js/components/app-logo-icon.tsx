import type { SVGAttributes } from 'react';

// A house with a doorway: the app mark (also public/favicon.svg).
export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg {...props} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2.2 1.2 11.4h3.1v10.4h6.1v-6.3h3.2v6.3h6.1V11.4h3.1z" />
        </svg>
    );
}
