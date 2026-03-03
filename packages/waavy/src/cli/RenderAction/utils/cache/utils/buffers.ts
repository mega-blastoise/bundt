export function abtosab(ab: ArrayBuffer): SharedArrayBuffer {
  const sab = new SharedArrayBuffer(ab.byteLength);
  const view = new Uint8Array(sab);
  view.set(new Uint8Array(ab));
  return sab;
}

export function sabtoab(sab: SharedArrayBuffer): ArrayBuffer {
  const ab = new ArrayBuffer(sab.byteLength);
  const view = new Uint8Array(ab);
  view.set(new Uint8Array(sab));
  return ab;
}

export function sabtou8ab(sab: SharedArrayBuffer): Uint8Array<ArrayBuffer> {
  const u8ab = new Uint8Array<ArrayBuffer>(sabtoab(sab));
  return u8ab;
}
