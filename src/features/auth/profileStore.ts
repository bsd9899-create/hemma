import { create } from 'zustand';
import { profileRepository, type Profile } from '@/src/data/repositories/profileRepository';
import { getFriendlyErrorMessage } from '@/src/lib/errors';

type ProfileState = {
  profile: Profile | null;
  isLoading: boolean;
  /** true بعد أول محاولة جلب (نجحت أو فشلت) — يميّز "لم نجلب بعد" عن "لا يوجد ملف". */
  hasLoaded: boolean;
  /**
   * سبب فشل آخر محاولة جلب، إن فشلت. مهم للتنقل: بدونه يبدو فشل الجلب
   * (شبكة/RLS) مطابقًا تمامًا لحالة "مستخدم جديد لم يُكمل onboarding"،
   * فيُرسَل مستخدم أكمل onboarding فعلًا ليعيدها من جديد.
   */
  loadError: string | null;
  /** يُعاد جلبه من root layout عند تغيّر الجلسة، ومن onboarding بعد الحفظ. */
  fetch: () => Promise<void>;
  clear: () => void;
};

/**
 * حالة عامة لملف المستخدم الحالي (وليست hook محلي) — لأن أكثر من
 * مكان يحتاج قراءتها (حارس التنقل في app/_layout) وتحديثها (شاشة
 * onboarding) وكلاهما يجب أن يريا نفس النسخة الحديثة فورًا.
 */
export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  isLoading: false,
  hasLoaded: false,
  loadError: null,
  fetch: async () => {
    set({ isLoading: true });
    try {
      const profile = await profileRepository.getCurrent();
      set({ profile, isLoading: false, hasLoaded: true, loadError: null });
    } catch (e) {
      set({ isLoading: false, hasLoaded: true, loadError: getFriendlyErrorMessage(e) });
    }
  },
  clear: () => set({ profile: null, isLoading: false, hasLoaded: false, loadError: null }),
}));
