const Anthropic = require('@anthropic-ai/sdk');
const { YoutubeTranscript } = require('youtube-transcript');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { videoId, context } = req.body;
  if (!videoId) return res.status(400).json({ error: 'videoId is required' });

  // ── 1. 字幕取得 ──────────────────────────────
  let transcript = '';

  // 日本語字幕を優先、なければ任意言語にフォールバック
  try {
    const items = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'ja' });
    transcript = items.map(i => i.text).join(' ');
  } catch {
    try {
      const items = await YoutubeTranscript.fetchTranscript(videoId);
      transcript = items.map(i => i.text).join(' ');
    } catch {
      return res.status(422).json({
        error: 'この動画には字幕がありません。字幕（自動生成を含む）がある動画のURLを入力してください。'
      });
    }
  }

  // ── 2. Claude API ────────────────────────────
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
