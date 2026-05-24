# ◈ HTML5 Music Sequencer

Web Audio API で動くブラウザ完結型の音楽シーケンサー。インストール不要、ファイル保存不要。

**デモ:** https://masayukisobe.github.io/html5-music/

---

## 機能

### ドラムシーケンサー（TR-808スタイル）
- 8チャンネル（KICK / SNARE / HIHAT C・O / CLAP / TOM H・L / BASS）
- 8 / 16 / 32 ステップ切り替え
- プリセット: Basic / Hip-Hop / Techno / Reggae
- ランダムパターン生成
- チャンネルごとに WAV サンプル読み込み可
- BPM 40〜240、スイング調整

### ピアノロール
- Canvas ベースの 2 オクターブグリッド
- クリック＆ドラッグでノート入力
- プリセット: Melody 1 / Arpeggio / Blues
- シンセパラメータ: Waveform / Attack / Decay / Sustain / Release / Detune / Oct Shift
- WAV サンプル読み込み（ピッチシフト再生）

---

## ローカル開発

### 必要なもの
- [Node.js](https://nodejs.org/) v20 以上

### セットアップ（初回のみ）
```bash
git clone git@github.com:masayukisobe/html5-music.git
cd html5-music
npm install
```

### 開発サーバー起動
```bash
npm run dev
# → http://localhost:5173/html5-music/
```
Claude Code からは `.claude/launch.json` の `"sequencer"` 設定で自動起動できる。

### ビルド確認（本番と同じ状態を確認）
```bash
npm run build        # dist/ に出力
npm run preview      # http://localhost:4173/html5-music/ でプレビュー
```

---

## デプロイ

`main` ブランチへ push すると GitHub Actions が自動で `gh-pages` ブランチへデプロイする。

```bash
git add .
git commit -m "変更内容"
git push
# → 1〜2分後に https://masayukisobe.github.io/html5-music/ に反映
```

GitHub Pages の設定: **Settings → Pages → Source: Deploy from a branch → gh-pages / (root)**

---

## プロジェクト構成

```
html5-music/
├── index.html              # Vite エントリーポイント（HTMLのみ、スクリプトなし）
├── vite.config.ts          # base: '/html5-music/'
├── tsconfig.json           # strict モード
├── src/
│   ├── main.ts             # エントリー: DOM配線 + タブ/プリセット制御
│   ├── style.css           # 全スタイル（dark テーマ）
│   ├── types.ts            # Channel / Note / SynthParams 型定義
│   ├── notes.ts            # midiToHz() / buildNoteList()
│   ├── audio/
│   │   ├── context.ts      # AudioContext シングルトン
│   │   ├── drumSynth.ts    # ドラム音源合成 + WAVサンプル再生
│   │   └── pianoSynth.ts   # シンセ / WAVサンプル再生（ピッチシフト）
│   ├── sequencer/
│   │   ├── state.ts        # グローバル状態（drumPat / pianoNotes / seqState）
│   │   ├── transport.ts    # play/stop/スケジューラー（ルックアヘッド方式）
│   │   └── presets.ts      # ドラム/ピアノプリセットデータ
│   └── ui/
│       ├── drumSequencer.ts  # ドラムグリッドDOM生成 + プレイヘッド更新
│       ├── pianoRoll.ts      # Canvas描画 + マウスイベント
│       └── transportBar.ts  # トランスポート・シンセコントロール配線
├── .github/workflows/
│   └── deploy.yml          # CI: npm ci → vite build → gh-pages デプロイ
└── .claude/
    └── launch.json         # Claude Code の開発サーバー設定
```

### レイヤー構造（依存関係）
```
UI層        drumSequencer / pianoRoll / transportBar
  ↓
Sequencer層  state / transport / presets
  ↓
Audio層      context / drumSynth / pianoSynth
```

---

## 今後追加したいこと

- [ ] パターンの保存・読み込み（localStorage）
- [ ] 複数パターン（A/B/C...）を切り替えてライブ演奏
- [ ] ドラムチャンネルのボリューム・パン調整
- [ ] ピアノロールのノート長調整（クォーターノート / エイスノートなど）
- [ ] MIDI キーボード入力対応
- [ ] WAV / MP3 でパターンをエクスポート
- [ ] モバイル対応（タッチイベント）
- [ ] コード進行プリセット
