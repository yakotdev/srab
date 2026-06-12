# تشغيل لوحة الإدارة من shared/storefront

## 🚀 التشغيل السريع

### للتطوير (Development):
```bash
cd /var/www/storify/shared/storefront
npm install  # إذا لم تكن التبعيات مثبتة
npm run dev
```

سيتم تشغيل Vite dev server على `http://localhost:3000` (حسب vite.config.ts)

### للإنتاج (Production):
```bash
cd /var/www/storify/shared/storefront
npm install
npm run build
# ثم استخدم Apache لخدمة الملفات من مجلد dist/
```

## ⚙️ الإعدادات

### 1. Vite Dev Server (Development)
- **Port**: 3000 (حسب vite.config.ts)
- **URL**: http://localhost:3000
- **Hot Module Replacement**: مفعل تلقائيًا

### 2. Production Build
- **Output Directory**: `dist/`
- **Base Path**: `/` (يمكن تغييره في `vite.config.ts`)

## 🔧 تكوين Apache

### Development Mode:
Apache سيوجه الطلبات إلى Vite dev server على `localhost:3000`

### Production Mode:
1. قم بتعليق سطور ProxyPass في ملف Apache config
2. قم بإلغاء تعليق سطور DocumentRoot
3. أعد تحميل Apache

## 📝 ملاحظات

- **API Backend**: يجب أن يعمل على `localhost:5000` (أو المنفذ المحدد في `.env`)
- **CORS**: تم إعداد CORS في Apache config
- **WebSocket**: مفعل لدعم Vite HMR

## 🐛 استكشاف الأخطاء

### إذا لم يعمل Vite:
```bash
# تحقق من المنفذ
netstat -tlnp | grep 3000

# تحقق من السجلات
tail -f /var/log/apache2/app.storify.it.com_error.log
```

### إذا لم تعمل API:
```bash
# تحقق من Backend
cd /var/www/storify/shared/backend
npm run dev  # أو npm start
```

---

**تاريخ الإنشاء**: $(date)
