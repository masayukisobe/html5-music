# HTML5 Music Sequencer — 開発コンテキスト

## このプロジェクトは何か
ブラウザ完結の音楽シーケンサー。Web Audio API + HTML5 Canvas + TypeScript + Vite。
GitHub Pages でホスト: https://masayukisobe.github.io/html5-music/

---

## すぐ始める

```bash
# 開発サーバー（Claude Code から launch.json の "sequencer" で起動可）
npm run dev          # http://localhost:5173/html5-music/

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
  main.ts              ← DOMContentLoaded ですべて配線
  audio/
    context.ts         ← AudioContext シングルトン (getCtx / getMaster)
    drumSynth.ts       ← playDrum(id, time) — 合成 or WAVサンプル
    pianoSynth.ts      ← playNote(midi, startTime, duration, params)
  sequencer/
    state.ts           ← drumPat{} / pianoNotes[] / seqState / synthParams
    transport.ts       ← play() / stop() / onStep(cb) — ルックアヘッド25ms
    presets.ts         ← applyDrumPreset / randomizeDrums / applyPianoPreset
  ui/
    drumSequencer.ts   ← buildDrumSequencer(container) / updateDrumPlayhead(step)
    pianoRoll.ts       ← initPianoRoll(canvas) / resize() / draw()
    transportBar.ts    ← initTransportBar() / initSynthControls()
  notes.ts             ← buildNoteList(octaves) → Note[] (上から下順)
  types.ts             ← Channel / Note / SynthParams
  style.css            ← 全CSS（dark テーマ、#0d1117 背景）
```

### 状態の流れ
- ユーザー操作 → `state.ts` の `drumPat` / `pianoNotes` を更新 → `draw()` / `buildDrumSequencer()` で再描画
- 再生中: `transport.ts` のスケジューラーが 25ms ごとに 0.12sec 先読みして `playDrum` / `playNote` を呼ぶ
- `onStep(cb)` で UI（プレイヘッド・ステップ表示）を更新

---

## デプロイの仕組み

```
git push main
  → GitHub Actions (.github/workflows/deploy.yml)
    → npm ci
    → npx tsc --noEmit (型チェック、エラーでも続行)
    → npx vite build → dist/
    → JamesIves/github-pages-deploy-action → gh-pages ブランチへ push
  → GitHub Pages (Source: gh-pages ブランチ) が自動更新
```

GitHub Pages 設定: **Settings → Pages → Branch: gh-pages / (root)**

---

## よくある作業パターン

### 音を追加する
`src/audio/drumSynth.ts` の `playDrum()` の switch 文に case を追加し、
`src/sequencer/state.ts` の `CHANNELS` 配列に `{ id, label, color }` を追加。

### プリセットを追加する
`src/sequencer/presets.ts` の `applyDrumPreset()` に case を追加。
`index.html` にボタン `<button class="btn" data-drum-preset="newname">` を追加。

### ピアノロールを変える
`src/ui/pianoRoll.ts` の `draw()` を編集。定数 `KEY_W=58 / CELL_W=36 / CELL_H=20 / NUM_H=18`。

### シンセパラメータを追加する
1. `src/types.ts` の `SynthParams` に追加
2. `src/sequencer/state.ts` の `synthParams` 初期値に追加
3. `index.html` に `data-synth="newparam"` スライダーを追加
4. `src/audio/pianoSynth.ts` で `params.newparam` を使う

---

## 注意事項
- `Python を使う場合は uv を使うこと`（ユーザー指定）
- `dist/` は gitignore 済み。ローカルの dist は参考用のみ
- CSS は `src/style.css` に集約（インラインスタイルは最小限）
- TypeScript strict モード: `noUnusedLocals` / `noUnusedParameters` 有効
- Windows 環境: Node.js が bash PATH に入っていないためフルパス or `dev.cmd` を使う
