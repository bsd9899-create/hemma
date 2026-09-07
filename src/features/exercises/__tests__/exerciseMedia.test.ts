import { isVideoUrl } from '../mediaKind';

/**
 * التمييز على الامتداد وحده: تشغيل مشغّل فيديو على صورة يعطي إطارًا
 * أسود بلا خطأ، وعرض صورة مكان فيديو يعطي إطارًا ساكنًا — كلاهما يفشل
 * بصمت، فالتمييز يستحق فحصًا صريحًا.
 */
describe('التمييز بين فيديو وصورة', () => {
  it.each([
    ['mp4', 'https://cdn.example.com/squat.mp4'],
    ['mov', 'https://cdn.example.com/squat.mov'],
    ['webm', 'https://cdn.example.com/squat.webm'],
    ['مع معطيات استعلام', 'https://cdn.example.com/squat.mp4?token=abc'],
    ['بحروف كبيرة', 'https://cdn.example.com/SQUAT.MP4'],
  ])('%s يُعامَل كفيديو', (_name, url) => {
    expect(isVideoUrl(url)).toBe(true);
  });

  it.each([
    ['gif متحرك', 'https://cdn.example.com/squat.gif'],
    ['webp', 'https://cdn.example.com/squat.webp'],
    ['jpg', 'https://cdn.example.com/squat.jpg'],
    ['بلا امتداد', 'https://cdn.example.com/squat'],
  ])('%s يُعامَل كصورة', (_name, url) => {
    expect(isVideoUrl(url)).toBe(false);
  });

  it('لا يخدعه اسم يحوي امتدادًا في وسطه', () => {
    expect(isVideoUrl('https://cdn.example.com/mp4-thumbnail.jpg')).toBe(false);
  });
});
