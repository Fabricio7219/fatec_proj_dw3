const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getKey() {
  const secret = process.env.FILE_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error('Defina FILE_ENCRYPTION_KEY para usar a criptografia.');
  }
  return crypto.createHash('sha256').update(secret).digest();
}

function encryptText(plainText) {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, encrypted]).toString('base64');
}

function decryptText(base64Payload) {
  const key = getKey();
  const payload = Buffer.from(base64Payload, 'base64');
  const iv = payload.subarray(0, IV_LENGTH);
  const encryptedData = payload.subarray(IV_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  return decrypted.toString('utf8');
}

module.exports = { encryptText, decryptText };
