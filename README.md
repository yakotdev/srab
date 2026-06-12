<p align="center">
  <a href="https://storify.it.com/" target="_blank" rel="noopener noreferrer">
    <img src="https://cdn.storify.it.com/powerdbystorify-black.svg" alt="Storify" width="220" />
  </a>
</p>

<h1 align="center">Srab</h1>

<p align="center">
  ثيم متجر رسمي لمنصة <strong>Storify</strong> — واجهة عربية أولاً، أقسام غنية، وقابلية تخصيص كاملة من محرر الثيمات.
</p>

<p align="center">
  <a href="https://storify.it.com/developers/themes/introduction"><strong>وثائق تطوير الثيمات</strong></a>
</p>

---

## تجهيز الثيم للرفع

```bash
npm install
npm run zip
```

ينتج الملف **`srab-theme.zip`** في جذر المشروع. من لوحة تحكم Storify: **الثيمات المرفوعة** → رفع ثيم → اختر الملف → **استخدام هذا الثيم**.

## التطوير المحلي

```bash
npm run dev          # معاينة محلية
npm run sync         # مزامنة مع متجر Storify
npm run build        # بناء dist/
npm run lint         # فحص TypeScript
```

## هيكل المشروع

| المسار | الوصف |
|--------|--------|
| `theme-manifest.json` | تعريف الأقسام، الصفحات، وإعدادات الثيم |
| `config/pages/` | المحتوى الافتراضي لكل صفحة |
| `src/sections/` | مكوّنات الأقسام |
| `public/locales/` | ترجمات الواجهة (عربي، إنجليزي، فرنسي) |

للتفاصيل التقنية الكاملة — بناء الثيم، الـ manifest، الـ SDK، والرفع — راجع **[دليل المطوّرين على Storify](https://storify.it.com/developers/themes/introduction)**.

## الترخيص

ثيم خاص بمنصة Storify. الاستخدام وفق شروط المنصة.
