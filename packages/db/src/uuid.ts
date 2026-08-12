export const generateUuidV7 = (timestampMs: number = Date.now()): string => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  const b0 = Math.floor(timestampMs / 1_099_511_627_776) % 256;
  const b1 = Math.floor(timestampMs / 4_294_967_296) % 256;
  const b2 = Math.floor(timestampMs / 16_777_216) % 256;
  const b3 = Math.floor(timestampMs / 65_536) % 256;
  const b4 = Math.floor(timestampMs / 256) % 256;
  const b5 = timestampMs % 256;

  bytes[0] = b0;
  bytes[1] = b1;
  bytes[2] = b2;
  bytes[3] = b3;
  bytes[4] = b4;
  bytes[5] = b5;

  const currentB6 = bytes[6] ?? 0;
  const currentB8 = bytes[8] ?? 0;

  // Set the UUID v7 version nibble (0x7) and RFC 4122 variant bits (0x80)
  // using arithmetic instead of bitwise operators.
  bytes[6] = (currentB6 % 16) + 0x70;
  bytes[8] = (currentB8 % 64) + 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    ""
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
