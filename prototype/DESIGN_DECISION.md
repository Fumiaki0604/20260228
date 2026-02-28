# デザイン決定

## 選択パターン
06 - 超機能主義（Brutalist / Utilitarian）

## コンセプト
「道具として潔い」。AIツールを使いこなすビジネスパーソンのための、装飾ゼロの機能主義UI。
ターミナル風の等幅フォント・角丸なし・太いボーダーで「仕事をする道具感」を徹底的に表現する。
アニメーションはタイプライター風のみ。情報密度が高いアウトプット画面でこそ映えるデザイン。

## カラースキーム
| 用途 | カラー |
|------|--------|
| 背景 | #FFFFFF |
| メインテキスト | #0A0A0A |
| ボーダー / 仕切り | #0A0A0A |
| アクセント（赤） | #FF0000 |
| サブテキスト | #555555 |
| 解析完了・チェック | #008000 |

## タイポグラフィ
- 見出し / UI: JetBrains Mono（等幅、CDN: Google Fonts）
- 本文 / 補足: M PLUS 1 Code（等幅日本語、CDN: Google Fonts）

## キーアニメーション
- 画面タイトルのタイプライター風表示（CSS animation + steps()）
- AI解析ステップのステップ表示（フェードイン、animation-delay 1s刻み）
- ボタンホバー: 背景黒 / テキスト白の反転（transition 0.1s）

## アイコンライブラリ
- ライブラリ: Bootstrap Icons
- CDN: `https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css`
- 使い方: `<i class="bi bi-arrow-right"></i>`

## 実装ガイドライン

### レイアウト原則
- 全要素に `border: 1.5px solid #0A0A0A` （角丸なし、`border-radius: 0`）
- ヘッダーは固定・常にステップ状態を表示（設定 > 視聴 > アウトプット）
- ページ幅は最大 `840px`、中央寄せ
- 余白は `16px` の倍数で統一

### コンポーネント
```css
/* ボタン基本スタイル */
button {
  font-family: 'JetBrains Mono', monospace;
  background: #0A0A0A;
  color: #FFFFFF;
  border: 1.5px solid #0A0A0A;
  border-radius: 0;
  padding: 10px 20px;
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
}
button:hover {
  background: #FF0000;
  border-color: #FF0000;
}

/* 入力フィールド */
input, textarea {
  font-family: 'JetBrains Mono', monospace;
  border: 1.5px solid #0A0A0A;
  border-radius: 0;
  padding: 10px;
  width: 100%;
  box-sizing: border-box;
}
input:focus, textarea:focus {
  outline: none;
  border-color: #FF0000;
}

/* セクション仕切り */
.section-label {
  font-size: 11px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #555555;
  margin-bottom: 8px;
}
```

### タイプライターアニメーション
```css
.typewriter {
  overflow: hidden;
  white-space: nowrap;
  animation: typing 0.8s steps(20, end) forwards;
}
@keyframes typing {
  from { width: 0 }
  to { width: 100% }
}
```

### アクセントの使い方
- 赤（#FF0000）: ボタンホバー、エラー、現在ステップのハイライトのみ
- 緑（#008000）: AI解析完了チェックマーク（`✓`）のみ
- その他に色を使わない

## 参照プレビュー
`prototype/preview_06_brutalist.html`
