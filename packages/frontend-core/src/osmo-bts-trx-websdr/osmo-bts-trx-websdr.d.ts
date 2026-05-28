export interface OsmoTrxModule extends EmscriptenModule {
    /**
     * Pushes received IQ samples into osmo-bts.
     *
     * @param buffers Pointer to interleaved Int16 IQ samples in wasm memory.
     * @param samples Number of complex IQ samples.
     * @param underrun Non-zero when the RX stream had an overrun/underrun condition.
     * @param ts GSM frame/sample timestamp associated with the first sample.
     * @param skipsamples Number of leading samples to skip before processing.
     * @returns Native osmo-bts status code.
     */
    _osmobts_push_rx_short_vector(buffers: number, samples: number, underrun: number, ts: bigint, skipsamples: number): number;

    /**
     * Gets a pending TX IQ vector from osmo-bts.
     *
     * The arguments are pointers to output fields in wasm memory:
     * timestamp, sample buffer pointer, and skipped-packet count.
     *
     * @param timestamp Pointer to a 64-bit timestamp output.
     * @param samples Pointer to an output buffer pointer for Int16 IQ samples.
     * @param skippackets Pointer to an output skipped-packet counter.
     * @returns Number of samples/bytes available, or a negative errno-style status.
     */
    _osmobts_get_tx_short_vector(timestamp: number, samples: number, skippackets: number): number;

    /**
     * Initializes the osmo-bts runtime.
     *
     * @param cfg_file Pointer to a null-terminated ASCII config file path.
     * @returns Native osmo-bts status code.
     */
    _osmobts_init(cfg_file: number): number;

    /**
     * Applies runtime BTS configuration.
     *
     * @param band Pointer to a null-terminated ASCII GSM band name.
     * @param arfcn Absolute radio-frequency channel number.
     * @param ip_access_uid Pointer to a null-terminated ASCII IPA unit id.
     * @param osmux_port UDP port used for Osmux media.
     * @returns Native osmo-bts status code.
     */
    _osmobts_apply(band: number, arfcn: number, ip_access_uid: number, osmux_port: number): number;

    /**
     * Reads a named statistics group from osmo-bts.
     *
     * @param group Pointer to a null-terminated ASCII group name: "stats",
     *        "rate-counters", "bts", "trx", "transceiver", "websdr".
     * @param stats_buf Pointer to the output ASCII buffer.
     * @param max_len Maximum number of bytes available in stats_buf.
     * @returns Number of bytes written, or a negative errno-style status.
     */
    _osmobts_get_stats(group: number, stats_buf: number, max_len: number): number;

    /**
     * Pushes raw Osmux media data received from the WebSocket side.
     *
     * @param data Pointer to raw packet bytes in wasm memory.
     * @param len Packet length in bytes.
     * @returns Native osmo-bts status code.
     */
    _ws_osmux_push_raw_data(data: number, len: number): number;

    /**
     * Pushes raw IPA signalling data received from the WebSocket side.
     *
     * @param ts_nr IPA stream selector: 1 = OML, 2 = RSL.
     * @param data Pointer to raw packet bytes in wasm memory.
     * @param len Packet length in bytes.
     * @returns Native osmo-bts status code.
     */
    _ws_ipa_push_raw_data(ts_nr: number, data: number, len: number): number;

    /**
     * Reports RF SDR packet processing overruns to osmo-bts.
     * Called after each packet received from the RF SDR has been processed.
     *
     * @param frames Number of overruns detected while processing the packet.
     */
    _on_sched_timer(frames: number);

    /**
     * Calls an exported C function through Emscripten's runtime dispatcher.
     */
    ccall(func: string, ret_type: string, parm_types: Array<string>, parms: Array<any>, opts: Record<string, any>): any;

    /**
     * Reads a null-terminated ASCII string from wasm memory.
     */
    AsciiToString(buf: number): string;

    /**
     * Writes an ASCII string into wasm memory.
     */
    stringToAscii(str: string, buf: number);
}

declare const Module: EmscriptenModuleFactory<OsmoTrxModule>;
declare global {
    var osmoTrxModule: OsmoTrxModule;
}

export default Module;
