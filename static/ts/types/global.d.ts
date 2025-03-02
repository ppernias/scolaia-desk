interface Window {
    marked: {
        parse: (text: string, options?: any) => string;
        setOptions: (options: any) => void;
    };
    bootstrap: {
        Modal: {
            getInstance: (element: HTMLElement) => any;
            new(element: HTMLElement): any;
        };
        Tooltip: {
            getInstance: (element: HTMLElement) => any;
            new(element: HTMLElement): any;
        };
    };
    fetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
}