import { assert, test, expect, beforeEach } from 'vitest'
import { CircularBuffer } from '@/utils/circularbuffer'

interface Context {
    cbHT: CircularBuffer,    // Head < Tail && !isFull
    cbHTF: CircularBuffer,   // Head < Tail && isFull
    cbTH: CircularBuffer,    // Tail < Head && !isFull
    cbTHF: CircularBuffer    // Tail < Head && isFull
}

beforeEach(async (context: Context) => {
    // Setup buffer state: Head < Tail && !isFull
    // Expected: head=0, tail=2, size=2, [1, 2, undefined]
    context.cbHT = new CircularBuffer(3)
    context.cbHT.push_back(1)
    context.cbHT.push_back(2)

    // Setup buffer state: Head < Tail && isFull
    // Expected: head=0, tail=0, size=3, [1, 2, 3]
    context.cbHTF = new CircularBuffer(3)
    context.cbHTF.push_back(1)
    context.cbHTF.push_back(2)
    context.cbHTF.push_back(3)

    // Setup buffer state: Tail < Head && !isFull
    // Expected: head=1, tail=0, size=2, [3, 1, 2]
    context.cbTH = new CircularBuffer(3)
    context.cbTH.push_back(0)
    context.cbTH.push_back(1)
    context.cbTH.push_back(2)
    context.cbTH.push_back(3)
    context.cbTH.pop_back()

    // Setup buffer state: Tail < Head && isFull
    // Expected: head=1, tail=1, size=3, [3, 1, 2]
    context.cbTHF = new CircularBuffer(3)
    context.cbTHF.push_back(0)
    context.cbTHF.push_back(1)
    context.cbTHF.push_back(2)
    context.cbTHF.push_back(3)
})

test('push_back', async () => {
    const cb = new CircularBuffer(3);

    // Test initial empty state
    // Expected: empty buffer with capacity 3
    assert.deepEqual(cb.getRawBuffer(), [undefined, undefined, undefined])
    assert.equal(cb.getHead(), 0)
    assert.equal(cb.getTail(), 0)
    assert.equal(cb.isFull(), false)
    assert.equal(cb.capacity(), 3)
    assert.equal(cb.size(), 0)

    // Test first element insertion
    // Expected: element at index 0, tail moves to 1
    cb.push_back(1);
    assert.deepEqual(cb.getRawBuffer(), [1, undefined, undefined])
    assert.equal(cb.getHead(), 0)
    assert.equal(cb.getTail(), 1)
    assert.equal(cb.isFull(), false)
    assert.equal(cb.size(), 1)
    assert.equal(cb.get(0), 1)

    // Test second element insertion
    // Expected: element at index 1, tail moves to 2
    cb.push_back(2);
    assert.deepEqual(cb.getRawBuffer(), [1, 2, undefined])
    assert.equal(cb.getHead(), 0)
    assert.equal(cb.getTail(), 2)
    assert.equal(cb.isFull(), false)
    assert.equal(cb.size(), 2)
    assert.equal(cb.get(1), 2)

    // Test buffer becomes full
    // Expected: element at index 2, tail wraps to 0, buffer is full
    cb.push_back(3);
    assert.deepEqual(cb.getRawBuffer(), [1, 2, 3])
    assert.equal(cb.getHead(), 0)
    assert.equal(cb.getTail(), 0)
    assert.equal(cb.isFull(), true)
    assert.equal(cb.size(), 3)
    assert.equal(cb.get(2), 3)

    // Test overflow behavior
    // Expected: oldest element overwritten, head moves to maintain size
    cb.push_back(4);
    assert.deepEqual(cb.getRawBuffer(), [4, 2, 3])
    assert.equal(cb.getHead(), 1)
    assert.equal(cb.getTail(), 1)
    assert.equal(cb.isFull(), true)
    assert.equal(cb.size(), 3)
    assert.equal(cb.get(2), 4)
})

test('pop_back by 1', async () => {
    const cb = new CircularBuffer(3);
    cb.push_back(1)

    // Test buffer state before pop
    // Expected: one element, tail at position 1
    assert.deepEqual(cb.getRawBuffer(), [1, undefined, undefined])
    assert.equal(cb.getHead(), 0)
    assert.equal(cb.getTail(), 1)
    assert.equal(cb.isFull(), false)
    assert.equal(cb.size(), 1)

    // Test removing last element
    // Expected: buffer becomes empty, tail moves back to head
    cb.pop_back();
    assert.deepEqual(cb.getRawBuffer(), [1, undefined, undefined]) // Data remains but logically removed
    assert.equal(cb.getHead(), 0)
    assert.equal(cb.getTail(), 0)
    assert.equal(cb.isFull(), false)
    assert.equal(cb.size(), 0)
})

test('pop_back multi', async () => {
    const cb = new CircularBuffer(3);
    cb.push_back(1)
    cb.push_back(2)

    // Test buffer state with 2 elements
    // Expected: two elements, tail at position 2
    assert.deepEqual(cb.getRawBuffer(), [1, 2, undefined])
    assert.equal(cb.getHead(), 0)
    assert.equal(cb.getTail(), 2)
    assert.equal(cb.isFull(), false)
    assert.equal(cb.size(), 2)

    // Test removing multiple elements at once
    // Expected: buffer becomes empty
    cb.pop_back(2);
    assert.deepEqual(cb.getRawBuffer(), [1, 2, undefined])
    assert.equal(cb.getHead(), 0)
    assert.equal(cb.getTail(), 0)
    assert.equal(cb.isFull(), false)
    assert.equal(cb.size(), 0)

    // Test removing more elements than available
    // Expected: all elements removed, no errors
    cb.push_back(1)
    cb.push_back(2)
    assert.deepEqual(cb.getRawBuffer(), [1, 2, undefined])
    assert.equal(cb.getHead(), 0)
    assert.equal(cb.getTail(), 2)
    assert.equal(cb.isFull(), false)
    assert.equal(cb.size(), 2)

    cb.pop_back(200);
    assert.deepEqual(cb.getRawBuffer(), [1, 2, undefined])
    assert.equal(cb.getHead(), 0)
    assert.equal(cb.getTail(), 0)
    assert.equal(cb.isFull(), false)
    assert.equal(cb.size(), 0)
})

test('alloc_back by 1', async () => {
    const cb = new CircularBuffer(3);

    // Test allocating space without setting value
    // Expected: size increases but no value is set
    cb.alloc_back()
    assert.deepEqual(cb.getRawBuffer(), [undefined, undefined, undefined])
    assert.equal(cb.getHead(), 0)
    assert.equal(cb.getTail(), 1)
    assert.equal(cb.isFull(), false)
    assert.equal(cb.size(), 1)

    // Test second allocation
    // Expected: tail moves to position 2
    cb.alloc_back();
    assert.deepEqual(cb.getRawBuffer(), [undefined, undefined, undefined])
    assert.equal(cb.getHead(), 0)
    assert.equal(cb.getTail(), 2)
    assert.equal(cb.isFull(), false)
    assert.equal(cb.size(), 2)

    // Test allocation makes buffer full
    // Expected: buffer becomes full, tail wraps to 0
    cb.alloc_back();
    assert.deepEqual(cb.getRawBuffer(), [undefined, undefined, undefined])
    assert.equal(cb.getHead(), 0)
    assert.equal(cb.getTail(), 0)
    assert.equal(cb.isFull(), true)
    assert.equal(cb.size(), 3)

    // Test allocation on full buffer
    // Expected: head moves to maintain capacity
    cb.alloc_back();
    assert.deepEqual(cb.getRawBuffer(), [undefined, undefined, undefined])
    assert.equal(cb.getHead(), 1)
    assert.equal(cb.getTail(), 1)
    assert.equal(cb.isFull(), true)
    assert.equal(cb.size(), 3)
})

test('alloc_back multi', async () => {
    const cb = new CircularBuffer(3);

    // Test allocating more space than capacity
    // Expected: buffer becomes full with head/tail adjusted
    cb.alloc_back(4)
    assert.deepEqual(cb.getRawBuffer(), [undefined, undefined, undefined])
    assert.equal(cb.getHead(), 1)
    assert.equal(cb.getTail(), 1)
    assert.equal(cb.isFull(), true)
    assert.equal(cb.size(), 3)
})

test('push_front', async () => {
    const cb = new CircularBuffer(3);

    // Test initial state
    // Expected: empty buffer
    assert.deepEqual(cb.getRawBuffer(), [undefined, undefined, undefined])
    assert.equal(cb.getHead(), 0)
    assert.equal(cb.getTail(), 0)
    assert.equal(cb.isFull(), false)
    assert.equal(cb.capacity(), 3)
    assert.equal(cb.size(), 0)

    // Test first front insertion
    // Expected: element at last position, head moves to 2
    cb.push_front(1);
    assert.deepEqual(cb.getRawBuffer(), [undefined, undefined, 1])
    assert.equal(cb.getHead(), 2)
    assert.equal(cb.getTail(), 0)
    assert.equal(cb.isFull(), false)
    assert.equal(cb.size(), 1)

    // Test second front insertion
    // Expected: element at position 1, head moves to 1
    cb.push_front(2);
    assert.deepEqual(cb.getRawBuffer(), [undefined, 2, 1])
    assert.equal(cb.getHead(), 1)
    assert.equal(cb.getTail(), 0)
    assert.equal(cb.isFull(), false)
    assert.equal(cb.size(), 2)

    // Test buffer becomes full
    // Expected: element at position 0, buffer is full
    cb.push_front(3);
    assert.deepEqual(cb.getRawBuffer(), [3, 2, 1])
    assert.equal(cb.getHead(), 0)
    assert.equal(cb.getTail(), 0)
    assert.equal(cb.isFull(), true)
    assert.equal(cb.size(), 3)

    // Test overflow from front
    // Expected: tail element overwritten, tail moves
    cb.push_front(4);
    assert.deepEqual(cb.getRawBuffer(), [3, 2, 4])
    assert.equal(cb.getHead(), 2)
    assert.equal(cb.getTail(), 2)
    assert.equal(cb.isFull(), true)
    assert.equal(cb.size(), 3)
})

test('push_front, Head > 0', async () => {
    const cb = new CircularBuffer(3);

    // Setup buffer with head at position 1
    // Expected: empty buffer with head/tail at position 1
    cb.push_front(undefined);
    cb.push_front(undefined);
    cb.pop_back(2);
    assert.deepEqual(cb.getRawBuffer(), [undefined, undefined, undefined])
    assert.equal(cb.getHead(), 1)
    assert.equal(cb.getTail(), 1)
    assert.equal(cb.isFull(), false)
    assert.equal(cb.capacity(), 3)
    assert.equal(cb.size(), 0)

    // Test front insertion when head > 0
    // Expected: element at position 0, head wraps to 0
    cb.push_front(1);
    assert.deepEqual(cb.getRawBuffer(), [1, undefined, undefined])
    assert.equal(cb.getHead(), 0)
    assert.equal(cb.getTail(), 1)
    assert.equal(cb.isFull(), false)
    assert.equal(cb.size(), 1)

    // Test second front insertion
    // Expected: element at position 2, head moves to 2
    cb.push_front(2);
    assert.deepEqual(cb.getRawBuffer(), [1, undefined, 2])
    assert.equal(cb.getHead(), 2)
    assert.equal(cb.getTail(), 1)
    assert.equal(cb.isFull(), false)
    assert.equal(cb.size(), 2)

    // Test buffer becomes full
    // Expected: buffer is full with wrapped positioning
    cb.push_front(3);
    assert.deepEqual(cb.getRawBuffer(), [1, 3, 2])
    assert.equal(cb.getHead(), 1)
    assert.equal(cb.getTail(), 1)
    assert.equal(cb.isFull(), true)
    assert.equal(cb.size(), 3)

    // Test overflow behavior
    // Expected: tail element overwritten
    cb.push_front(4);
    assert.deepEqual(cb.getRawBuffer(), [4, 3, 2])
    assert.equal(cb.getHead(), 0)
    assert.equal(cb.getTail(), 0)
    assert.equal(cb.isFull(), true)
    assert.equal(cb.size(), 3)
})

test('pop_front by 1', async () => {
    const cb = new CircularBuffer(3);
    cb.push_back(1)

    // Test buffer state before pop_front
    // Expected: one element from back
    assert.deepEqual(cb.getRawBuffer(), [1, undefined, undefined])
    assert.equal(cb.getHead(), 0)
    assert.equal(cb.getTail(), 1)
    assert.equal(cb.isFull(), false)
    assert.equal(cb.size(), 1)

    // Test removing from front
    // Expected: buffer becomes empty, head moves forward
    cb.pop_front();
    assert.deepEqual(cb.getRawBuffer(), [1, undefined, undefined])
    assert.equal(cb.getHead(), 1)
    assert.equal(cb.getTail(), 1)
    assert.equal(cb.isFull(), false)
    assert.equal(cb.size(), 0)
})

test('pop_front multi', async () => {
    const cb = new CircularBuffer(3);
    cb.push_back(1)
    cb.push_back(2)

    // Test buffer with 2 elements
    // Expected: elements [1, 2]
    assert.deepEqual(cb.getRawBuffer(), [1, 2, undefined])
    assert.equal(cb.getHead(), 0)
    assert.equal(cb.getTail(), 2)
    assert.equal(cb.isFull(), false)
    assert.equal(cb.size(), 2)

    // Test removing multiple elements from front
    // Expected: buffer becomes empty, head moves to tail position
    cb.pop_front(2);
    assert.deepEqual(cb.getRawBuffer(), [1, 2, undefined])
    assert.equal(cb.getHead(), 2)
    assert.equal(cb.getTail(), 2)
    assert.equal(cb.isFull(), false)
    assert.equal(cb.size(), 0)

    // Test adding after pop_front with wrapped indices
    // Expected: elements added at wrapped positions
    cb.push_back(1)
    cb.push_back(2)
    assert.deepEqual(cb.getRawBuffer(), [2, 2, 1])
    assert.equal(cb.getHead(), 2)
    assert.equal(cb.getTail(), 1)
    assert.equal(cb.isFull(), false)
    assert.equal(cb.size(), 2)

    // Test removing more than available
    // Expected: all elements removed gracefully
    cb.pop_front(200);
    assert.deepEqual(cb.getRawBuffer(), [2, 2, 1])
    assert.equal(cb.getHead(), 1)
    assert.equal(cb.getTail(), 1)
    assert.equal(cb.isFull(), false)
    assert.equal(cb.size(), 0)
})

test('alloc_front by 1', async () => {
    const cb = new CircularBuffer(3);

    // Test allocating space at front
    // Expected: size increases, head moves backward
    cb.alloc_front()
    assert.deepEqual(cb.getRawBuffer(), [undefined, undefined, undefined])
    assert.equal(cb.getHead(), 2)
    assert.equal(cb.getTail(), 0)
    assert.equal(cb.isFull(), false)
    assert.equal(cb.size(), 1)

    // Test second front allocation
    // Expected: head moves to position 1
    cb.alloc_front();
    assert.deepEqual(cb.getRawBuffer(), [undefined, undefined, undefined])
    assert.equal(cb.getHead(), 1)
    assert.equal(cb.getTail(), 0)
    assert.equal(cb.isFull(), false)
    assert.equal(cb.size(), 2)

    // Test allocation makes buffer full
    // Expected: buffer becomes full
    cb.alloc_front();
    assert.deepEqual(cb.getRawBuffer(), [undefined, undefined, undefined])
    assert.equal(cb.getHead(), 0)
    assert.equal(cb.getTail(), 0)
    assert.equal(cb.isFull(), true)
    assert.equal(cb.size(), 3)

    // Test allocation on full buffer
    // Expected: tail moves to maintain capacity
    cb.alloc_front();
    assert.deepEqual(cb.getRawBuffer(), [undefined, undefined, undefined])
    assert.equal(cb.getHead(), 2)
    assert.equal(cb.getTail(), 2)
    assert.equal(cb.isFull(), true)
    assert.equal(cb.size(), 3)
})

test('alloc_front multi', async () => {
    const cb = new CircularBuffer(3);

    // Test allocating more space than capacity from front
    // Expected: buffer becomes full with proper head/tail positioning
    cb.alloc_front(4)
    assert.deepEqual(cb.getRawBuffer(), [undefined, undefined, undefined])
    assert.equal(cb.getHead(), 2)
    assert.equal(cb.getTail(), 2)
    assert.equal(cb.isFull(), true)
    assert.equal(cb.size(), 3)
})

test('test context', async (context: Context) => {
    const { cbHT, cbHTF, cbTH, cbTHF } = context

    // Verify Head < Tail && !Full state
    // Expected: 2 elements with head=0, tail=2
    assert.deepEqual(cbHT.getRawBuffer(), [1, 2, undefined])
    assert.equal(cbHT.getHead(), 0)
    assert.equal(cbHT.getTail(), 2)
    assert.equal(cbHT.isFull(), false)
    assert.equal(cbHT.size(), 2)

    // Verify Head < Tail && Full state
    // Expected: 3 elements with head=0, tail=0 (wrapped)
    assert.deepEqual(cbHTF.getRawBuffer(), [1, 2, 3])
    assert.equal(cbHTF.getHead(), 0)
    assert.equal(cbHTF.getTail(), 0)
    assert.equal(cbHTF.isFull(), true)
    assert.equal(cbHTF.size(), 3)

    // Verify Tail < Head && !Full state
    // Expected: 2 elements with head=1, tail=0
    assert.deepEqual(cbTH.getRawBuffer(), [3, 1, 2])
    assert.equal(cbTH.getHead(), 1)
    assert.equal(cbTH.getTail(), 0)
    assert.equal(cbTH.isFull(), false)
    assert.equal(cbTH.size(), 2)

    // Verify Tail < Head && Full state
    // Expected: 3 elements with head=1, tail=1
    assert.deepEqual(cbTHF.getRawBuffer(), [3, 1, 2])
    assert.equal(cbTHF.getHead(), 1)
    assert.equal(cbTHF.getTail(), 1)
    assert.equal(cbTHF.isFull(), true)
    assert.equal(cbTHF.size(), 3)
})

test('back and pop_back, Head < Tail && !Full', async (context: Context) => {
    const cb = context.cbHT

    // Test accessing last element
    // Expected: returns last inserted element
    assert.equal(cb.back(), 2)
    assert.equal(cb.size(), 2)

    // Test removing last element
    // Expected: previous element becomes last
    cb.pop_back();
    assert.equal(cb.back(), 1)
    assert.equal(cb.size(), 1)

    // Test removing last remaining element
    // Expected: buffer becomes empty
    cb.pop_back();
    assert.equal(cb.size(), 0)
})

test('back and pop_back, Head < Tail && Full', async (context: Context) => {
    const cb = context.cbHTF

    // Test accessing last element in full buffer
    // Expected: returns newest element
    assert.equal(cb.back(), 3)
    assert.equal(cb.size(), 3)

    // Test sequential removal from back
    // Expected: elements removed in reverse order
    cb.pop_back();
    assert.equal(cb.back(), 2)
    assert.equal(cb.size(), 2)
    cb.pop_back();
    assert.equal(cb.back(), 1)
    assert.equal(cb.size(), 1)
    cb.pop_back();
    assert.equal(cb.size(), 0)
})

test('back and pop_back, Head > Tail && !Full', async (context: Context) => {
    const cb = context.cbTH

    // Test back element in wrapped state
    // Expected: returns logically last element
    assert.equal(cb.back(), 2)
    assert.equal(cb.size(), 2)
    cb.pop_back();
    assert.equal(cb.back(), 1)
    assert.equal(cb.size(), 1)
    cb.pop_back();
    assert.equal(cb.size(), 0)
})

test('back and pop_back, Head > Tail && Full', async (context: Context) => {
    const cb = context.cbTHF

    // Test back element in full wrapped state
    // Expected: handles wrapped indexing correctly
    assert.equal(cb.back(), 3)
    assert.equal(cb.size(), 3)
    cb.pop_back();
    assert.equal(cb.back(), 2)
    assert.equal(cb.size(), 2)
    cb.pop_back();
    assert.equal(cb.back(), 1)
    assert.equal(cb.size(), 1)
    cb.pop_back();
    assert.equal(cb.size(), 0)
})

test('front and pop_front, Head < Tail && !Full', async (context: Context) => {
    const cb = context.cbHT

    // Test accessing first element
    // Expected: returns oldest element
    assert.equal(cb.front(), 1)
    assert.equal(cb.size(), 2)

    // Test removing from front
    // Expected: next element becomes first
    cb.pop_front();
    assert.equal(cb.front(), 2)
    assert.equal(cb.size(), 1)
    cb.pop_front();
    assert.equal(cb.size(), 0)
})

test('front and pop_front, Head < Tail && Full', async (context: Context) => {
    const cb = context.cbHTF

    // Test front element access in full buffer
    // Expected: returns oldest element
    assert.equal(cb.front(), 1)
    assert.equal(cb.size(), 3)

    // Test sequential removal from front
    // Expected: elements removed in insertion order
    cb.pop_front();
    assert.equal(cb.front(), 2)
    assert.equal(cb.size(), 2)
    cb.pop_front();
    assert.equal(cb.front(), 3)
    assert.equal(cb.size(), 1)
    cb.pop_front();
    assert.equal(cb.size(), 0)
})

test('front and pop_front, Head > Tail && !Full', async (context: Context) => {
    const cb = context.cbTH

    // Test front element in wrapped state
    // Expected: handles wrapped indexing for oldest element
    assert.equal(cb.front(), 1)
    assert.equal(cb.size(), 2)
    cb.pop_front();
    assert.equal(cb.front(), 2)
    assert.equal(cb.size(), 1)
    cb.pop_front();
    assert.equal(cb.size(), 0)
})

test('front and pop_front, Head > Tail && Full', async (context: Context) => {
    const cb = context.cbTHF

    // Test front element in full wrapped state
    // Expected: correctly identifies oldest element in wrapped buffer
    assert.equal(cb.front(), 1)
    assert.equal(cb.size(), 3)
    cb.pop_front();
    assert.equal(cb.front(), 2)
    assert.equal(cb.size(), 2)
    cb.pop_front();
    assert.equal(cb.front(), 3)
    assert.equal(cb.size(), 1)
    cb.pop_front();
    assert.equal(cb.size(), 0)
})

test('index access exceptions', async () => {
    const cb = new CircularBuffer(3)

    // Test error handling for invalid index access on empty buffer
    // Expected: proper error messages for out-of-range access
    expect(() => cb.set(0, 1)).toThrowError('circularbuffer.set: index 0 converted to table index 0 out of range')
    expect(() => cb[0] = 1).toThrowError('circularbuffer.set: index 0 converted to table index 0 out of range')
    expect(() => cb.get(0)).toThrowError('circularbuffer.get: index 0 converted to table index 0 out of range')
    expect(() => cb[0]).toThrowError('circularbuffer.get: index 0 converted to table index 0 out of range')
})

test('index access get', async (context: Context) => {
    let cb

    // Test indexed access for Head < Tail && !Full
    // Expected: logical indices map to correct values
    cb = context.cbHT
    assert.equal(cb.get(0), 1)  // First element
    assert.equal(cb.get(1), 2)  // Second element

    // Test indexed access for Head < Tail && Full
    // Expected: all three elements accessible by logical index
    cb = context.cbHTF
    assert.equal(cb.get(0), 1)
    assert.equal(cb.get(1), 2)
    assert.equal(cb.get(2), 3)

    // Test indexed access for Tail < Head && !Full
    // Expected: wrapped buffer indices work correctly
    cb = context.cbTH
    assert.equal(cb.get(0), 1)
    assert.equal(cb.get(1), 2)

    // Test indexed access for Tail < Head && Full
    // Expected: full wrapped buffer accessible
    cb = context.cbTHF
    assert.equal(cb.get(0), 1)
    assert.equal(cb.get(1), 2)
    assert.equal(cb.get(2), 3)
})

test('index access set', async (context: Context) => {
    let cb

    // Test setting values by index for Head < Tail && !Full
    // Expected: values updated and retrievable
    cb = context.cbHT
    cb.set(0, 11)
    cb.set(1, 22)
    assert.equal(cb.get(0), 11)
    assert.equal(cb.get(1), 22)

    // Test setting values for Head < Tail && Full
    // Expected: all positions can be updated
    cb = context.cbHTF
    cb.set(0, 11)
    cb.set(1, 22)
    cb.set(2, 33)
    assert.equal(cb.get(0), 11)
    assert.equal(cb.get(1), 22)
    assert.equal(cb.get(2), 33)

    // Test setting values for Tail < Head && !Full
    // Expected: wrapped indices handle updates correctly
    cb = context.cbTH
    cb.set(0, 11)
    cb.set(1, 22)
    assert.equal(cb.get(0), 11)
    assert.equal(cb.get(1), 22)

    // Test setting values for Tail < Head && Full
    // Expected: full wrapped buffer can be updated
    cb = context.cbTHF
    cb.set(0, 11)
    cb.set(1, 22)
    cb.set(2, 33)
    assert.equal(cb.get(0), 11)
    assert.equal(cb.get(1), 22)
    assert.equal(cb.get(2), 33)
})

test('index access operator []', async (context: Context) => {
    let cb

    // Test bracket operator for different buffer states
    // Expected: bracket notation works same as get() method
    cb = context.cbTH;
    assert.equal(cb[0], 1)
    assert.equal(cb[1], 2)

    cb = context.cbTHF;
    assert.equal(cb[0], 1)
    assert.equal(cb[1], 2)
    assert.equal(cb[2], 3)

    cb = context.cbHT;
    assert.equal(cb[0], 1)
    assert.equal(cb[1], 2)

    cb = context.cbHTF;
    assert.equal(cb[0], 1)
    assert.equal(cb[1], 2)
    assert.equal(cb[2], 3)
})

class ComplexObject {
    buf: Float32Array;
    constructor() {
        this.buf = new Float32Array(4)
    }
}

test('index access operator [] for complex objects', async () => {
    const cb = new CircularBuffer(3)
    const buf = cb.getRawBuffer()

    // Test storing complex objects in buffer
    // Expected: objects can be stored and retrieved correctly
    for (let i = 0; i < buf.length; ++i) {
        buf[i] = new ComplexObject()
    }
    cb.alloc_back()

    assert.deepEqual(cb[0], new ComplexObject())
})

test('clear method', async () => {
    const cb = new CircularBuffer(3);
    cb.push_back(1);
    cb.push_back(2);
    cb.push_back(3);

    // Test buffer state before clear
    // Expected: buffer is full
    assert.equal(cb.size(), 3);
    assert.equal(cb.isFull(), true);

    // Test clear operation
    // Expected: buffer returns to initial empty state
    cb.clear();
    assert.equal(cb.size(), 0);
    assert.equal(cb.isEmpty(), true);
    assert.equal(cb.isFull(), false);
    assert.equal(cb.getHead(), 0);
    assert.equal(cb.getTail(), 0);
});

test('isEmpty method', async () => {
    const cb = new CircularBuffer(3);

    // Test initial empty state
    // Expected: buffer reports as empty
    assert.equal(cb.isEmpty(), true);

    // Test after adding element
    // Expected: buffer is no longer empty
    cb.push_back(1);
    assert.equal(cb.isEmpty(), false);

    // Test after removing element
    // Expected: buffer returns to empty state
    cb.pop_back();
    assert.equal(cb.isEmpty(), true);
});

test('edge cases with count = 0', async () => {
    const cb = new CircularBuffer(3);
    cb.push_back(1);
    cb.push_back(2);

    const sizeBefore = cb.size();

    // Test operations with count = 0
    // Expected: no changes to buffer state
    cb.pop_front(0);
    assert.equal(cb.size(), sizeBefore);

    cb.pop_back(0);
    assert.equal(cb.size(), sizeBefore);

    cb.alloc_front(0);
    assert.equal(cb.size(), sizeBefore);

    cb.alloc_back(0);
    assert.equal(cb.size(), sizeBefore);
});

test('negative count parameters', async () => {
    const cb = new CircularBuffer(3);
    cb.push_back(1);
    cb.push_back(2);

    const sizeBefore = cb.size();

    // Test operations with negative counts
    // Expected: operations ignored, no state changes
    cb.pop_front(-1);
    assert.equal(cb.size(), sizeBefore);

    cb.pop_back(-5);
    assert.equal(cb.size(), sizeBefore);

    cb.alloc_front(-1);
    assert.equal(cb.size(), sizeBefore);

    cb.alloc_back(-3);
    assert.equal(cb.size(), sizeBefore);
});

test('front and back on empty buffer', async () => {
    const cb = new CircularBuffer(3);

    // Test accessing front/back of empty buffer
    // Expected: returns undefined for empty buffer
    assert.equal(cb.front(), undefined);
    assert.equal(cb.back(), undefined);
});

test('proxy set with non-numeric keys', async () => {
    const cb = new CircularBuffer(3);
    cb.push_back(1);

    // Test setting custom properties
    // Expected: custom properties can be set without interfering with buffer
    (cb as any).customProperty = 'test';
    assert.equal((cb as any).customProperty, 'test');

    // Test setting custom methods
    // Expected: original functionality preserved
    const originalSize = cb.size;
    (cb as any).testMethod = () => 'test';
    assert.equal((cb as any).testMethod(), 'test');
    assert.equal(cb.size(), 1);
});

test('proxy get with non-numeric keys', async () => {
    const cb = new CircularBuffer(3);

    // Test accessing existing methods through proxy
    // Expected: methods are accessible and functional
    assert.equal(typeof cb.size, 'function');
    assert.equal(typeof cb.push_back, 'function');
    assert.equal(typeof cb.capacity, 'function');

    // Test accessing non-existent properties
    // Expected: returns undefined for non-existent properties
    assert.equal((cb as any).nonExistent, undefined);
});

test('complex buffer state transitions', async () => {
    const cb = new CircularBuffer(4);

    // Test filling buffer completely
    // Expected: buffer reaches full capacity
    cb.push_back(1);
    cb.push_back(2);
    cb.push_back(3);
    cb.push_back(4);
    assert.equal(cb.isFull(), true);

    // Test partial removal and addition with wrapping
    // Expected: circular behavior maintains correct element order
    cb.pop_front(2);
    assert.equal(cb.size(), 2);
    assert.equal(cb.front(), 3);
    assert.equal(cb.back(), 4);

    cb.push_back(5);
    cb.push_back(6);
    assert.equal(cb.isFull(), true);
    assert.deepEqual([cb[0], cb[1], cb[2], cb[3]], [3, 4, 5, 6]);
});

test('large buffer operations', async () => {
    const cb = new CircularBuffer(1000);

    // Test performance and correctness with large buffer
    // Expected: handles large number of elements efficiently
    for (let i = 0; i < 1000; i++) {
        cb.push_back(i);
    }
    assert.equal(cb.size(), 1000);
    assert.equal(cb.isFull(), true);

    // Test bulk removal operations
    // Expected: maintains correct state after large operations
    cb.pop_front(500);
    assert.equal(cb.size(), 500);
    assert.equal(cb.front(), 500);
    assert.equal(cb.back(), 999);
});

test('waitForChangeSize functionality', async () => {
    const cb = new CircularBuffer(3);

    // Test async notification of size changes
    // Expected: promise resolves when size changes
    const promise = cb.waitForChangeSize();

    // Trigger size change asynchronously
    setTimeout(() => cb.push_back(1), 10);

    await promise;
    assert.equal(cb.size(), 1);
});

test('onChangeSize callback', async () => {
    const cb = new CircularBuffer(3);
    let callCount = 0;

    // Test callback mechanism for size changes
    // Expected: callback invoked for each size-changing operation
    cb.onChangeSize = () => callCount++;

    cb.push_back(1);
    assert.equal(callCount, 1);

    cb.push_front(2);
    assert.equal(callCount, 2);

    cb.pop_back();
    assert.equal(callCount, 3);

    cb.clear();
    assert.equal(callCount, 4);
});

test('buffer with capacity 1', async () => {
    const cb = new CircularBuffer(1);

    // Test edge case of minimum capacity
    // Expected: single-element buffer works correctly
    assert.equal(cb.capacity(), 1);
    assert.equal(cb.size(), 0);

    cb.push_back(1);
    assert.equal(cb.size(), 1);
    assert.equal(cb.isFull(), true);
    assert.equal(cb[0], 1);

    // Test overflow behavior with capacity 1
    // Expected: new element replaces the only element
    cb.push_back(2);
    assert.equal(cb.size(), 1);
    assert.equal(cb[0], 2);
});

test('alloc operations edge cases', async () => {
    const cb = new CircularBuffer(3);

    // Test alloc_back on full buffer
    // Expected: removes elements from front to make space
    cb.push_back(1);
    cb.push_back(2);
    cb.push_back(3);

    cb.alloc_back(2);
    assert.equal(cb.size(), 3);
    assert.equal(cb.front(), 3); // First elements should be removed

    // Test alloc_front on full buffer
    // Expected: removes elements from back to make space
    cb.clear();
    cb.push_back(1);
    cb.push_back(2);
    cb.push_back(3);

    cb.alloc_front(2);
    assert.equal(cb.size(), 3);
    assert.equal(cb.back(), 1); // Last elements should be removed
});