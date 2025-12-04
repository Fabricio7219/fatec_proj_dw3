require('dotenv').config();

const { encryptText, decryptText } = require('../utils/textCrypto');

const input = process.argv.slice(2).join(' ') || 'FatecWeek';

try {
  console.log('Texto original:', input);
  const encrypted = encryptText(input);
  console.log('Criptografado (base64):', encrypted);
  const decrypted = decryptText(encrypted);
  console.log('Decriptado:', decrypted);
} catch (error) {
  console.error('Falha ao executar demo de criptografia:', error.message);
  process.exit(1);
}
