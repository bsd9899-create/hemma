import { execSync } from 'child_process';

function grep(pattern: string, extra = ''): string {
  const cmd =
    `grep -rnE ${JSON.stringify(pattern)} app src --include=*.tsx --include=*.ts ` +
    `| grep -v "__tests__" | grep -v "test-support" ` +
    // أسطر التعليقات ليست كودًا: تعليق يشرح القاعدة ليس خرقًا لها.
    `| grep -vE ":\\s*(//|\\*|/\\*)" ${extra} || true`;
  return execSync(cmd, { cwd: process.cwd(), encoding: 'utf8', shell: '/bin/bash' }).trim();
}

/**
 * حراسة آلية لقواعد تعلّمناها من أخطاء حقيقية في هذا المشروع. كل قاعدة
 * هنا سببها عطل وقع فعلًا، لا تفضيل أسلوبي.
 */
describe('جودة الكود — قواعد مستخلَصة من أعطال وقعت', () => {
  it('لا اتجاه فيزيائي (left/right) — يكسر العربية', () => {
    // التطبيق عربي أولًا: 'row' الثابتة ترتّب من اليسار في واجهة RTL،
    // وmarginLeft يبقى يسارًا في الاتجاهين. البديل rowDirection والقيم المنطقية.
    expect(
      grep("flexDirection: 'row'|marginLeft|marginRight|paddingLeft|paddingRight|textAlign: '(left|right)'")
    ).toBe('');
  });

  it('لا console.error — يرفع LogBox فوق الواجهة', () => {
    // console.error في React Native يرفع شريط LogBox الأسود بالخطأ
    // التقني الخام فوق واجهة المستخدم. حدث هذا فعلًا وأظهر
    // {"code":"42501"} للمستخدم. التشخيص يمر عبر console.log.
    expect(grep('console\\.error')).toBe('');
  });

  it('لا مفاتيح ولا أسرار مكتوبة في الكود', () => {
    expect(grep('eyJ[A-Za-z0-9_-]{20,}|sk-ant-[A-Za-z0-9]{10,}|AIza[0-9A-Za-z_-]{20,}')).toBe('');
  });

  it('لا service_role في كود التطبيق إطلاقًا', () => {
    // مفتاح service_role يتجاوز RLS بالكامل. وجوده في حزمة الجوال يعني
    // أن أي مستخدم يستخرجه يقرأ ويكتب بيانات كل المستخدمين.
    expect(grep('service_role|SERVICE_ROLE')).toBe('');
  });

  it('لا بقايا تشخيص أو TODO معلّقة في مسار المستخدم', () => {
    expect(grep('debugger;|FIXME|XXX:')).toBe('');
  });

  it('كل شاشة تجلب بيانات من الخادم فيها سحب للتحديث', () => {
    // شاشة تعرض بيانات خادم بلا سحب للتحديث تترك المستخدم يسحب فلا
    // يحدث شيء، ولا يملك طريقة لمعرفة إن كان ما يراه قديمًا. اكتُشفت
    // ثلاث شاشات كذلك (المكتبة، تفاصيل التمرين، رفيق الالتزام).
    const cmd =
      'for f in $(grep -rl "useFocusEffect\|refetch" app --include=*.tsx); do ' +
      '  grep -q "ScrollView\|FlatList" "$f" || continue; ' +
      '  grep -q "RefreshControl" "$f" || echo "$f"; ' +
      'done';
    const missing = execSync(cmd, { cwd: process.cwd(), encoding: 'utf8', shell: '/bin/bash' }).trim();
    expect(missing).toBe('');
  });

  it('لا سعر اشتراك مكتوب يدويًا — السعر من المتجر وحده', () => {
    // العملة والضريبة تختلفان بالبلد؛ أي رقم ثابت يكذب على جزء من
    // المستخدمين ويخالف قواعد المتجر.
    expect(grep('19\\.99|99\\.99')).toBe('');
  });
});
