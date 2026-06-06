export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // ImageKit unsigned 업로드에 필요한 공개 설정만 노출
  res.status(200).json({
    imagekitEndpoint:  process.env.IMAGEKIT_URL_ENDPOINT || '',
    imagekitPublicKey: process.env.IMAGEKIT_PUBLIC_KEY   || ''
  });
}
