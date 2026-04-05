export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Cloudinary unsigned 업로드에 필요한 공개 설정만 노출
  res.status(200).json({
    cloudinaryCloud:  process.env.CLOUDINARY_CLOUD_NAME  || '',
    cloudinaryPreset: process.env.CLOUDINARY_UPLOAD_PRESET || ''
  });
}
