# 🌙 Luna English

Ứng dụng học tiếng Anh trên Android và iOS, tập trung vào học từ vựng qua flashcard và spaced repetition.

## Tính năng

- 📚 Học từ vựng theo bộ thẻ (decks)
- 🎴 Flashcard với thuật toán SRS (SM-2)
- 🔊 Phát âm bằng Text-to-Speech (native, miễn phí)
- ✅ Quiz nhiều dạng: trắc nghiệm, nhập đáp án, nghe-chọn, ghép cặp
- 🤖 AI sinh câu ví dụ qua Claude API
- 📈 Lộ trình học theo cấp độ CEFR (A1 → C2)

## Tech stack

- **Framework**: React Native + Expo SDK 52
- **Language**: TypeScript
- **Routing**: Expo Router (file-based)
- **Styling**: NativeWind (Tailwind CSS)
- **State**: Zustand
- **Local DB**: SQLite (`expo-sqlite`)
- **Speech**: `expo-speech`
- **Backend** (sắp tới): Supabase hoặc Node.js + Postgres

## Yêu cầu

- Node.js ≥ 20 (LTS)
- npm hoặc yarn
- Expo Go app trên điện thoại (iOS / Android)

## Bắt đầu

```bash
# Cài dependencies
npm install

# Chạy dev server
npm start

# Quét QR code bằng Expo Go app trên điện thoại
```

Các lệnh khác:

```bash
npm run ios       # Chạy trên iOS simulator (chỉ macOS)
npm run android   # Chạy trên Android emulator
npm run typecheck # Kiểm tra TypeScript
npm run lint      # Lint code
```

## Cấu trúc thư mục

```
app/             # Expo Router screens (file-based routing)
src/
  components/    # Reusable UI components
  hooks/         # Custom React hooks
  stores/        # Zustand stores
  services/      # API clients, speech, AI
  db/            # SQLite schema & queries
  lib/           # SRS algorithm, utilities
  types/         # TypeScript types
  constants/     # App constants
assets/          # Images, fonts
```

## Lộ trình phát triển

- [x] Setup project, structure, routing
- [x] SQLite schema, SRS algorithm
- [ ] CRUD flashcard UI
- [ ] Quiz flow (4 dạng câu hỏi)
- [ ] Backend với Supabase + auth
- [ ] Tích hợp Claude API sinh câu ví dụ
- [ ] Lộ trình lessons theo CEFR
- [ ] Build production cho App Store / Play Store

## License

MIT
