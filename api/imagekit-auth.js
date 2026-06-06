import crypto from 'crypto';

// ImageKit 클라이언트 업로드용 서명 토큰 발급
// signature = HMAC-SHA1(token + expire, privateKey)
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey) {
    res.status(500).json({ error: 'IMAGEKIT_PRIVATE_KEY 미설정' });
    return;
  }

  const token = crypto.randomUUID();
  const expire = Math.floor(Date.now() / 1000) + 2400; // 40분 유효
  const signature = crypto
    .createHmac('sha1', privateKey)
    .update(token + expire)
    .digest('hex');

  res.status(200).json({ token, expire, signature });
}
