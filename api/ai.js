const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if(req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if(req.method !== 'POST') {
    return res.status(405).json({error: 'Method not allowed'});
  }

  const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
  if(!MISTRAL_API_KEY) {
    return res.status(500).json({error: 'MISTRAL_API_KEY not configured. Set it in Vercel environment variables.'});
  }

  try {
    const {messages, query} = req.body;

    const systemMessage = `Sen Telegram web client (Loopinuz) uchun AI yordamchisan.
Foydalanuvchi o'zining Telegram chat xabarlarini taqdim etdi.
Xabarlarni tahlil qiling va savolga javob bering.
Qisqa va aniq javob bering. Agar kontekstda tegishli ma'lumot bo'lmasa, "bu haqida ma'lumot topilmadi" deb ayting.
Javobni foydalanuvchi tilida bering (o'zbek yoki rus tili).
Xabarlardan kim nima yozganini, qachon yozganini tahlil qiling.`;

    const apiMessages = [
      {role: 'system', content: systemMessage},
      ...(messages || []),
      {role: 'user', content: query}
    ];

    const payload = JSON.stringify({
      model: 'mistral-small-latest',
      messages: apiMessages,
      max_tokens: 1024,
      temperature: 0.7
    });

    return new Promise((resolve) => {
      const options = {
        hostname: 'api.mistral.ai',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MISTRAL_API_KEY}`,
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      const apiReq = https.request(options, (apiRes) => {
        let data = '';
        apiRes.on('data', (chunk) => { data += chunk; });
        apiRes.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if(parsed.choices && parsed.choices[0]) {
              res.status(200).json({reply: parsed.choices[0].message.content});
            } else if(parsed.error) {
              res.status(500).json({error: parsed.error.message || 'Mistral API error'});
            } else {
              res.status(500).json({error: 'Unexpected API response'});
            }
          } catch(e) {
            res.status(500).json({error: 'Failed to parse API response'});
          }
          resolve();
        });
      });

      apiReq.on('error', (e) => {
        res.status(500).json({error: 'Failed to connect to Mistral API: ' + e.message});
        resolve();
      });

      apiReq.write(payload);
      apiReq.end();
    });
  } catch(e) {
    res.status(500).json({error: e.message});
  }
};
