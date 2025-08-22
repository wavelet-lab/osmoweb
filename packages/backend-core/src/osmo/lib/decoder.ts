export const decoder = () => {
  const decoderInstance = new TextDecoder('utf-8');
  return (input?: BufferSource, options?: TextDecodeOptions) => decoderInstance.decode(input, options);
}
//to Uint8Array
export const encoder = () => {
  const encoderInstance = new TextEncoder();
  return (input?: string) => encoderInstance.encode(input);
}

//When we got Uint8Array instead of ArrayBuffer - we had to do the following:
//
// export const arrayBufferToFloat32 = (buffer: ArrayBuffer): Float32Array =>  {
//   const incomingData = new Uint8Array(buffer);
//   const dataView = new DataView(incomingData.buffer, incomingData.byteOffset, incomingData.byteLength);
//   const outputData = new Float32Array(incomingData.byteLength / Float32Array.BYTES_PER_ELEMENT);
//
//   for (let i = 0; i < outputData.length; i++) {
//     outputData[i] = dataView.getFloat32(i * Float32Array.BYTES_PER_ELEMENT, true);
//   }
//   return outputData; // return the Float32Array
// }
//
// export const float32ToArrayBuffer = (floats: Float32Array) : ArrayBuffer => {
//   const bufferArray = new ArrayBuffer(floats.byteLength);
//   const view = new DataView(bufferArray);
//   const bytes = new Uint8Array(bufferArray);
//
//   let j = 0;
//   for (let i = 0; i < bytes.byteLength; i+=Float32Array.BYTES_PER_ELEMENT, j++) {
//     view.setFloat32(i, floats[j], true);
//   }
//   return bufferArray;
// }
