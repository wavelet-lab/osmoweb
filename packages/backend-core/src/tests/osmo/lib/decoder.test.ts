import { describe, test, expect } from 'vitest'
import { encoder } from '@/osmo/lib/decoder'

describe('encoder', () => {
    test('should return a function that encodes strings to Uint8Array', () => {
        const encode = encoder()
        expect(typeof encode).toBe('function')
    })

    test('should encode basic ASCII string correctly', () => {
        const encode = encoder()
        const result = encode('hello')

        expect(result).toBeInstanceOf(Uint8Array)
        expect(Array.from(result)).toEqual([104, 101, 108, 108, 111])
    })

    test('should encode empty string to empty Uint8Array', () => {
        const encode = encoder()
        const result = encode('')

        expect(result).toBeInstanceOf(Uint8Array)
        expect(result.length).toBe(0)
    })

    test('should handle undefined input', () => {
        const encode = encoder()
        const result = encode(undefined)

        expect(result).toBeInstanceOf(Uint8Array)
        expect(result.length).toBe(0)
        expect(Array.from(result)).toEqual([])
    })

    test('should encode Unicode characters correctly', () => {
        const encode = encoder()
        const result = encode('café')

        expect(result).toBeInstanceOf(Uint8Array)
        // 'café' in UTF-8: c=99, a=97, f=102, é=195,169
        expect(Array.from(result)).toEqual([99, 97, 102, 195, 169])
    })

    test('should encode emoji correctly', () => {
        const encode = encoder()
        const result = encode('🚀')

        expect(result).toBeInstanceOf(Uint8Array)
        // 🚀 in UTF-8: [240, 159, 154, 128]
        expect(Array.from(result)).toEqual([240, 159, 154, 128])
    })

    test('should create reusable encoder instance', () => {
        const encode = encoder()
        const result1 = encode('test')
        const result2 = encode('test')

        expect(Array.from(result1)).toEqual(Array.from(result2))
        expect(Array.from(result1)).toEqual([116, 101, 115, 116])
    })

    test('should handle special characters and newlines', () => {
        const encode = encoder()
        const result = encode('hello\nworld\t!')

        expect(result).toBeInstanceOf(Uint8Array)
        // h=104, e=101, l=108, l=108, o=111, \n=10, w=119, o=111, r=114, l=108, d=100, \t=9, !=33
        expect(Array.from(result)).toEqual([104, 101, 108, 108, 111, 10, 119, 111, 114, 108, 100, 9, 33])
    })

    test('should handle long strings', () => {
        const encode = encoder()
        const longString = 'a'.repeat(1000)
        const result = encode(longString)

        expect(result).toBeInstanceOf(Uint8Array)
        expect(result.length).toBe(1000)
        expect(result.every(byte => byte === 97)).toBe(true) // All 'a' characters (ASCII 97)
    })
})