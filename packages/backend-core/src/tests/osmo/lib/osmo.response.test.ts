import { describe, test, expect, vi, beforeEach } from 'vitest'
import { OsmoResponse } from '@/osmo/lib/osmo.response'
import type { LoggerInterface } from '@osmoweb/core/utils'
import type { CommonOsmoResponse } from '@/osmo/lib/protocol.types'

describe('OsmoResponse', () => {
    let mockLogger: LoggerInterface
    let responseFunc: ReturnType<typeof OsmoResponse>

    beforeEach(() => {
        mockLogger = {
            log: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
            debug: vi.fn(),
        }
        responseFunc = OsmoResponse(mockLogger)
    })

    test('should return a function', () => {
        expect(typeof responseFunc).toBe('function')
    })

    test('should create response with Buffer ID and simple object', () => {
        const id = Buffer.from([1, 2, 3, 4])
        const response: CommonOsmoResponse = { event: 'lock-bts', id: 0x01020304, result: { code: 0 } };

        const result = responseFunc(id, response)

        expect(result).toBeInstanceOf(Uint8Array)
        expect(result.slice(0, 4)).toEqual(new Uint8Array([1, 2, 3, 4]))

        const messageBytes = result.slice(4)
        const messageStr = new TextDecoder().decode(messageBytes)
        expect(JSON.parse(messageStr)).toEqual(response)

        expect(mockLogger.debug).toHaveBeenCalledWith('Res: {"event":"lock-bts","id":16909060,"result":{"code":0}}')
    })
})