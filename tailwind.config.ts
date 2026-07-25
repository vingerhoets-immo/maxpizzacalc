import type { Config } from 'tailwindcss';
export default { content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'], theme: { extend: { fontFamily: { display: ['Archivo Black', 'sans-serif'], body: ['Nunito', 'sans-serif'] } } }, plugins: [] } satisfies Config;
