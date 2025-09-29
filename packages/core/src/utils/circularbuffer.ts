export class CircularBuffer<T = any> {
    [index: number]: T;

    protected _bufferLen: number;
    protected _buffer: Array<T>;
    protected _bufferHead = 0;
    protected _bufferTail = 0;
    protected _bufferFull = false;
    onChangeSize: () => void = () => void {};

    constructor(len: number) {
        this._bufferLen = len;
        this._buffer = new Array<T>(this._bufferLen);

        return new Proxy(this, {
            set: function (target: CircularBuffer<T>, name: PropertyKey, value: any) {
                const index: number = (typeof name == 'string' ? parseInt(name) : NaN);
                if (!isNaN(index)) {
                    target.set(index, value);
                } else {
                    target[name as keyof CircularBuffer<T>] = value;
                }
                return true;
            },
            get: function (target: CircularBuffer<T>, name: PropertyKey) {
                const index: number = (typeof name == 'string' ? parseInt(name) : NaN);
                if (!isNaN(index)) {
                    return target.get(index);
                }
                return target[name as keyof CircularBuffer<T>];
            }
        });
    }

    clear() {
        this._bufferHead = 0;
        this._bufferTail = 0;
        this._bufferFull = false;
        this.onChangeSize();
    }

    capacity() {
        return this._bufferLen;
    }

    size() {
        if (this._bufferFull)
            return this._bufferLen;
        if (this._bufferHead <= this._bufferTail)
            return this._bufferTail - this._bufferHead;
        return this._bufferTail + this._bufferLen - this._bufferHead;
    }

    getRawBuffer() {
        return this._buffer;
    }

    getHead() {
        return this._bufferHead;
    }

    getTail() {
        return this._bufferTail;
    }

    isFull() {
        return this._bufferFull;
    }

    isEmpty() {
        return this._bufferHead == this._bufferTail && !this._bufferFull;
    }

    checkIndex(index: number) {
        if (this._bufferFull)
            return (0 <= index && index < this._bufferLen);
        if (this._bufferHead <= this._bufferTail)
            return (this._bufferHead <= index && index < this._bufferTail);
        return (0 <= index && index < this._bufferTail || this._bufferHead <= index && index < this._bufferLen);
    }

    push_front(val: T) {
        if (this._bufferFull) this.pop_back();
        if (--this._bufferHead < 0) this._bufferHead = this._bufferLen - 1;
        this._bufferFull = this._bufferHead === this._bufferTail;
        this._buffer[this._bufferHead] = val;
        this.onChangeSize();
    }

    push_back(val: T) {
        if (this._bufferFull) this.pop_front();
        this._buffer[this._bufferTail] = val;
        this._bufferTail = (this._bufferTail + 1) % this._bufferLen;
        this._bufferFull = this._bufferHead === this._bufferTail;
        this.onChangeSize();
    }

    front() {
        return this._buffer[this._bufferHead];
    }

    back() {
        return this._buffer[this._bufferTail > 0 ? this._bufferTail - 1 : this._bufferLen - 1];
    }

    set(index: number, val: T) {
        const tabIndex = (this._bufferHead + index) % this._bufferLen;
        if (!this.checkIndex(tabIndex))
            throw new Error(`circularbuffer.set: index ${index} converted to table index ${tabIndex} out of range`);
        this._buffer[tabIndex] = val;
    }

    get(index: number) {
        const tabIndex = (this._bufferHead + index) % this._bufferLen;
        if (!this.checkIndex(tabIndex))
            throw new Error(`circularbuffer.get: index ${index} converted to table index ${tabIndex} out of range`);
        return this._buffer[tabIndex];
    }

    pop_front(cnt: number = 1) {
        if (cnt < 1) return;
        const cntBiggerSize = (cnt >= this.size());
        this._bufferHead = (this._bufferHead + cnt) % this._bufferLen;
        if (cntBiggerSize)
            this._bufferTail = this._bufferHead;
        this._bufferFull = false;
        this.onChangeSize();
    }

    pop_back(cnt: number = 1) {
        if (cnt < 1) return;
        const cntBiggerSize = (cnt >= this.size());
        cnt = cnt % this._bufferLen;
        if (this._bufferTail - cnt < 0)
            this._bufferTail = this._bufferLen - (cnt - this._bufferTail);
        else
            this._bufferTail -= cnt;
        if (cntBiggerSize)
            this._bufferHead = this._bufferTail;
        this._bufferFull = false;
        this.onChangeSize();
    }

    alloc_front(cnt: number = 1) {
        if (cnt < 1) return;
        const free = this.capacity() - this.size();
        if (free < cnt) {
            this.pop_back(cnt - free);
            this._bufferHead = this._bufferTail;
        } else {
            if (this._bufferHead - cnt < 0)
                this._bufferHead = this._bufferLen - (cnt - this._bufferHead);
            else
                this._bufferHead -= cnt;
        }
        this._bufferFull = this._bufferHead === this._bufferTail;
        this.onChangeSize();
    }

    alloc_back(cnt: number = 1) {
        if (cnt < 1) return;
        const free = this.capacity() - this.size();
        if (free < cnt) {
            this.pop_front(cnt - free);
            this._bufferTail = this._bufferHead;
        } else {
            this._bufferTail = (this._bufferTail + cnt) % this._bufferLen
        }
        this._bufferFull = this._bufferHead === this._bufferTail
        this.onChangeSize();
    }

    async waitForChangeSize(): Promise<void> {
        return new Promise(resolve => {
            this.onChangeSize = function () {
                resolve();
                this.onChangeSize = () => void {};
            }
        })
    }
}
