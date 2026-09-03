import { useTranslation } from 'react-i18next';
import { Text } from './Text';

/**
 * علامة نصية مؤقتة لاسم "هِمّة" بخط Tajawal الغامق ولون العلامة، إلى
 * حين توفّر ملف الشعار الرسمي الفعلي (راجع assets/branding/README.md)
 * لاستبدالها بصورة حقيقية. اسم العلامة نفسه لا يُترجَم حرفيًا — "هِمّة"
 * بالعربي و"HEMMA" بالإنجليزي، كما تفعل أغلب العلامات التجارية.
 */
export function Wordmark() {
  const { i18n } = useTranslation();
  const label = i18n.language === 'en' ? 'HEMMA' : 'هِمّة';

  return (
    <Text variant="displayLg" color="primary" style={{ textAlign: 'center' }}>
      {label}
    </Text>
  );
}
