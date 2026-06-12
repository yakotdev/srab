## دليل مطوّر الثيمات لـ Storify (مشروع `theam`)

هذا الدليل يشرح بسرعة كيف تبني / تعدّل ثيماً في هذا المشروع بحيث يكون متوافقاً مع منصة **Storify**.

---

## 1. مكوّنات الثيم الأساسية

- **ملف المانيفست**: `theme-manifest.json`  
  - يعرّف:
    - اسم الثيم والنسخة.
    - إعدادات المظهر العامة `themeSettingsSchema` (ألوان، خطوط، زوايا…).
    - السكاشن المتاحة `sections` (HEADER, HERO_SLIDER, ...).
    - تركيب كل صفحة `pages` (أي سكشن يظهر في أي صفحة).

- **تطبيق الثيم**: `ThemeApp.tsx`  
  - يستقبل إعدادات الثيم من Storify عبر `postMessage` (نوع الرسالة `STORIFY_THEME_CONFIG`).
  - لو لم تصله إعدادات، يستخدم `mockConfig` كإعدادات افتراضية للتطوير المحلي.
  - يمرّر الإعدادات إلى:
    - `ThemeProvider` / `ThemeContext`.
    - `SectionRenderer` لعرض السكاشن.

- **الكونتكست**: `ThemeContext.tsx`  
  - يعرّف شكل `ThemeConfig`:
    - `layout`: ترتيب السكاشن.
    - `settings`: إعدادات المظهر (ألوان، خطوط، زوايا…).
    - `store`: بيانات المتجر (اسم، شعار، تواصل…).
  - يوفّر `useThemeConfig()` لاستخدام الإعدادات داخل السكاشن والمكوّنات.

- **عارض السكاشن**: `SectionRenderer.tsx`  
  - يقرأ `layout` من `ThemeContext`.
  - يقرر أي مكوّن React يستخدم لكل سكشن عبر `SECTION_MAP`.
  - يطبّق ترتيب المجموعات: رأس الصفحة، سكاشن المحتوى، الفوتر.

- **التحقق من توافق المانيفست مع `SECTION_MAP`:** بعد تعديل `theme-manifest.json` أو `SectionRenderer.tsx` شغّل:
  - `npm run validate-manifest`

- **ملف الـ CSS + الثيم**: `src/index.css`  
  - يعرّف متغيّرات الثيم:
    - `--brand-primary`, `--brand-accent`, `--brand-radius`, `--brand-font` …
  - هذه القيم تُضبط من `ThemeApp` حسب `config.settings`.

---

## 2. دورة حياة الثيم مع Storify

1. لوحة تحكم Storify ترسل إعدادات الثيم للـ iframe عبر:
   - `postMessage({ type: 'STORIFY_THEME_CONFIG', payload: { layout, settings, store, storeId } })`.
2. في `ThemeApp.tsx`:
   - نسمع رسالة `STORIFY_THEME_CONFIG` ونحوّل الـ `payload` إلى `ThemeConfig`.
   - نخزّن النتيجة في `config` (state).
3. عند تغيّر `config.settings`:
   - نكتب القيم في `document.documentElement.style` مثل:
     - `--brand-primary`, `--brand-accent`, `--brand-radius`, `--brand-font`.
4. السكاشن والمكوّنات تستخدم هذه المتغيّرات في Tailwind / CSS لعرض الشكل الصحيح.

---

## 3. بنية `layout` (السكاشن)

كل عنصر في `layout` بالشكل التالي:

```ts
interface LayoutSection {
  id: string;          // معرّف فريد داخلي (مثلاً hero-1)
  type: string;        // نوع السكشن، يجب أن يطابق SECTION_MAP (مثلاً HERO_SLIDER)
  enabled: boolean;    // مفعّل أو لا
  group?: string;      // مجموعة (header_group, template_group, footer_group)
  order?: number;      // ترتيب اختياري داخل المجموعة
  content?: Record<string, any>; // محتوى مخصص حسب السكشن
}
```

- **الأصل** للمحتوى وتعريف الحقول موجود في `theme-manifest.json` تحت `sections[*].contentSchema`.
- **القيم الفعلية** للمحتوى توضع في:
  - إعدادات المتجر من Storify (حقيقي).
  - أو `mockConfig.layout[*].content` (وقت التطوير المحلي).

---

## 4. كيف تضيف سكشن جديد (Section جديد)

1. **عرّف السكشن في المانيفست** `theme-manifest.json`:
   - أضف عنصر جديد في مصفوفة `sections`:

```json
{
  "id": "MY_SECTION",
  "name": "سكشن مخصص",
  "component": "MY_SECTION",
  "group": "template_group",
  "contentSchema": {
    "title": { "type": "text", "label": "العنوان", "default": "عنوان افتراضي" },
    "subtitle": { "type": "text", "label": "العنوان الفرعي" }
  }
}
```

2. **أنشئ مكوّن React** داخل `src/sections`:

```tsx
// src/sections/MySection.tsx
import React from 'react';
import { LayoutSection, useThemeConfig } from '../ThemeContext';

const MySection: React.FC<{ section: LayoutSection }> = ({ section }) => {
  const { t } = useThemeConfig();
  const content = section.content || {};

  return (
    <section className="py-16">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-black mb-2">
          {t(content.title || 'عنوان افتراضي')}
        </h2>
        {content.subtitle && (
          <p className="text-sm text-neutral-500">{t(content.subtitle)}</p>
        )}
      </div>
    </section>
  );
};

export default MySection;
```

3. **اربط السكشن في `SectionRenderer.tsx`**:

```ts
import MySection from './sections/MySection';

const SECTION_MAP = {
  // ...
  MY_SECTION: MySection,
};
```

4. **أضف السكشن في صفحة معيّنة** عن طريق:
   - إضافة عنصر في `pages[*].layout` داخل `theme-manifest.json`.
   - أو في `mockConfig.layout` في `ThemeApp.tsx` أثناء التطوير.

---

## 5. إعدادات المظهر (Colors, Radius, Fonts)

- تُعرَّف إعدادات المظهر في `theme-manifest.json` تحت `themeSettingsSchema`.
- مثال:

```json
"primaryColor": {
  "type": "color",
  "label": "اللون الأساسي",
  "default": "#0f172a"
},
"accentColor": {
  "type": "color",
  "label": "اللون المميز",
  "default": "#f27d26"
}
```

- في `ThemeApp.tsx`:
  - نقرأ `config.settings.primaryColor` و `config.settings.accentColor`، ثم نكتبها في:

```ts
root.style.setProperty('--brand-primary', s.primaryColor);
root.style.setProperty('--brand-accent', s.accentColor);
root.style.setProperty('--brand-radius', s.borderRadius);
root.style.setProperty('--brand-font', s.fontFamily);
```

- في `index.css` نستخدم هذه المتغيّرات في الثيم:
  - `--color-brand-primary: var(--brand-primary, #141414);`
  - `--radius-xl: var(--brand-radius, 1rem);`

---

## 6. تطوير وتجربة الثيم محلياً

1. تثبيت وتشغيل:

```bash
npm install
npm run dev
```

2. **صفحة المتجر العادية**:
   - المسار `/` يستخدم `App.tsx` (ثيم Umino الأصلي كموقع).

3. **صفحة معاينة الثيم مع Storify**:
   - المسار `/theme` يستخدم `ThemeApp` + `SectionRenderer`.
   - يمكن استخدام `StorifySimulator` لتعديل الإعدادات محلياً ثم إرسالها عبر `postMessage`.

4. لتعديل القيم الافتراضية للتصميم:
   - حدّث `mockConfig` في `ThemeApp.tsx` (layout + settings + store).

---

## 7. أفضل ممارسات

- حافظ على تطابق أسماء السكاشن:
  - `section.type` ↔ `sections[*].id` ↔ مكوّن React في `SECTION_MAP`.
- اجعل كل سكشن:
  - يعتمد على `section.content` فقط (لا يقرأ من مصادر عشوائية).
  - يستخدم `ThemeContext` للأشياء المشتركة (cart, wishlist, onAddToCart...).
- احرص أن تكون كل الحقول التي تضيفها في `contentSchema` موجودة / مدعومة في المكوّن نفسه.

هذا الدليل مختصر كي تبدأ بسرعة. عند توسعة الثيم، أضف الأقسام الجديدة إلى هذا الملف لتوثيقها لفريقك.

