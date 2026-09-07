import { useVideoPlayer, VideoView } from 'expo-video';
import { Image } from 'expo-image';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/src/design-system';
import { isVideoUrl } from './mediaKind';
import { colors } from '@/src/design-system/colors';
import { radius, spacing } from '@/src/design-system/spacing';

/**
 * وسيط أداء التمرين — يُعرض فقط بترخيص معروف.
 *
 * الشرط في الكود لا في النية: `media_url` وحده لا يكفي، فبدون
 * `media_license` لا يُعرض شيء. رابط أُضيف على عجل بلا تسجيل ترخيصه
 * لا يظهر للمستخدم، وهو ما يجعل السياسة قابلة للتنفيذ لا مجرّد وعد
 * في ملف — راجع docs/EXERCISE_MEDIA.md.
 */

type Props = {
  /** الرابط المرخَّص. */
  url: string;
  /** الإسناد المطلوب بنص الترخيص، إن وُجد. */
  attribution: string | null;
  /** وصف بديل لقارئ الشاشة — اسم التمرين. */
  label: string;
};

export function ExerciseMedia({ url, attribution, label }: Props) {
  const { t } = useTranslation();
  const isVideo = isVideoUrl(url);

  return (
    <View style={{ gap: spacing.xs }}>
      {isVideo ? (
        <ExerciseVideo url={url} label={label} />
      ) : (
        <Image
          source={url}
          accessible
          accessibilityLabel={t('exercises.mediaLabel', { name: label })}
          contentFit="cover"
          transition={200}
          style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md, backgroundColor: colors.surfaceAlt }}
        />
      )}
      {/*
        الإسناد شرط في تراخيص كثيرة (Creative Commons وغيرها)، وإسقاطه
        يُبطل الترخيص نفسه. يُعرض هنا لا في ملف بعيد.
      */}
      {attribution ? (
        <Text variant="caption" color="textSecondary">
          {attribution}
        </Text>
      ) : null}
    </View>
  );
}

function ExerciseVideo({ url, label }: { url: string; label: string }) {
  const { t } = useTranslation();
  /*
   * مقاطع أداء التمارين قصيرة ويُنظر إليها مرارًا أثناء التمرين، فالتكرار
   * التلقائي بلا صوت هو السلوك الصحيح: لا يفاجئ أحدًا بصوت في الصالة،
   * ولا يطلب ضغطة قبل كل مشاهدة.
   */
  const player = useVideoPlayer(url, (instance) => {
    instance.loop = true;
    instance.muted = true;
    instance.play();
  });

  return (
    <VideoView
      player={player}
      accessible
      accessibilityLabel={t('exercises.mediaLabel', { name: label })}
      nativeControls={false}
      contentFit="cover"
      style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md, backgroundColor: colors.surfaceAlt }}
    />
  );
}
