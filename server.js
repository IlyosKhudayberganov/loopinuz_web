const compression = require('compression');
const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');

const app = express();

const thirdTour = process.argv[2] == 3;
const forcePort = process.argv[3];
const useHttp = process.argv[4] !== 'https';

const publicFolderName = thirdTour ? 'public3' : 'public';
const port = forcePort ? +forcePort : (thirdTour ? 8443 : 80);

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || '1yTniRmoGx0V0BZfIKJkwMgIIY7j0NeZ';

app.set('etag', false);
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use(compression());
app.use(express.json({limit: '5mb'}));
app.use(express.static(publicFolderName));

app.get('/', (req, res) => {
  res.sendFile(__dirname + `/${publicFolderName}/index.html`);
});

app.post('/api/ai', async(req, res) => {
  try {
    const {messages, query} = req.body;

    const systemMessage = `You are a helpful AI assistant for a Telegram web client called Loopinuz. 
The user has provided you with their recent chat messages as context. 
Answer their question based on the provided chat context. 
Be concise and helpful. If the context doesn't contain relevant information, say so.
Always respond in the same language as the user's query.`;

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
            res.json({reply: parsed.choices[0].message.content});
          } else if(parsed.error) {
            res.status(500).json({error: parsed.error.message || 'Mistral API error'});
          } else {
            res.status(500).json({error: 'Unexpected API response'});
          }
        } catch(e) {
          res.status(500).json({error: 'Failed to parse API response'});
        }
      });
    });

    apiReq.on('error', (e) => {
      res.status(500).json({error: 'Failed to connect to Mistral API: ' + e.message});
    });

    apiReq.write(payload);
    apiReq.end();
  } catch(e) {
    res.status(500).json({error: e.message});
  }
});

const server = useHttp ? http : https;

let options = {};
if(!useHttp) {
  options.key = fs.readFileSync(__dirname + '/certs/server-key.pem');
  options.cert = fs.readFileSync(__dirname + '/certs/server-cert.pem');
}

server.createServer(options, app).listen(port, () => {
  console.log('Listening port:', port, 'folder:', publicFolderName);
});
