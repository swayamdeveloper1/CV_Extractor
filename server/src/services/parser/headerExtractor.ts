export function getHeaderLines(text: string): string[] {
    return text
        .split("\n")
        .map(l => l.trim())
        .filter(Boolean)
        .slice(0, 30);
}