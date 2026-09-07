/**
 * نوع الوسيط من رابطه — دالة صافية بلا أي وحدة أصلية.
 *
 * فُصلت عن ExerciseMedia لأن ذاك يستورد expo-video، فاختبار سطر واحد
 * من المنطق كان يتطلّب تمويه مشغّل فيديو كامل.
 */
const VIDEO_EXTENSIONS = /\.(mp4|mov|m4v|webm)(\?|$)/i;

export function isVideoUrl(url: string): boolean {
  return VIDEO_EXTENSIONS.test(url);
}
