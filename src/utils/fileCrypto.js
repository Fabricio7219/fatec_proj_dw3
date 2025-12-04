const crypto = require('crypto');
const fs = require('fs').promises;

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getDerivedKey() {
  const secret = process.env.FILE_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error('FILE_ENCRYPTION_KEY não configurada');
  }
  return crypto.createHash('sha256').update(secret).digest();
}

async function encryptFile(sourcePath, targetPath) {
  const key = getDerivedKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const data = await fs.readFile(sourcePath);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  await fs.writeFile(targetPath, Buffer.concat([iv, encrypted]));
  return targetPath;
}

async function decryptFile(sourcePath, targetPath) {
  const key = getDerivedKey();
  const payload = await fs.readFile(sourcePath);
  const iv = payload.subarray(0, IV_LENGTH);
  const encryptedData = payload.subarray(IV_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  await fs.writeFile(targetPath, decrypted);
  return targetPath;
}

function isEncryptionEnabled() {
  return Boolean(process.env.FILE_ENCRYPTION_KEY);
}

async function encryptFileIfEnabled(sourcePath) {
  if (!isEncryptionEnabled()) return null;
  const encryptedPath = `${sourcePath}.enc`;
  await encryptFile(sourcePath, encryptedPath);
  return encryptedPath;
}

module.exports = {
  encryptFile,
  decryptFile,
  encryptFileIfEnabled,
  isEncryptionEnabled
};
