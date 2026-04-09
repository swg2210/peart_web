export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, contact, size, request, photoSrc } = req.body;

  if (!name || !contact) {
    return res.status(400).json({ error: 'Name and contact are required.' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL;

  if (!RESEND_API_KEY || !NOTIFY_EMAIL) {
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Poster Inquiry <onboarding@resend.dev>',
        to: [NOTIFY_EMAIL],
        subject: `[Poster] ${name} — ${size}`,
        html: `
          <div style="font-family:sans-serif;max-width:500px">
            <h2 style="font-size:18px;font-weight:normal">New Poster Inquiry</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr><td style="padding:8px 0;color:#999;width:100px">Name</td><td>${name}</td></tr>
              <tr><td style="padding:8px 0;color:#999">Contact</td><td>${contact}</td></tr>
              <tr><td style="padding:8px 0;color:#999">Size</td><td>${size}</td></tr>
              <tr><td style="padding:8px 0;color:#999">Request</td><td>${request || '—'}</td></tr>
              <tr><td style="padding:8px 0;color:#999">Photo</td><td><a href="${photoSrc}">${photoSrc}</a></td></tr>
            </table>
            ${photoSrc ? `<img src="${photoSrc}" style="max-width:100%;margin-top:16px" alt="photo">` : ''}
          </div>
        `
      })
    });

    if (!emailRes.ok) {
      const err = await emailRes.json();
      return res.status(500).json({ error: err.message || 'Email sending failed.' });
    }

    return res.status(200).json({ success: true, message: 'Inquiry submitted successfully.' });
  } catch (e) {
    return res.status(500).json({ error: 'Server error: ' + e.message });
  }
}
