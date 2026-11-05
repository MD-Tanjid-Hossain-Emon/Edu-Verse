const fs = require('fs');
const path = require('path');
const { TextDecoder } = require('node:util');
const { createReadStream } = require('node:fs');

const SIGNATURES = {
  '.pdf': (data) => data.subarray(0, 5).toString('ascii') === '%PDF-',
  '.doc': isLegacyOfficeDocument,
  '.ppt': isLegacyOfficeDocument,
  '.docx': isZip,
  '.pptx': isZip,
  '.zip': isZip,
  '.png': (data) => data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  '.jpg': isJpeg,
  '.jpeg': isJpeg,
  '.mp4': isMp4,
};

function isLegacyOfficeDocument(data) {
  return data.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
}

function isZip(data) {
  return data.length >= 4
    && data[0] === 0x50
    && data[1] === 0x4b
    && [0x03, 0x05, 0x07].includes(data[2])
    && [0x04, 0x06, 0x08].includes(data[3]);
}

function isJpeg(data) {
  return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
}

function decodeUtf8(decoder, chunk, options) {
  try {
    return decoder.decode(chunk, options);
  } catch (error) {
    if (error instanceof TypeError) return null;
    throw error;
  }
}

async function isUtf8Text(filePath) {
  const decoder = new TextDecoder('utf-8', { fatal: true });
  for await (const chunk of createReadStream(filePath)) {
    const text = decodeUtf8(decoder, chunk, { stream: true });
    if (text === null || /[\u0000-\u0008\u000e-\u001f]/.test(text)) return false;
  }
  const remainder = decodeUtf8(decoder);
  return remainder !== null && !/[\u0000-\u0008\u000e-\u001f]/.test(remainder);
}

function isMp4(data) {
  return data.length >= 12
    && data.subarray(4, 8).toString('ascii') === 'ftyp'
    && data.readUInt32BE(0) >= 8;
}

async function hasValidUploadSignature(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const validate = SIGNATURES[extension];
  if (extension === '.txt') return isUtf8Text(filePath);
  if (!validate) return false;

  const data = readHeader(filePath);
  return validate(data);
}

function readHeader(filePath) {
  const file = fs.openSync(filePath, 'r');
  try {
    const header = Buffer.alloc(16);
    const bytesRead = fs.readSync(file, header, 0, header.length, 0);
    return header.subarray(0, bytesRead);
  } finally {
    fs.closeSync(file);
  }
}

async function validateUploadedFile(req, res, next) {
  if (!req.file) return next();

  try {
    if (await hasValidUploadSignature(req.file.path)) return next();
    await fs.promises.unlink(req.file.path);
  } catch (error) {
    return next(error);
  }

  return res.status(400).render('error', {
    title: 'Upload rejected',
    message: 'The file contents do not match the selected file type.',
  });
}

module.exports = { hasValidUploadSignature, validateUploadedFile };
