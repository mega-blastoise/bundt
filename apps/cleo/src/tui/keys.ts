export type Key =
  | { name: 'char'; char: string; ctrl: boolean }
  | { name: 'enter' }
  | { name: 'escape' }
  | { name: 'backspace' }
  | { name: 'delete' }
  | { name: 'tab'; shift: boolean }
  | { name: 'up' }
  | { name: 'down' }
  | { name: 'left' }
  | { name: 'right' }
  | { name: 'home' }
  | { name: 'end' }
  | { name: 'pageup' }
  | { name: 'pagedown' }
  | { name: 'unknown' };

export function parseKey(buf: Buffer): Key {
  if (buf.length === 0) return { name: 'unknown' };

  // Single byte
  if (buf.length === 1) {
    const byte = buf[0]!;
    if (byte === 0x0d || byte === 0x0a) return { name: 'enter' };
    if (byte === 0x1b) return { name: 'escape' };
    if (byte === 0x7f || byte === 0x08) return { name: 'backspace' };
    if (byte === 0x09) return { name: 'tab', shift: false };
    // Ctrl+letter (0x01-0x1a)
    if (byte >= 0x01 && byte <= 0x1a) {
      return { name: 'char', char: String.fromCharCode(byte + 0x60), ctrl: true };
    }
    if (byte >= 0x20 && byte <= 0x7e) {
      return { name: 'char', char: String.fromCharCode(byte), ctrl: false };
    }
    return { name: 'unknown' };
  }

  const seq = buf.toString('utf8');

  // CSI sequences
  if (seq === '\x1b[A') return { name: 'up' };
  if (seq === '\x1b[B') return { name: 'down' };
  if (seq === '\x1b[C') return { name: 'right' };
  if (seq === '\x1b[D') return { name: 'left' };
  if (seq === '\x1b[H') return { name: 'home' };
  if (seq === '\x1b[F') return { name: 'end' };
  if (seq === '\x1b[5~') return { name: 'pageup' };
  if (seq === '\x1b[6~') return { name: 'pagedown' };
  if (seq === '\x1b[3~') return { name: 'delete' };
  if (seq === '\x1b[Z') return { name: 'tab', shift: true };

  // Multi-byte UTF-8 character
  if (buf[0]! >= 0xc0) {
    return { name: 'char', char: seq, ctrl: false };
  }

  return { name: 'unknown' };
}
