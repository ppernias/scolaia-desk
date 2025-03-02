// Type definitions for marked.js
interface MarkedOptions {
    breaks?: boolean;
    gfm?: boolean;
    headerIds?: boolean;
    mangle?: boolean;
    [key: string]: any;
}

interface Marked {
    parse(text: string, options?: MarkedOptions): string;
    setOptions(options: MarkedOptions): void;
}

declare interface Window {
    marked: Marked;
}
