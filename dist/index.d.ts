interface Value {
    data: string;
    text?: string;
}
interface ValueKind {
    name: string;
    color: string;
    values: ReadonlyArray<Value>;
    ignoreCase?: boolean;
}
interface SearchboxConfig {
    valueKinds: ReadonlyArray<ValueKind>;
}
export declare function initSearchbox(el: HTMLInputElement, config: SearchboxConfig): void;
export {};
