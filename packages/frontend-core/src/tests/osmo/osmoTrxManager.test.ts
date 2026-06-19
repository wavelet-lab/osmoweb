import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadFile } from '@websdr/frontend-core/utils';
import {
    getOsmoTrxManagerInstance,
    OsmoTrxManagerWorker,
} from '@/osmo/osmoTrxManager';

vi.mock('@websdr/frontend-core/utils', () => ({
    downloadFile: vi.fn(),
}));

type WorkerMessage = {
    type: string;
    id?: number;
    [key: string]: unknown;
};

class FakeWorker {
    readonly messages: WorkerMessage[] = [];
    readonly addEventListener = vi.fn((type: string, listener: EventListener) => {
        this.listeners.set(type, listener);
    });
    readonly terminate = vi.fn();
    private readonly listeners = new Map<string, EventListener>();

    postMessage(message: WorkerMessage): void {
        this.messages.push(message);
    }

    respond(message: WorkerMessage, response: Record<string, unknown> = {}): void {
        this.emit('message', {
            type: message.type,
            id: message.id,
            res: 'ok',
            ...response,
        });
    }

    fail(message: WorkerMessage, error: string): void {
        this.emit('message', {
            type: message.type,
            id: message.id,
            res: 'error',
            err: error,
        });
    }

    emit(type: string, data: unknown): void {
        const event = type === 'message' ? { data } as MessageEvent : data as Event;
        this.listeners.get(type)?.(event);
    }
}

class TestOsmoTrxManagerWorker extends OsmoTrxManagerWorker {
    setWorker(worker: FakeWorker): void {
        this._worker = worker as unknown as Worker;
        worker.addEventListener('message', this._onWorkerMessage);
        worker.addEventListener('error', this._onWorkerError);
    }

    receive(data: unknown): void {
        this.onWorkerMessage({ data } as MessageEvent);
    }
}

function latestMessage(worker: FakeWorker): WorkerMessage {
    const message = worker.messages.at(-1);
    if (!message) throw new Error('Expected the manager to post a worker message');
    return message;
}

async function expectSuccessfulRequest<T>(
    worker: FakeWorker,
    request: Promise<T>,
    expectedMessage: Record<string, unknown>,
    response?: T,
): Promise<void> {
    const message = latestMessage(worker);
    expect(message).toMatchObject(expectedMessage);
    expect(message.id).toEqual(expect.any(Number));
    worker.respond(message, { ret: response });
    await expect(request).resolves.toEqual(response);
}

describe('OsmoTrxManagerWorker', () => {
    let manager: TestOsmoTrxManagerWorker;
    let worker: FakeWorker;

    beforeEach(() => {
        manager = new TestOsmoTrxManagerWorker();
        worker = new FakeWorker();
        manager.setWorker(worker);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('returns a single shared manager instance', () => {
        expect(getOsmoTrxManagerInstance()).toBe(getOsmoTrxManagerInstance());
        expect(getOsmoTrxManagerInstance()).toBeInstanceOf(OsmoTrxManagerWorker);
    });

    it('opens a BTS with all connection parameters', async () => {
        await expectSuccessfulRequest(
            worker,
            manager.open_bts(2, 'GSM900', 62, 'unit-1', 1984),
            {
                type: 'OPEN_BTS',
                bts: 2,
                band: 'GSM900',
                arfcn: 62,
                ip_access_uid: 'unit-1',
                osmux_port: 1984,
            },
            7,
        );
    });

    it('opens USB only when both identifiers are provided', async () => {
        await expect(manager.open_usb()).resolves.toBe(-1);
        await expect(manager.open_usb(0x1234)).resolves.toBe(-1);
        expect(worker.messages).toHaveLength(0);

        await expectSuccessfulRequest(
            worker,
            manager.open_usb(0x1234, 0x5678),
            { type: 'OPEN_USB', vendorId: 0x1234, productId: 0x5678 },
            9,
        );
    });

    it('serializes WebSocket URLs when opening the transport', async () => {
        const urls = { control: 'wss://example.test/control' };

        await expectSuccessfulRequest(
            worker,
            manager.open_ws(urls),
            { type: 'OPEN_WS', urls: JSON.stringify(urls) },
            true,
        );
    });

    it.each([
        ['close_usb', 'CLOSE_USB'],
        ['close_ws', 'CLOSE_WS'],
        ['close', 'CLOSE'],
    ] as const)('sends %s requests', async (method, type) => {
        await expectSuccessfulRequest(worker, manager[method](), { type });
    });

    it('requests BTS statistics', async () => {
        await expectSuccessfulRequest(
            worker,
            manager.getBtsStats('rate-counters'),
            { type: 'GET_BTS_STATS', group: 'rate-counters' },
            '{"rate":1}',
        );
    });

    it('serializes parameter values', async () => {
        const value = { enabled: true };

        await expectSuccessfulRequest(
            worker,
            manager.setParameter('feature', value),
            { type: 'SET_PARAMETER', param: 'feature', value: JSON.stringify(value) },
        );
    });

    it('rejects requests rejected by the worker', async () => {
        const request = manager.getBtsStats('stats');
        const message = latestMessage(worker);

        worker.fail(message, 'stats unavailable');

        await expect(request).rejects.toBe('stats unavailable');
    });

    it.each([
        ['getBtsStats', () => new OsmoTrxManagerWorker().getBtsStats('stats')],
        ['setParameter', () => new OsmoTrxManagerWorker().setParameter('key', true)],
        ['start', () => new OsmoTrxManagerWorker().start()],
        ['stop', () => new OsmoTrxManagerWorker().stop()],
    ])('rejects %s when the worker is not running', async (_name, request) => {
        await expect(request()).rejects.toThrow('OsmoTrxManager: worker is not running');
    });

    it('starts and stops the worker runtime', async () => {
        const onChangeParameter = vi.fn();
        manager.onChangeParameter = onChangeParameter;

        const startRequest = manager.start({ bts: 3 });
        const startMessage = latestMessage(worker);
        expect(startMessage).toMatchObject({
            type: 'START',
            config: JSON.stringify({ bts: 3 }),
        });
        worker.respond(startMessage);
        await expect(startRequest).resolves.toBeUndefined();
        expect(onChangeParameter).toHaveBeenCalledWith('worker_started', true);

        const stopRequest = manager.stop();
        const stopMessage = latestMessage(worker);
        expect(stopMessage).toMatchObject({ type: 'STOP' });
        worker.respond(stopMessage);
        await expect(stopRequest).resolves.toBeUndefined();
        expect(onChangeParameter).toHaveBeenCalledWith('worker_started', false);
    });

    it('creates and initializes a module worker', async () => {
        const createdWorker = new FakeWorker();
        const WorkerConstructor = vi.fn(function (_url: URL, _options?: WorkerOptions) {
            return createdWorker;
        });
        vi.stubGlobal('Worker', WorkerConstructor);
        const newManager = new OsmoTrxManagerWorker();

        const request = newManager.startWorker({ bts: 4 });
        const message = latestMessage(createdWorker);

        expect(WorkerConstructor).toHaveBeenCalledOnce();
        expect(WorkerConstructor.mock.calls[0]?.[0]).toBeInstanceOf(URL);
        expect(String(WorkerConstructor.mock.calls[0]?.[0])).toContain('osmoTrx.worker.js');
        expect(WorkerConstructor.mock.calls[0]?.[1]).toEqual({ type: 'module' });
        expect(createdWorker.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
        expect(createdWorker.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
        expect(message).toMatchObject({
            type: 'START',
            config: JSON.stringify({ bts: 4 }),
        });

        createdWorker.respond(message);
        await expect(request).resolves.toBeUndefined();
    });

    it('stops and terminates the worker', async () => {
        const request = manager.stopWorker();
        const message = latestMessage(worker);

        expect(message).toMatchObject({ type: 'STOP' });
        expect(worker.terminate).not.toHaveBeenCalled();

        worker.respond(message);
        await expect(request).resolves.toBeUndefined();
        expect(worker.terminate).toHaveBeenCalledOnce();
        await expect(manager.stop()).rejects.toThrow('OsmoTrxManager: worker is not running');
    });

    it('forwards worker log and parameter events to callbacks', () => {
        manager.onWriteLog = vi.fn();
        manager.onLog = vi.fn();
        manager.onChangeParameter = vi.fn();
        const log = { level: 'info', message: 'ready' };

        manager.receive({ type: 'WRITE_LOG', msg: 'raw log' });
        manager.receive({ type: 'LOG', log });
        manager.receive({ type: 'PARAM_CHANGED', param: 'gain', value: 12 });

        expect(manager.onWriteLog).toHaveBeenCalledWith('raw log');
        expect(manager.onLog).toHaveBeenCalledWith(log);
        expect(manager.onChangeParameter).toHaveBeenCalledWith('gain', 12);
    });

    it('downloads buffers received from the worker', () => {
        const buffer = new Uint8Array([1, 2, 3]);

        manager.receive({ type: 'WRITE', buffer });

        expect(downloadFile).toHaveBeenCalledWith(buffer, 'write2usb.bin');
    });

    it('updates and flushes stream meter data', () => {
        const streamMeter = {
            config: { show_cloud_link: true },
            downloaded: 0,
            update: vi.fn(),
            flush: vi.fn(),
        };
        const meterManager = new TestOsmoTrxManagerWorker({
            streamMeterData: streamMeter as never,
        });

        meterManager.receive({
            type: 'METER_DATA',
            value: JSON.stringify({ _state: { downloaded: 10 } }),
        });
        expect(streamMeter.update).toHaveBeenCalledWith({ downloaded: 10 });

        meterManager.receive({
            type: 'METER_DATA',
            value: JSON.stringify({ config: {}, downloaded: 20 }),
        });
        expect(streamMeter.downloaded).toBe(20);
        expect(streamMeter.config).toEqual({ show_cloud_link: true });
        expect(streamMeter.flush).toHaveBeenCalledOnce();
    });

    it('reports unknown messages and worker errors', () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const error = { type: 'error', message: 'worker failed' } as unknown as ErrorEvent;

        manager.receive({ type: 'UNKNOWN' });
        worker.emit('error', error);

        expect(consoleError).toHaveBeenCalledWith(
            'OsmoTrxManager: Unknown message',
            { type: 'UNKNOWN' },
            'was received',
        );
        expect(consoleError).toHaveBeenCalledWith('OsmoTrx: Worker error: ', error);
    });
});
