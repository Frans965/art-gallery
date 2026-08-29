const cloudinary = require('cloudinary').v2;

const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

function validateConfig() {
  const missing = [];
  if (!cloudName) missing.push('CLOUDINARY_CLOUD_NAME');
  if (!apiKey) missing.push('CLOUDINARY_API_KEY');
  if (!apiSecret) missing.push('CLOUDINARY_API_SECRET');

  if (missing.length > 0) {
    console.error('[Cloudinary] Missing environment variables:', missing.join(', '));
    return false;
  }

  if (apiKey === apiSecret) {
    console.error(
      '[Cloudinary] CLOUDINARY_API_SECRET looks invalid (identical to API key). Update it from your Cloudinary dashboard.'
    );
  }

  return true;
}

const isConfigured = validateConfig();

if (isConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  console.log('[Cloudinary] Configuration loaded for cloud:', cloudName);
}

async function uploadImageBuffer(buffer, mimetype) {
  if (!isConfigured) {
    throw new Error('Cloudinary is not configured. Check environment variables.');
  }

  if (!buffer || !buffer.length) {
    throw new Error('Image buffer is empty');
  }

  const dataUri = `data:${mimetype || 'image/jpeg'};base64,${buffer.toString('base64')}`;

  try {
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'art-gallery',
      resource_type: 'image',
    });
    return result;
  } catch (error) {
    console.error('[Cloudinary] Upload error:', error.message || error);
    throw error;
  }
}

cloudinary.uploadImageBuffer = uploadImageBuffer;
cloudinary.isConfigured = () => isConfigured;

module.exports = cloudinary;
