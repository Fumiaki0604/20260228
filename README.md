# SEMINAR.AI — セミナーを自分ごとに変換するAI

YouTube動画のURLを貼るだけで、AIが音声とスライドを解析し、あなたの職種・ツール・課題に合わせた「使えること」を自動生成するプロトタイプ。

## デモ

[Vercel でプレビュー](https://20260228.vercel.app)

## 概要

セミナー動画を見ても「で、自分には何が使える？」で止まる課題を解決する。

| フェーズ | 機能 |
|---|---|
| 視聴前 | コンテキスト設定（職種・ツール・課題） |
| 視聴中 | マルチモーダル解析（音声 + スライド画像） |
| 視聴後 | 使えることリスト・アクションプラン・視聴メモ |
| 蓄積 | 視聴履歴（将来: ナレッジグラフ） |

## 画面構成

```
S01 コンテキスト設定 → S02 URL入力 → S03 解析中 → S04 生成中 → S05 アウトプット
                                                                        ↓
                                                                   S06 履歴
```

## 技術スタック

- 単一 HTML ファイル（ビルドツールなし）
- localStorage でデータ永続化
- JetBrains Mono / M PLUS 1 Code（等幅フォント）
- Bootstrap Icons

## ファイル構成

```
.
├── index.html               # Vercel デプロイ用（prototype/index.html のコピー）
├── CLAUDE.md                # Claude Code 行動規範
└── prototype/
    ├── index.html           # メインファイル
    ├── PROTOTYPE.md         # 仕様書（6画面・データモデル・状態遷移）
    ├── IDEATION_RESULT.md   # コンセプト・確定機能リスト
    ├── DESIGN_DECISION.md   # デザイン決定（超機能主義）
    └── prototype_status.md  # 進行状況
```

## ローカル確認

```bash
open prototype/index.html
```

## デザイン

超機能主義（Brutalist / Utilitarian）— 装飾ゼロの機能主義UI。

| 用途 | 値 |
|---|---|
| 背景 | `#FFFFFF` |
| テキスト | `#0A0A0A` |
| アクセント | `#FF0000` |
| フォント | JetBrains Mono |
| ボーダー | 1.5px solid、角丸なし |
