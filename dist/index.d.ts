interface LookupValue {
    color: string;
    data: string;
    ignoreCase: boolean;
}
declare class Searchbox {
    private _el;
    private _lookup;
    private _container;
    private _sb;
    private _dropDown;
    private _currentFocus;
    private validateConfig;
    private getCurrentSbText;
    private updateInputValue;
    private insertValueIntoSb;
    private onInput;
    private onKeydown;
    private setActive;
    private removeActive;
    private closeList;
    private setupSearchbox;
    private createLookup;
    constructor(el: HTMLInputElement, config: SearchboxConfig);
}
declare class SearchboxManager {
    private static _instance;
    private searchboxes;
    private constructor();
    static getInstance(): SearchboxManager;
    addSearchbox(el: HTMLInputElement, config: SearchboxConfig): void;
}
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
declare function segmentedSearchbox(el: HTMLInputElement, config: SearchboxConfig): void;
