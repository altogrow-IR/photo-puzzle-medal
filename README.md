# しゃしんパズルコレクション

ブラウザ上だけで動く、React / TypeScript / Vite 製の写真パズルアプリです。端末内の写真やスマホカメラで撮った写真を保存し、タイルパズルまたはジグソーパズルとして何度でも遊べます。

## アプリ概要

- 写真ファイル選択、スマホカメラ撮影に対応
- 3×3、4×4、5×5、6×6、8×8 のピース数を選択可能
- タイルパズルモードとジグソーパズルモードを選択可能
- Canvasで画像を縮小してからIndexedDBへ保存
- 保存済みパズルの一覧、再プレイ、削除に対応
- 完成時にメダルを1枚獲得
- メダル数に応じて称号を獲得
- GitHub Pages公開に対応

## パズルモード

### タイルパズル

四角いピースを入れ替えて完成させるパズルです。PCではドラッグ＆ドロップ、スマホでは2つのピースを順番にタップして入れ替えます。

### ジグソーパズル

ピースを自由に動かして、正しい場所にはめるパズルです。正解位置の近くで離すと自動で吸着し、吸着済みピースは固定されます。全ピースが吸着すると完成です。

ジグソーパズルではピース数が多いとスマホで操作しづらい場合があります。はじめは3×3または4×4がおすすめです。

## メダル・称号

パズルを完成するとメダルを1枚獲得します。メダル数はブラウザの `localStorage` に保存されます。

称号はメダル数に応じて更新されます。

- 0枚: パズルはじめました
- 3枚: パズル見習い
- 10枚: しゃしんコレクター
- 20枚: パズル名人
- 30枚: パズルマスター
- 50枚: 伝説のパズル勇者

## 使い方

1. ホーム画面で「写真パズルを追加」を押します。
2. 「写真を選ぶ」または「カメラで撮る」から画像を読み込みます。
3. パズル名、ピース数、パズルモードを選んで保存します。
4. 一覧の「遊ぶ」からパズルを開始します。
5. 完成するとメダルを1枚獲得できます。

## 保存データ

- IndexedDB: `photo-puzzle-medal-db`
- Object Store: `puzzles`, `images`
- localStorage: `photo-puzzle-medal:app-stats`

写真データはブラウザ内に保存されます。別端末や別ブラウザには自動同期されません。

既存の保存済みパズルに `mode` が無い場合は、自動的に `tile` として扱います。

## 開発方法

```bash
npm.cmd install
npm.cmd run dev
```

表示されたローカルURLをブラウザで開いて確認してください。

## ビルド方法

```bash
npm.cmd run build
```

ビルド結果は `dist/` に出力されます。

## GitHub Pages公開方法

このアプリは `vite.config.ts` で次のように設定しています。

```ts
base: "/photo-puzzle-medal/",
```

GitHubのリポジトリ名を `photo-puzzle-medal` にする場合は、このまま公開できます。別名にする場合は、`base` を `/<リポジトリ名>/` に変更してください。

GitHub Actionsで公開する場合は、以下のようなワークフローを `.github/workflows/deploy.yml` に追加します。

```yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

GitHubの `Settings > Pages` で Source を `GitHub Actions` に設定してから、`main` ブランチへpushしてください。
