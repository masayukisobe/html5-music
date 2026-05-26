# ◈ HTML5 Music Sequencer

Web Audio API で動くブラウザ完結型の音楽シーケンサー。インストール不要、ファイル保存不要。

**デモ:** https://masayukisobe.github.io/html5-music/

---

## 機能

### マルチトラック
- **Drum Kit**（固定）＋ **Bass / Melody**（初期）＋ シンセトラックを自由に追加
- トラックごとに Mute / Solo / Volume 調整
- トラック名をダブルクリックでリネーム
- トラックごとに複数 Clip（パターン）を保持、択一再生

### ドラムシーケンサー（TR-808スタイル）
- 8チャンネル（KICK / SNARE / HIHAT C・O / CLAP / TOM H・L / BASS）
- 8 / 16 / 32 ステップ切り替え
- プリセット: Basic / Hip-Hop / Techno / Reggae
- ランダムパターン生成
- チャンネルごとに WAV サンプル読み込み可

### ピアノロール
- クリックでノート追加、右クリックで削除
- ノートをドラッグして横（ステップ）＋縦（ピッチ）移動
- 右端ドラッグでノート長リサイズ
- 範囲選択（ドラッグ）＋選択ノート一括移動
- Delete/Backspace で選択ノートを削除
- プリセット: Melody 1 / Arpeggio / Blues
- シンセパラメータ: Waveform / Attack / Decay / Sustain / Release / Detune / Oct Shift
- WAV サンプル読み込み（ピッチシフト再生）

### トランスポート
- BPM 40〜240、スイング調整
- マスターボリューム
- 300ms デバウンス autosave（localStorage）
- Export / Import（JSON ファイル）

---

## ローカル開発

```bash
git clone git@github.com:masayukisobe/html5-music.git
cd html5-music
npm install
npm run dev
# → http://localhost:5173/html5-music/
```

Claude Code からは `.claude/launch.json` の `"sequencer"` 設定で自動起動できる。

---

## デプロイ

`main` ブランチへ push すると GitHub Actions が自動で `gh-pages` ブランチへデプロイする。

```bash
git push
# → 1〜2分後に https://masayukisobe.github.io/html5-music/ に反映
```

---

## プロジェクト構成

```
src/
  main.ts / style.css / types.ts / notes.ts
  audio/      context / drumSynth / pianoSynth
  sequencer/  state / transport / presets
  project/    schema(v2) / tracks / io
  ui/         drumSequencer / pianoRoll / transportBar / trackList / clipBar
```

詳細は [ONBOARDING.md](ONBOARDING.md) を参照。
