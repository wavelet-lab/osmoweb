import { describe, it, expect } from 'vitest';
import { containsAnySubstr } from '@/utils/stringUtils';

describe('containsAnySubstr', () => {
    it('returns false when str is undefined or null', () => {
        expect(containsAnySubstr(undefined, 'a')).toBe(false);
        expect(containsAnySubstr(null, 'a')).toBe(false);
    });

    it('returns false when substrs is undefined or null', () => {
        expect(containsAnySubstr('text', undefined)).toBe(false);
        expect(containsAnySubstr('text', null)).toBe(false);
    });

    it('returns false for empty string as str', () => {
        expect(containsAnySubstr('', 'a')).toBe(false);
    });

    it('handles single substring (non-array) and is case-insensitive by default', () => {
        expect(containsAnySubstr('Hello World', 'hello')).toBe(true);
        expect(containsAnySubstr('Hello World', 'WORLD')).toBe(true);
    });

    it('respects caseSensitive = true', () => {
        expect(containsAnySubstr('Hello World', 'hello', true)).toBe(false);
        expect(containsAnySubstr('Hello World', 'World', true)).toBe(true);
    });

    it('accepts array of substrings and returns true if any matches', () => {
        expect(containsAnySubstr('abc def', ['x', 'DEF', 'y'])).toBe(true);
    });

    it('returns false when none of the substrings match', () => {
        expect(containsAnySubstr('abcdef', ['x', 'y', 'z'])).toBe(false);
    });

    it('trims substrings and ignores empty/null/undefined substrings in the array', () => {
        const arr = [undefined, null, '   ', '  def  ', 'x'];
        expect(containsAnySubstr('abcdef', arr)).toBe(true); // 'def' matches after trim
        expect(containsAnySubstr('abcdef', [undefined, null, '   '])).toBe(false); // all ignored
    });

    it('does not trim the main string but still matches when substring trimmed', () => {
        // main string has surrounding spaces but contains 'foo' sequence
        expect(containsAnySubstr('  foo  ', ' foo ')).toBe(true);
    });
});