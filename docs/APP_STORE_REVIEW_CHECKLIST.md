# قائمة تجهيز إطلاق هِمّة على App Store

⚠️ **راجع أحدث [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
قبل الإرسال فعليًا** — هذه القائمة مبنية على مراجعة تمت أثناء التخطيط
(أغسطس 2026)، وسياسات Apple تتغيّر.

## ✅ مكتمل في الكود

- [x] Bundle Identifier: `com.hemma.himah` (`app.json`) — مسجَّل فعليًا في
      Apple Developer Portal (App ID)، ومفعَّل عليه Sign In with Apple.
- [x] EAS build profiles (`eas.json`): development / preview / production
- [x] أيقونة وSplash تُولَّدان من `logo.svg` نفسه (`assets/branding/generate_icons.py`)
      بالهوية النهائية: أخضر `#0F2D23`، دمبل **أبيض**، كلمة «هِمّة» بالآيفوري.
      الأيقونة تستخدم تدرّجًا داكنًا مكان الصورة الطبيعية حتى تصل صورة
      الجبل الأصلية بدقة ≥1024px — والمولّد يرفض ما دونها بسبب معلن.
- [x] اسم التطبيق تحت الأيقونة «هِمّة» بتشكيلها، مطابقًا للشعار
      (كان «همة» بلا تشكيل) — يحرسه `appConfig.test.ts`
- [x] `expo-image` و`expo-video` مُعلَنتان في `app.json` بلا تشغيل خلفي
      ولا صورة داخل صورة: مقطع الأداء صامت ومتكرّر ولا يحتاج قدرات نظام
- [x] وصف صلاحية HealthKit بالعربي في `app.json`، صلاحيات قراءة فقط
      (لا كتابة)، بلا Background Delivery
- [x] حذف الحساب من داخل التطبيق (حسابي ← حذف حسابي نهائيًا) —
      Edge Function `delete-account` + تأكيد قبل الحذف
- [x] استعادة المشتريات (Restore Purchases) في شاشة هِمّة+
- [x] مسوّدة سياسة الخصوصية (`docs/PRIVACY_POLICY.md`)
- [x] مسوّدة بيانات App Store Connect (`docs/APP_STORE_METADATA.md`)
- [x] RLS تمنع أي مستخدم من رؤية بيانات آخر أو تعديل حالة اشتراكه —
      مُتحقَّق منه فعليًا (`supabase/scripts/verify-rls.sh`)

## ⏳ يحتاج حساب Apple Developer فعّال

- [ ] `eas login` + `eas init` + ربط Apple Team ID
- [ ] تسجيل Bundle Identifier في App Store Connect
- [ ] Certificates/Provisioning Profiles (تديرها EAS تلقائيًا بعد الربط)
- [ ] إنشاء منتجَي هِمّة+ (**شهري 19.99 · ثلاثة أشهر 49.99 ريال**) في
      App Store Connect → ربطهما بـ RevenueCat بنوعَي الحزمة `MONTHLY`
      و`THREE_MONTH` واستحقاق `premium`. لا يوجد placeholder في الكود:
      جدار الدفع يقرأ ما يرسله المتجر، ويعرض شاشة "غير مفعّلة" حتى ذلك.
- [ ] بناء EAS Dev Client فعلي واختبار HealthKit على جهاز iPhone حقيقي
      (راجع التحذير في `src/integrations/health/healthkit.ts`)
- [ ] تعبئة استبيان App Privacy في App Store Connect (البنية جاهزة في
      `docs/APP_STORE_METADATA.md`)
- [ ] TestFlight: رفع أول build داخلي للاختبار قبل المراجعة العامة

## ⏳ يحتاج قرارات/محتوى من المالك

- [ ] استبدال أيقونة/Splash المُعاد بناؤها بملف الشعار الرسمي الأصلي (PNG/SVG شفاف نظيف) إن توفر — اختياري، الحالي مطابق للألوان والشكل فعليًا
- [ ] مراجعة قانونية لسياسة الخصوصية ونشرها على رابط عام حقيقي
- [ ] رابط دعم فني (بريد أو صفحة) لإدراجه في App Store Connect
- [ ] لقطات شاشة فعلية بجميع مقاسات الأجهزة المطلوبة
- [ ] تسعير هِمّة+ الفعلي (يُحدَّد عند إنشاء المنتجات في App Store Connect)

## قبل كل إرسال (Submission)

1. تأكد أن CI/الاختبارات المحلية خضراء: `npm run typecheck && npm test`
2. تأكد أن `supabase/apply_all.sql` مُطبَّق بالكامل على مشروع Supabase
   الإنتاجي (وليس فقط بيئة التطوير)
3. تأكد أن مفاتيح RevenueCat/Supabase في `.env` الخاصة بالبناء
   الإنتاجي **ليست** مفاتيح تطوير
4. لا تترك أي نص "قيد التطوير/مؤقت" ظاهرًا في واجهة المستخدم الفعلية
5. جرّب تدفق الحذف والاشتراك والاستعادة يدويًا على جهاز حقيقي قبل الإرسال
