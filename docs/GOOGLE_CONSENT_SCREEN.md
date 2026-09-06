# لماذا تعرض Google نطاقًا غريبًا: «للمتابعة إلى …»

## العَرَض

أثناء تسجيل الدخول بـ Google، بعد اختيار الحساب، تظهر للمستخدم عبارة:

> للمتابعة إلى **zvcynshexfffvxskqhet.supabase.co**

نطاق تقني لا يعني له شيئًا، في منتصف تجربة تسجيل الدخول.

## السبب — ليس في الكود

هذا النص تكتبه **Google**، وتأخذه من إعداد *شاشة موافقة OAuth* في
Google Cloud، لا من التطبيق. القاعدة التي تتبعها Google:

1. إن كان **App name** مضبوطًا في شاشة الموافقة → تعرضه.
2. إن لم يكن مضبوطًا → تعرض **نطاق `redirect_uri` المسجَّل**.

وفي تدفق Supabase، الـ `redirect_uri` المسجَّل في Google هو:

```
https://zvcynshexfffvxskqhet.supabase.co/auth/v1/callback
```

فيظهر نطاق Supabase. **هذه هي الحالة الثانية بالضبط.**

### إثبات أن التطبيق ليس المصدر

مُثبَّت باختبارات في `src/features/auth/__tests__/oauth.test.ts`:
التطبيق يمرّر إلى Supabase ثلاثة أشياء فقط —

```ts
{ provider: 'google', options: { redirectTo: 'hemma://auth/callback', skipBrowserRedirect: true } }
```

ولا يرسل `client_id` ولا `client_secret` ولا `redirect_uri` ولا أي شيء
يخص Google. ورابط التفويض الذي يبنيه `supabase-js`
(`_getUrlForProvider`) يحمل `provider` و`redirect_to` و`code_challenge`
و`code_challenge_method` و`skip_http_redirect` فقط — **كل ما يخص Google
يُبنى على خادم Supabase**.

**النتيجة: لا يمكن إصلاح هذا النص بأي تعديل في كود التطبيق.**

## الإصلاح — حقل واحد

Google Cloud Console → **APIs & Services** → **OAuth consent screen** →
**Branding / App information**:

| الحقل | القيمة |
|---|---|
| App name | `هِمّة` |
| User support email | `support@himmah.online` |
| App logo | `assets/branding/logo.svg` (حوّله PNG مربّعًا 120×120) |
| Application home page | `https://himmah.online` |
| Privacy policy link | `https://himmah.online/privacy.html` |
| Terms of service link | `https://himmah.online/terms.html` |

بعد الحفظ تصبح العبارة:

> للمتابعة إلى **هِمّة**

الأثر فوري تقريبًا ولا يحتاج بناءً جديدًا للتطبيق.

> **ملاحظة**: رفع شعار يضع التطبيق في حالة «يحتاج تحقّقًا» لدى Google.
> هذا لا يعطّل تسجيل الدخول — النطاقات الحساسة وحدها تتطلب مراجعة،
> و`email` و`profile` ليسا منها.

## تحسين اختياري: نطاق مخصّص

حتى بعد ضبط الاسم، تعرض Google أحيانًا النطاق في التفاصيل. لإخفائه
تمامًا يلزم **Supabase Custom Domain** (خطة مدفوعة) فيصبح الـ callback:

```
https://auth.himmah.online/auth/v1/callback
```

ويجب حينها تحديث الـ redirect URI في Google Cloud ليطابقه.

## الطريق البعيد: تسجيل دخول Google أصلي

`@react-native-google-signin/google-signin` يلغي المتصفح كليًا: منتقي
حسابات أصلي، ثم تبادل `idToken` مع Supabase عبر `signInWithIdToken` —
تمامًا كما يعمل تسجيل دخول Apple في هذا التطبيق اليوم.

**لم نطبّقه الآن عمدًا**: تسجيل الدخول الحالي يعمل، وهذا التغيير يتطلب
إنشاء **iOS OAuth client** جديد في Google Cloud وإضافة
`REVERSED_CLIENT_ID` كمخطط URL، أي مزيدًا من الإعداد الخارجي وخطرًا على
تدفق يعمل — مقابل إصلاح يحلّه حقل واحد. يبقى الخيار مفتوحًا متى أردنا
إلغاء المتصفح من التجربة.
