# しゃしんパズルコレクション

React / TypeScript / Vite 製の写真パズルアプリです。端末内の画像やカメラで撮った写真を保存し、タイルパズルまたはジグソーパズルとして遊べます。

公開URL:

https://altogrow-ir.github.io/photo-puzzle-medal/

## 主な機能

- 写真ファイル選択、スマホ・タブレットのカメラ撮影に対応
- タイルパズルとジグソーパズルを選択可能
- 3×3、4×4、5×5、6×6、8×8 のピース数を選択可能
- 写真Blobとパズル情報を IndexedDB に保存
- パズル途中経過の一時保存と「つづきから」再開
- 完成時のメダル、称号、完成画像保存
- GitHub Pages 公開に対応

## 保存データ

- IndexedDB: `photo-puzzle-medal-db`
- Object Store: `puzzles`, `images`, `progresses`
- localStorage: `photo-puzzle-medal:app-stats`

`progresses` は一時保存用です。1パズルにつき1件だけ保存し、同じパズルで保存した場合は上書きされます。完成時とパズル削除時には該当する一時保存データを削除します。

DBバージョンアップ時は既存の `puzzles` / `images` store を削除せず、追加storeだけを作成します。

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

## GitHub Pages 公開

`vite.config.ts` で以下の `base` を設定しています。

```ts
base: "/photo-puzzle-medal/",
```

Web版は GitHub Pages で公開する想定です。GitHub Actions を使う場合は、`Settings > Pages` の Source を `GitHub Actions` に設定してから `main` ブランチへ push してください。

## Androidアプリ化メモ

将来的に Capacitor で Android アプリ化する想定です。現時点では Capacitor 自体は導入していません。

想定手順:

```bash
npm.cmd run build
```

その後、Capacitor 導入後に Android プロジェクトへ Web ビルド成果物を反映します。

パッケージ名候補:

- おすすめ: `com.altogrow.photopuzzlemedal`
- 代替: `com.altogrow.shashinPuzzleCollection`

Google Play 公開時に必要な確認:

- 署名キーの作成と管理
- Play Console 登録
- 内部テスト、クローズドテスト、製品版リリースの確認
- ストア掲載情報の作成
- プライバシーポリシーの確認
- 写真保存や共有を追加する場合の権限確認

## Capacitor化しやすくするための構成

- 画像保存処理: `src/lib/download.ts`
- 完成画像生成: `src/lib/completionImage.ts`
- 端末情報: `src/lib/platform.ts`
- レスポンシブ判定: `src/hooks/useResponsiveLayout.ts`

将来 `@capacitor/filesystem` や `@capacitor/share` を使う場合は、まず `downloadBlob` の中身を差し替える想定です。
