# Phase E — Mobile Integration Guide

Hướng dẫn áp dụng auth + sync vào codebase Luna English hiện tại (Phase D).

## 1. Cài thêm dependencies

```bash
cd /path/to/luna-english
npm install zustand@^5 # đã có
# Không cần thêm gì — AsyncStorage đã có sẵn từ Phase D
```

## 2. Config API URL

Mở `app.json`, thêm vào `expo.extra`:

```json
{
  "expo": {
    ...
    "extra": {
      "apiUrl": "http://localhost:3000"
    }
  }
}
```

> Trên iOS simulator: `http://localhost:3000` work bình thường.
> Trên Android emulator: dùng `http://10.0.2.2:3000` (đặc biệt của AVD).
> Trên thiết bị thật cùng wifi: dùng IP máy dev (`http://192.168.x.x:3000`).
> Production: dùng HTTPS domain thật.

Cách linh hoạt hơn — dùng env qua `EXPO_PUBLIC_API_URL` ở `.env.local`:

```
EXPO_PUBLIC_API_URL=http://192.168.1.50:3000
```

API client đã ưu tiên đọc env trước, fallback về `app.json`.

## 3. Copy files mới vào project

Cấu trúc files mới cần thêm:

```
src/
  services/
    api/
      client.ts        ← MỚI
      auth.ts          ← MỚI
      sync.ts          ← MỚI
      dictionary.ts    (giữ nguyên)
    sync/
      index.ts         ← MỚI
  stores/
    authStore.ts       ← MỚI (thay thế userStore.ts)
    userStore.ts       ← XÓA hoặc giữ làm tham khảo
  db/
    schema.ts          ← THAY THẾ
    queries.ts         ← THAY THẾ

app/
  _layout.tsx          ← THAY THẾ
  (auth)/
    _layout.tsx        ← MỚI
    login.tsx          ← MỚI
    register.tsx       ← MỚI
  (tabs)/
    profile.tsx        ← THAY THẾ
```

Copy theo thứ tự trên. Sau khi copy `authStore.ts`, bạn sẽ thấy lỗi TS ở các file vẫn import `userStore` → bước 4.

## 4. Migrate từ userStore sang authStore

Search trong project:

```bash
grep -rn "useUserStore" src/ app/
```

Mỗi chỗ tìm thấy:

- `useUserStore` → `useAuthStore`
- `user.email`, `user.displayName`, `user.level` vẫn dùng được (same shape)
- `setUser({...})` → `setAuth(user, token)` (chỉ ở login/register flow)
- `logout()` API y hệt → không đổi

## 5. Kiểm tra `queries.ts` đã có schedulePush

File `queries.ts` mới đã import:

```typescript
import { schedulePush } from '@/services/sync';
```

Mỗi mutation (create/update/delete deck/card, applyReview) đều gọi `schedulePush()` sau khi thành công. Đây là background sync — debounced 5s, không block UI.

## 6. Test flow end-to-end

### Bước 6.1: Chạy backend

```bash
cd luna-api
docker compose up -d
cp .env.example .env
# Edit .env: paste JWT_SECRET random
npm install
npm run db:migrate     # tạo schema
npm run dev            # start ở port 3000
```

Test health:

```bash
curl http://localhost:3000/health
# {"status":"ok","timestamp":"..."}
```

### Bước 6.2: Chạy mobile

```bash
cd luna-english
npm start
```

Mở Expo Go trên điện thoại, scan QR.

### Bước 6.3: Test scenarios

**Scenario A — User mới:**
1. Mở app → thấy màn login
2. Tap "Đăng ký" → điền form → submit
3. Vào tab Profile → thấy email/name → "Đồng bộ ngay" → success
4. Tạo 1 deck + vài card
5. Đợi 5s hoặc tap "Đồng bộ ngay"
6. Kiểm tra DB server: `npm run db:studio` → thấy decks + cards

**Scenario B — Sync 2 thiết bị:**
1. Login cùng account trên 2 máy (hoặc simulator + thiết bị thật)
2. Máy A: tạo deck "Test"
3. Máy A → Profile → Sync now
4. Máy B → Profile → Sync now
5. Máy B → tab Decks → thấy deck "Test"

**Scenario C — Conflict (LWW):**
1. Tắt mạng 2 máy
2. Máy A: rename deck "Test" → "Test A"
3. Máy B: rename deck "Test" → "Test B"
4. Bật mạng, máy A sync trước, máy B sync sau
5. Cả 2 máy đều thấy "Test B" (last writer wins — máy B sync sau, updated_at lớn hơn)

**Scenario D — Logout giữ data:**
1. Logout từ Profile
2. Quay lại login, login user khác
3. App vẫn còn data của user cũ (offline-first nguyên tắc giữ nguyên local data)
4. **Lưu ý**: đây là behavior tạm thời. Phase F sẽ thêm "Clear local data on logout" tùy chọn.

## 7. Edge cases và gotchas

### Token hết hạn
Backend ký JWT với `expiresIn: 30d`. Khi token expired:
- API client tự detect 401 → gọi `logout()` → auth gate đẩy về login
- Không cần xử lý gì ở UI

### Network down khi sync
`schedulePush()` không retry — nếu fail thì lần mutation tiếp theo sẽ trigger lại.
Khi user open app foreground (`_layout.tsx`), sync sẽ chạy lại.

### Migration từ Phase D
Người dùng đã có DB Phase D (không có `updated_at` cho cards). Khi update app:
- `schema.ts` mới có `runMigrations()` tự thêm columns thiếu
- DB cũ vẫn dùng được, không mất data
- Lần sync đầu sẽ push toàn bộ local data lên server

### Sync conflict với card đang học
Nếu user đang ở giữa study session và sync về review của thiết bị khác:
- Card đang học sẽ tiếp tục với SRS state local
- Sau khi session kết thúc, applyReview() ghi state mới → updated_at mới → push lên server
- Server áp LWW → state local (mới hơn) thắng

### Sync rate limit
Hiện tại backend không rate limit `/sync/*`. Trước khi production:

```bash
npm install @fastify/rate-limit
```

Thêm vào `server.ts`:

```typescript
await app.register(import('@fastify/rate-limit'), {
  max: 60,
  timeWindow: '1 minute',
});
```

## 8. Phase E checklist

- [ ] Backend chạy được local (`npm run dev`)
- [ ] Register/login flow hoạt động trên mobile
- [ ] Tạo deck trên mobile → thấy ở Postgres
- [ ] Đăng nhập cùng account ở thiết bị 2 → pull được data
- [ ] Edit cùng deck trên 2 máy → LWW work
- [ ] Soft delete deck → sync về thiết bị khác cũng delete
- [ ] App offline vẫn dùng được, online lại tự sync
- [ ] Token persist qua restart app (kill app rồi mở lại vẫn đăng nhập)
- [ ] Logout clear token nhưng giữ local DB
- [ ] Migration từ DB Phase D → Phase E không mất data

## 9. Sau Phase E — gợi ý Phase F

Khi Phase E xong, bạn đã có foundation cho:

- **Phase F (Claude AI)**: Backend đã có infra → thêm endpoint `/ai/generate-example`, lưu API key Anthropic trong env, không expose ra mobile.
- **Phase G (CEFR lessons)**: Có server → host content (lessons, decks mẫu A1-C2) trong Postgres, mobile pull về.
- **Phase H (Production)**: Deploy backend lên Fly.io/Railway/Render, build mobile EAS, publish lên stores.

Khi nào muốn đi tiếp Phase F, ping mình.
