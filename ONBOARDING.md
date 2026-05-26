# HTML5 Music Sequencer — 開発コンテキスト

## このプロジェクトは何か
ブラウザ完結の音楽シーケンサー。Web Audio API + HTML5 Canvas + TypeScript + Vite。
GitHub Pages でホスト: https://masayukisobe.github.io/html5-music/

---

## すぐ始める

```bash
# 開発サーバー（Claude Code から launch.json の "sequencer" で起動可）
npm run dev          # http://localhost:5173/html5-music/

# 型チェック
"C:\Program Files\nodejs\node.exe" node_modules/typescript/bin/tsc --noEmit

# ビルド確認
npm run build && npm run preview   # http://localhost:4173/html5-music/

# デプロイ（main へ push で自動）
git push
```

Node.js は `C:\Program Files\nodejs\` に入っている。bash からは `"C:\Program Files\nodejs\node.exe"` でフルパス指定。

---

## アーキテクチャ

```
src/
  main.ts              ← DOMContentLoaded ですべて配線・UI refresh関数群
  types.ts             ← Channel / Note / SynthParams 型定義
  notes.ts             ← buildNoteList(octaves) → Note[] (高→低順)
  style.css            ← 全CSS（dark テーマ、#0d1117 背景）
  audio/
    context.ts         ← AudioContext シングルトン (getCtx / getMaster / setMasterVolume)
    drumSynth.ts       ← playDrum(id, time, gainMult) — 合成 or WAVサンプル
    pianoSynth.ts      ← playNote(midi, time, duration, params, gainMult)
  sequencer/
    state.ts           ← drumPat / pianoNotes / pianoNoteDurs / seqState / synthParams
    transport.ts       ← play() / stop() / onStep(cb) — ルックアヘッド25ms
    presets.ts         ← applyDrumPreset / randomizeDrums / applyPianoPreset
  project/
    schema.ts          ← ProjectData(v2) / Track / Clip 型定義
    tracks.ts          ← Track/Clipの全状態管理。選択・切替・mute/solo/volume
    io.ts              ← autosave(debounce300ms) / export / import / v1→v2 migration
  ui/
    drumSequencer.ts   ← buildDrumSequencer(container) / updateDrumPlayhead(step)
    pianoRoll.ts       ← initPianoRoll(canvas) / resize() / draw() — 2パス描画
    transportBar.ts    ← initTransportBar() / initSynthControls() / refreshSynthControls()
    trackList.ts       ← buildTrackList(container, onSelect) — M/S/VOL/rename
    clipBar.ts         ← buildClipBar(container, onSwitch) — per-track clip tabs
```

### Track / Clip モデル

```
Track（楽器）
  ├── id, name, type('drum'|'synth'), color
  ├── muted?, soloed?, volume?(0-100)
  ├── synth?: SynthParams  ← シンセ音色パラメータはTrack単位
  └── Clip[]（パターン）
        ├── id, name, steps
        ├── drums?: DrumGrid  ← ドラムトラック用
        ├── piano?: number[][] ← シンセトラック用
        └── pianoDurs?: Record<string,number>  ← ノート長（>1ステップのもの）
```

- 各Trackは複数Clipを持てる（択一再生）
- 選択中TrackのアクティブClipのデータは `drumPat` / `pianoNotes` / `pianoNoteDurs` のライブバッファに展開される
- `snapshotSelected()` でバッファ→Clipへフラッシュ（シリアライズ前に呼ぶ）
- `getPlaybackData()` で全Track分の再生データを返す（Transport が使う）

### 状態の流れ

```
ユーザー操作 → state.ts のバッファ更新 → draw() / buildDrumSequencer() で再描画
                                       → scheduleAutoSave() (300ms debounce)

再生中: transport.ts が 25ms ごとに 0.12sec 先読み
  → getPlaybackData() で全Track取得
  → playDrum(id, t, gainMult) / playNote(midi, t, dur*noteDur, params, gainMult)
  → onStep(cb) で UI更新 (プレイヘッド)
```

### ピアノロールのインタラクション

- **空白クリック** → ノート追加（クリック=追加、ドラッグ=選択rect）
- **ノートクリック** → 選択（Shift=選択追加、右クリック=削除）
- **ノートドラッグ** → 横（ステップ）＋縦（ピッチ）移動
- **右端ドラッグ** → ノート長リサイズ（白いハンドル）
- **Delete/Backspace** → 選択ノート削除
- **Escape** → 選択解除
- 描画は2パス: Pass1=グリッド背景、Pass2=ノート（常にグリッドの上）

---

## デプロイの仕組み

```
git push main
  → GitHub Actions (.github/workflows/deploy.yml)
    → npm ci → npx tsc --noEmit → npx vite build → dist/
    → JamesIves/github-pages-deploy-action → gh-pages ブランチへ push
  → GitHub Pages (Source: gh-pages ブランチ) が自動更新
```

GitHub Pages 設定: **Settings → Pages → Branch: gh-pages / (root)**

---

## よくある作業パターン

### トラックの初期構成を変える
`src/project/tracks.ts` の `resetToDefaults()` を編集。
デフォルトは Drum Kit + Bass + Melody の3トラック。

### ドラム音を追加する
`src/audio/drumSynth.ts` の switch 文に case を追加し、
`src/sequencer/state.ts` の `CHANNELS` 配列に `{ id, label, color }` を追加。

### シンセパラメータを追加する
1. `src/types.ts` の `SynthParams` に追加
2. `src/sequencer/state.ts` の `synthParams` 初期値に追加
3. `index.html` に `data-synth="newparam"` スライダーを追加
4. `src/audio/pianoSynth.ts` で `params.newparam` を使う

### ピアノロールの見た目を変える
`src/ui/pianoRoll.ts` の `draw()` を編集。
定数: `KEY_W=58 / CELL_W=36 / CELL_H=20 / NUM_H=18`

---

## 今後の方針

- **次の優先タスク候補**: ベロシティ per note、リバーブ/ディレイ per track、トラックボリュームのフェーダー表示改善
- **Arrangement View（将来）**: ClipをタイムラインのAbsolute位置に並べる。現在のSession View的な設計と互換性あり、Track/Clipモデルはそのまま使える
- **設計上の決定事項**:
  - プロジェクトは1つのみ（複数管理はexport/importで代替）
  - バックエンドなし、localStorage + JSONファイルのみ
  - WAV録音は対象外（WAV読み込みは実装済み）

---

## 注意事項
- `Python を使う場合は uv を使うこと`（ユーザー指定）
- `dist/` は gitignore 済み。ローカルの dist は参考用のみ
- CSS は `src/style.css` に集約（インラインスタイルは最小限）
- TypeScript strict モード: `noUnusedLocals` / `noUnusedParameters` 有効
- Windows 環境: Node.js が bash PATH に入っていないためフルパス使用
- localStorage キー: `sequencer_project`（スキーマ version 2）
