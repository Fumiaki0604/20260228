const Anthropic = require('@anthropic-ai/sdk');
const https = require('https');

// ── HTTP GET ──────────────────────────────────────────────
function httpGet(urlStr) {
  return new Promise((resolve, reject) => {
    const req = https.get(urlStr, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9,ja;q=0.8',
        'Accept-Encoding': 'identity',
      },
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve(httpGet(res.headers.location));
        return;
      }
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// ── HTTP POST (JSON → JSON) ───────────────────────────────
function httpPost(urlStr, bodyObj, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(bodyObj);
    const u = new URL(urlStr);
    const req = https.request({
      hostname: u.hostname, port: 443,
      path: u.pathname + u.search, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        ...extraHeaders,
      },
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve(null); } });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(bodyStr);
    req.end();
  });
}

// ── XML エンティティ除去 ──────────────────────────────────
function decodeEntities(str) {
  return str
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .trim();
}

// ── captionTracks → transcript text ──────────────────────
async function tracksToTranscript(tracks) {
  if (!tracks?.length) return null;
  const track = tracks.find(t => t.languageCode === 'ja')
    || tracks.find(t => t.languageCode?.startsWith('en'))
    || tracks[0];
  if (!track?.baseUrl) return null;
  const xml = await httpGet(track.baseUrl);
  const texts = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)]
    .map(m => decodeEntities(m[1])).filter(Boolean);
  return texts.length > 0 ? texts.join(' ') : null;
}

// ── 方法1: InnerTube ANDROID クライアント ─────────────────
// Android クライアントはbot判定・同意ページを回避できる
async function fetchViaAndroid(videoId) {
  const data = await httpPost(
    'https://www.youtube.com/youtubei/v1/player',
    {
      videoId,
      context: {
        client: {
          clientName: 'ANDROID',
          clientVersion: '17.31.35',
          androidSdkVersion: 30,
          hl: 'en',
          timeZone: 'UTC',
          utcOffsetMinutes: 0,
        },
      },
    },
    {
      'User-Agent': 'com.google.android.youtube/17.31.35 (Linux; U; Android 11) gzip',
      'X-YouTube-Client-Name': '3',
      'X-YouTube-Client-Version': '17.31.35',
      'Origin': 'https://www.youtube.com',
    }
  );
  const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  return tracksToTranscript(tracks);
}

// ── 方法2: InnerTube WEB クライアント ─────────────────────
async function fetchViaWeb(videoId) {
  const data = await httpPost(
    'https://www.youtube.com/youtubei/v1/player',
    {
      videoId,
      context: {
        client: {
          clientName: 'WEB',
          clientVersion: '2.20240101',
          hl: 'en',
          timeZone: 'UTC',
        },
      },
    },
    {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'X-YouTube-Client-Name': '1',
      'X-YouTube-Client-Version': '2.20240101',
      'Origin': 'https://www.youtube.com',
      'Referer': `https://www.youtube.com/watch?v=${videoId}`,
    }
  );
  const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  return tracksToTranscript(tracks);
}

// ── 方法3: HTMLスクレイピング（括弧カウント方式）──────────
function extractCaptionTracks(html) {
  const pos = html.indexOf('"captionTracks":');
  if (pos === -1) return null;
  const arrStart = html.indexOf('[', pos);
  if (arrStart === -1) return null;
  let depth = 0, i = arrStart;
  for (; i < html.length; i++) {
    if (html[i] === '[') depth++;
    else if (html[i] === ']' && --depth === 0) break;
  }
  try { return JSON.parse(html.slice(arrStart, i + 1)); } catch { return null; }
}

async function fetchViaPageScraping(videoId) {
  const html = await httpGet(`https://www.youtube.com/watch?v=${videoId}`);
  const tracks = extractCaptionTracks(html);
  return tracksToTranscript(tracks);
}

// ── メイン: 3段フォールバック (デバッグ情報付き) ──────────
async function fetchYouTubeTranscript(videoId) {
  const debug = [];
  for (const [name, fn] of [
    ['android', fetchViaAndroid],
    ['web', fetchViaWeb],
    ['page', fetchViaPageScraping],
  ]) {
    try {
      const t = await fn(videoId);
      if (t) return { transcript: t, debug };
      debug.push({ method: name, result: 'null (no transcript)' });
    } catch (e) {
      debug.push({ method: name, error: e.message });
    }
  }
  return { transcript: null, debug };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { videoId, context } = req.body;
  if (!videoId) return res.status(400).json({ error: 'videoId is required' });

  // ── 1. 字幕取得 ──────────────────────────────────────────
  let transcript = null;
  let debugInfo = [];
  try {
    const result = await fetchYouTubeTranscript(videoId);
    transcript = result.transcript;
    debugInfo = result.debug;
  } catch (e) {
    debugInfo = [{ error: e.message }];
  }

  if (!transcript) {
    return res.status(422).json({
      error: 'この動画には字幕がありません。字幕（自動生成を含む）がある動画のURLを入力してください。',
      _debug: debugInfo
    });
  }

  // ── 2. Claude API ─────────────────────────────────────────
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const role      = context?.role             || '—';
  const tools     = (context?.tools || []).join(', ') || 'なし';
  const challenge = context?.currentChallenge || 'なし';

  const prompt = `あなたはセミナー動画の内容を視聴者の仕事文脈に翻訳するAIです。
以下のトランスクリプトを分析し、視聴者の職種・ツール・課題に合わせた実践的なアウトプットを日本語で生成してください。

## 視聴者のコンテキスト
- 職種: ${role}
- よく使うツール: ${tools}
- 今の課題: ${challenge}

## 動画トランスクリプト
${transcript.slice(0, 10000)}

## 出力形式（必ずこのJSONのみを返してください。前置き・後置き不要）
{
  "title": "動画の内容を表すタイトル（20文字以内）",
  "usableItems": [
    {
      "id": "u1",
      "point": "あなたの仕事で使えること（30文字以内）",
      "context": "なぜ・どのように使えるか。視聴者のツールや課題に具体的に言及（100文字以内）"
    },
    { "id": "u2", "point": "...", "context": "..." },
    { "id": "u3", "point": "...", "context": "..." }
  ],
  "actionPlan": [
    { "id": "a1", "action": "明日から実践できる具体的なアクション（50文字以内）", "timing": "今日中" },
    { "id": "a2", "action": "...", "timing": "今週中" },
    { "id": "a3", "action": "...", "timing": "今月中" }
  ],
  "memos": [
    "動画からの重要な学び・気づき（各50文字以内、3〜5個）"
  ]
}`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AIのレスポンスが不正です');

    const result = JSON.parse(jsonMatch[0]);
    return res.status(200).json(result);

  } catch (e) {
    return res.status(500).json({ error: 'AI解析に失敗しました: ' + e.message });
  }
};
