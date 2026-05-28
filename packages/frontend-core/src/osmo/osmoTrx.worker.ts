import { initControl } from '@websdr/frontend-core/webusb';
import { initOsmo } from '@/osmo/osmo'
import { OsmoTrxWorker } from '@/osmo/osmoTrxWorker'

let osmoTrxWorker: OsmoTrxWorker | undefined = undefined;

self.onmessage = async (event) => {
    const msg = event.data;
    let ret: number = -1;
    let err: string | undefined = undefined;

    if (globalThis.debug_mode) console.log('Message from OsmoTrxManager', msg);
    switch (msg.type) {
        case 'START':
            await initOsmo();
            await initControl();
            if (globalThis.osmo !== undefined && osmoTrxWorker === undefined && msg.config !== undefined) {
                osmoTrxWorker = new OsmoTrxWorker({ worker: self, ...JSON.parse(msg.config) });
            }
            if (globalThis.webUsbDeviceManager === undefined) {
                postMessage({ type: msg.type, id: msg.id, res: 'error', err: 'webUsbDeviceManager is not defined' })
                return;
            }
            osmoTrxWorker?.start();
            if (globalThis.debug_mode) console.log('OsmoTrxManager.START', globalThis.webUsbDeviceManager, globalThis.osmoTrxModule)
            postMessage({ type: msg.type, id: msg.id, res: globalThis.webUsbDeviceManager !== undefined && globalThis.osmoTrxModule !== undefined && osmoTrxWorker !== undefined ? 'ok' : 'error' })
            break;
        case 'STOP':
            osmoTrxWorker?.stop();
            if (globalThis.debug_mode) console.log('OsmoTrxManager.STOP', globalThis.webUsbDeviceManager, globalThis.osmoTrxModule)
            postMessage({ type: msg.type, id: msg.id, res: globalThis.webUsbDeviceManager !== undefined && globalThis.osmoTrxModule !== undefined ? 'ok' : 'error' })
            break;
        case 'OPEN_BTS':
            if (globalThis.debug_mode) console.log('OsmoTrxManager.OPEN_BTS', msg)
            if (osmoTrxWorker !== undefined) {
                ret = osmoTrxWorker!.openBts(msg.bts, msg.band, msg.arfcn, msg.ip_access_uid, msg.osmux_port) ?? -1;
            }
            err = ret < 0 ? `error opening a bts (band = ${msg.band}, ARFCN = ${msg.arfcn}, ip_access_uid = ${msg.ip_access_uid}, osmux_port = ${msg.osmux_port})` : undefined;
            postMessage({ type: msg.type, id: msg.id, res: (ret >= 0 ? 'ok' : 'error'), ret: ret, err: err })
            break;
        case 'OPEN_USB':
            await initControl();
            if (globalThis.debug_mode) console.log('OsmoTrxManager.OPEN_USB', msg)
            if (osmoTrxWorker !== undefined) {
                await osmoTrxWorker!.openUsbByVidPid(msg.vendorId, msg.productId)
                ret = osmoTrxWorker!.fd;
            }
            err = ret < 0 ? `error opening a webusb device (vid = 0x${msg.vendorId.toString(16)}, pid = 0x${msg.productId.toString(16)})` : undefined;
            postMessage({ type: msg.type, id: msg.id, res: (ret >= 0 ? 'ok' : 'error'), ret: ret, err: err })
            break;
        case 'OPEN_WS':
            if (globalThis.debug_mode) console.log('OsmoTrxManager.OPEN_WS', msg)
            if (osmoTrxWorker !== undefined) {
                const urls = JSON.parse(msg.urls);
                await osmoTrxWorker!.openBasicWS(urls);
                ret = 1;
            }
            err = ret < 0 ? `error opening web sockets (urls = ${msg.urls})` : undefined;
            postMessage({ type: msg.type, id: msg.id, res: (ret >= 0 ? 'ok' : 'error'), ret: ret, err: err })
            break;
        case 'CLOSE':
            osmoTrxWorker?.stop();
            osmoTrxWorker?.close();
            if (globalThis.debug_mode) console.log('OsmoTrxManager.CLOSE')
            if (!osmoTrxWorker || osmoTrxWorker.fd < 0) ret = 1;
            err = ret < 0 ? `error closing a webusb device and wsb sockets` : undefined;
            postMessage({ type: msg.type, id: msg.id, res: (ret >= 0 ? 'ok' : 'error'), ret: ret, err: err })
            break;
        case 'CLOSE_USB':
            osmoTrxWorker?.stop();
            osmoTrxWorker?.closeUsb();
            if (globalThis.debug_mode) console.log('OsmoTrxManager.CLOSE_USB')
            if (!osmoTrxWorker || osmoTrxWorker.fd < 0) ret = 1;
            err = ret < 0 ? `error closing a webusb device` : undefined;
            postMessage({ type: msg.type, id: msg.id, res: (ret >= 0 ? 'ok' : 'error'), ret: ret, err: err })
            break;
        case 'CLOSE_WS':
            osmoTrxWorker?.stop();
            osmoTrxWorker?.closeWs();
            if (globalThis.debug_mode) console.log('OsmoTrxManager.CLOSE_WS')
            if (!osmoTrxWorker || osmoTrxWorker.fd < 0) ret = 1;
            err = ret < 0 ? `error closing web sockets` : undefined;
            postMessage({ type: msg.type, id: msg.id, res: (ret >= 0 ? 'ok' : 'error'), ret: ret, err: err })
            break;
        case 'GET_BTS_STATS':
            if (globalThis.debug_mode) console.log('OsmoTrxManager.GET_BTS_STATS', msg.group)
            globalThis.osmo?.getBtsStats(msg.group)
                .then(ret => postMessage({ type: msg.type, id: msg.id, res: 'ok', ret }))
                .catch(err => postMessage({ type: msg.type, id: msg.id, res: 'error', err: String(err?.message || err) }))
            break;
        case 'SET_PARAMETER':
            if (globalThis.debug_mode) console.log('OsmoTrxManager.SET_PARAMETER', msg.param, '=', msg.value)
            if (osmoTrxWorker?.setParameter(msg.param, JSON.parse(msg.value)))
                ret = 1;
            err = ret < 0 ? `Error changing parameter ${msg.param} to value ${msg.value}` : undefined;
            postMessage({ type: msg.type, id: msg.id, res: (ret >= 0 ? 'ok' : 'error'), ret: ret, err: err })
            break;

        default:
            console.error(`OsmoTrxWorker: Unknown message ${msg} was received`)
    }
}
