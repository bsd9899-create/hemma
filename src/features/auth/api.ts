import { supabase } from '@/src/data/supabase';
import { useProfileStore } from './profileStore';

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;

  // مسح الحالة المحلية فورًا بدل انتظار onAuthStateChange: يمنع وميض
  // بيانات المستخدم السابق لو تأخّر الحدث، ولا يمسّ أي بيانات في قاعدة
  // البيانات — الجلسة فقط هي ما يُنهى.
  useProfileStore.getState().clear();
}

/**
 * حذف الحساب نهائيًا — يستدعي Edge Function موثوقة (supabase/functions/
 * delete-account) لأن حذف auth.users يتطلب صلاحية admin لا تُمنح
 * للعميل مطلقًا. متطلب أساسي من Apple لأي تطبيق يسمح بإنشاء حساب.
 */
export async function deleteAccount() {
  const { error } = await supabase.functions.invoke('delete-account');
  if (error) throw error;
  await supabase.auth.signOut();
  useProfileStore.getState().clear();
}
