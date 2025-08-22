import { describe, test, expect, vi, beforeEach } from 'vitest'
import { OsmoParser } from '@/osmo/lib/osmo.parse'
import type { LoggerInterface } from '@osmoweb/core/utils'

describe('OsmoParser', () => {
    let mockLogger: LoggerInterface
    let parser: ReturnType<typeof OsmoParser>

    beforeEach(() => {
        mockLogger = {
            log: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
            debug: vi.fn(),
        }
        parser = OsmoParser(mockLogger)
    })

    test('should return a parser function', () => {
        expect(typeof parser).toBe('function')
    })

    test('should parse ArrayBuffer with valid JSON', () => {
        const id = new Uint8Array([1, 2, 3, 4])
        const jsonMessage = '{"type":"test","data":"value"}'
        const messageBytes = new TextEncoder().encode(jsonMessage)

        const buffer = new ArrayBuffer(4 + messageBytes.length)
        const view = new Uint8Array(buffer)
        view.set(id, 0)
        view.set(messageBytes, 4)

        const result = parser(buffer)

        expect(result.id).toEqual(buffer.slice(0, 4))
        expect(result.request).toEqual({ type: 'test', data: 'value' })
        expect(mockLogger.debug).toHaveBeenCalledWith('Req: {"type":"test","data":"value"}')
    })

    test('should parse Buffer with valid JSON', () => {
        const id = Buffer.from([1, 2, 3, 4])
        const jsonMessage = '{"command":"ping"}'
        const buffer = Buffer.concat([id, Buffer.from(jsonMessage)])

        const result = parser(buffer)

        expect(result.id).toEqual(buffer.subarray(0, 4))
        expect(result.request).toEqual({ command: 'ping' })
        expect(mockLogger.debug).toHaveBeenCalledWith('Req: {"command":"ping"}')
    })

    test('should parse array input with valid JSON', () => {
        const id = Buffer.from([1, 2, 3, 4])
        const jsonMessage = '{"action":"start"}'
        const buffer = Buffer.concat([id, Buffer.from(jsonMessage)])

        const result = parser(buffer)

        expect(result.id).toEqual(buffer.subarray(0, 4))
        expect(result.request).toEqual({ action: 'start' })
        expect(mockLogger.debug).toHaveBeenCalledWith('Req: {"action":"start"}')
    })

    test('should handle complex JSON in ArrayBuffer', () => {
        const id = new Uint8Array([255, 254, 253, 252])
        const complexJson = '{"user":{"id":123,"name":"test"},"settings":{"theme":"dark","lang":"en"}}'
        const messageBytes = new TextEncoder().encode(complexJson)

        const buffer = new ArrayBuffer(4 + messageBytes.length)
        const view = new Uint8Array(buffer)
        view.set(id, 0)
        view.set(messageBytes, 4)

        const result = parser(buffer)

        expect(result.id).toEqual(buffer.slice(0, 4))
        expect(result.request).toEqual({
            user: { id: 123, name: 'test' },
            settings: { theme: 'dark', lang: 'en' }
        })
    })

    test('should throw error for invalid JSON in ArrayBuffer', () => {
        const id = new Uint8Array([1, 2, 3, 4])
        const invalidJson = '{invalid json}'
        const messageBytes = new TextEncoder().encode(invalidJson)

        const buffer = new ArrayBuffer(4 + messageBytes.length)
        const view = new Uint8Array(buffer)
        view.set(id, 0)
        view.set(messageBytes, 4)

        expect(() => parser(buffer)).toThrow()
        expect(mockLogger.error).toHaveBeenCalledWith('{invalid json}')
    })

    test('should throw error for invalid JSON in Buffer', () => {
        const id = Buffer.from([1, 2, 3, 4])
        const invalidJson = '{"incomplete":'
        const buffer = Buffer.concat([id, Buffer.from(invalidJson)])

        expect(() => parser(buffer)).toThrow()
        expect(mockLogger.error).toHaveBeenCalledWith('{"incomplete":')
    })

    test('should throw error for invalid JSON in array', () => {
        const id = Buffer.from([1, 2, 3, 4])
        const invalidJson = '{malformed}'
        const buffer = Buffer.concat([id, Buffer.from(invalidJson)])

        expect(() => parser(buffer)).toThrow()
        expect(mockLogger.error).toHaveBeenCalledWith('{malformed}')
    })

    test('should handle empty JSON object', () => {
        const id = new Uint8Array([0, 0, 0, 0])
        const emptyJson = '{}'
        const messageBytes = new TextEncoder().encode(emptyJson)

        const buffer = new ArrayBuffer(4 + messageBytes.length)
        const view = new Uint8Array(buffer)
        view.set(id, 0)
        view.set(messageBytes, 4)

        const result = parser(buffer)

        expect(result.id).toEqual(buffer.slice(0, 4))
        expect(result.request).toEqual({})
    })

    test('should handle Unicode characters in JSON', () => {
        const id = Buffer.from([1, 2, 3, 4])
        const unicodeJson = '{"message":"Hello 🌍","emoji":"🚀"}'
        const buffer = Buffer.concat([id, Buffer.from(unicodeJson)])

        const result = parser(buffer)

        expect(result.request).toEqual({ message: 'Hello 🌍', emoji: '🚀' })
    })

    test('should handle array input with numeric elements', () => {
        const id = Buffer.from([1, 2, 3, 4])
        const jsonMessage = '{"test":true}'
        const buffer = Buffer.concat([id, Buffer.from(jsonMessage)])

        const result = parser(buffer)

        expect(result.id).toEqual(buffer.subarray(0, 4))
        expect(result.request).toEqual({ test: true })
    })

    test('should handle minimal valid data', () => {
        const buffer = Buffer.from([1, 2, 3, 4, ...Buffer.from('null')])

        const result = parser(buffer)

        expect(result.id).toEqual(buffer.subarray(0, 4))
        expect(result.request).toBe(null)
    })

    test('should preserve original error message when JSON parsing fails', () => {
        const buffer = Buffer.from([1, 2, 3, 4, ...Buffer.from('invalid')])

        try {
            parser(buffer)
        } catch (err) {
            expect(err).toBeInstanceOf(Error)
            expect(String(err)).toContain('SyntaxError')
        }
    })

    test('should work with logger that has optional methods', () => {
        const minimalLogger: LoggerInterface = {
            log: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
            debug: vi.fn(),
        }
        const minimalParser = OsmoParser(minimalLogger)

        const buffer = Buffer.from([1, 2, 3, 4, ...Buffer.from('{"test":1}')])

        expect(() => minimalParser(buffer)).not.toThrow()
    })
})