## MySQL設定手順

### 1. MySQLのインストール
- Windowsの場合: XAMPP、MySQL Workbenchなどをインストール
- Macの場合: Homebrew等でインストール
- Linuxの場合: `sudo apt-get install mysql-server`

### 2. データベース作成
MySQLコンソールまたはMySQL Workbenchで以下を実行:

```sql
CREATE DATABASE relay_stopwatch;
CREATE USER 'your_username'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON relay_stopwatch.* TO 'your_username'@'localhost';
FLUSH PRIVILEGES;
```

### 3. 環境変数設定
`.env`ファイルを編集:
```
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=relay_stopwatch
DB_PORT=3306
```

### 4. 依存関係インストール
```bash
# プロジェクトの依存関係をインストール
npm install

# 開発用の依存関係をインストール
npm install -D @vitejs/plugin-react react react-dom
npm install -D tailwindcss postcss autoprefixer
npm install socket.io-client

# Tailwind CSSの初期化
npx tailwindcss init -p
```

### 5. 開発サーバーの起動
```bash
# バックエンドサーバーを起動（ポート5000）
npm run server

# 別のターミナルでフロントエンドサーバーを起動（ポート3000）
npm run dev
```

### トラブルシューティング
- MySQLサーバーが起動していることを確認
- 接続情報（ホスト、ユーザー、パスワード）を確認
- ファイアウォールの設定を確認
