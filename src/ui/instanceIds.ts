let nextId = 0;

export function createUiInstanceId(prefix: string): string {
    nextId += 1;
    return `${prefix}-${nextId}`;
}
