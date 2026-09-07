import { useEffect, useState, type ReactNode } from 'react';
import { Animated, type ViewStyle } from 'react-native';
import { duration, ENTER_OFFSET } from '../motion';
import { useReducedMotion } from '../useReducedMotion';

/**
 * ظهور المحتوى بعد انتهاء التحميل.
 *
 * الغرض ربط الهيكل العظمي بما حلّ محلّه، لا التزيين: الاستبدال المفاجئ
 * في إطار واحد يُقرأ كقفزة، وهذه الحركة القصيرة تجعله انتقالًا.
 *
 * ‏`reduceMotion` يلغيها تمامًا — يظهر المحتوى فورًا بلا شفافية ولا
 * إزاحة. لا نصف حركة: من فعّل الإعداد لا يريد حركة أبطأ، يريد ألّا تكون.
 */
export function Appear({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const reduceMotion = useReducedMotion();
  // useState لا useRef: قاعدة react-hooks/refs تمنع قراءة .current أثناء
  // العرض، وAnimated.Value ليس مرجعًا يتغيّر بل قيمة تُنشأ مرة — وهو
  // النمط نفسه المستعمل في Skeleton.
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: duration.enter,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, reduceMotion]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [ENTER_OFFSET, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
