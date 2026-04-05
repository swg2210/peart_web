export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { password, data, checkOnly } = req.body;

  // 비밀번호 확인
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: '비밀번호가 틀렸습니다.' });
  }

  // 로그인 검증만 하는 경우
  if (checkOnly) {
    return res.status(200).json({ ok: true });
  }

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo  = process.env.GITHUB_REPO;

  if (!token || !owner || !repo) {
    return res.status(500).json({ error: 'GitHub 환경변수가 설정되지 않았습니다.' });
  }

  try {
    // 현재 파일 SHA 가져오기 (업데이트에 필요)
    const getRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/data.json`,
      {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'peart-admin'
        }
      }
    );

    let sha;
    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha;
    }

    // data.json 업데이트
    const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
    const body = {
      message: 'Update data.json via admin',
      content,
      ...(sha && { sha })
    };

    const updateRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/data.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'peart-admin'
        },
        body: JSON.stringify(body)
      }
    );

    if (updateRes.ok) {
      return res.status(200).json({ success: true, message: '저장 완료! 1~2분 후 사이트에 반영됩니다.' });
    } else {
      const err = await updateRes.json();
      return res.status(500).json({ error: err.message || 'GitHub API 오류' });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
