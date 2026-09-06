"""يولّد أيقونات التطبيق من الشعار الرسمي نفسه.

المصدر دائمًا `logo.svg`، فيستحيل أن تنحرف الأيقونة عن الشعار.

الخلفية: ملف الهوية ينصّ على «صورة طبيعية داكنة + الشعار بالأوف وايت».
لذلك يقبل السكربت صورة:

    python3 assets/branding/generate_icons.py path/to/mountain.jpg

وبلا صورة يولّد أرضية خضراء داكنة بتدرّج عمق — حادّة في كل المقاسات
ومطابقة للهوية. راجع assets/branding/README.md.

يتطلب: pillow, cairosvg
"""

import io
import sys
from pathlib import Path

import cairosvg
from PIL import Image, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "assets"
LOGO = Path(__file__).resolve().parent / "logo.svg"

# ألوان ملف الهوية — لا تُعدَّل هنا وحدها
GREEN = "#0F2D23"   # أخضر أساسي
IVORY = "#F7F3EE"   # أوف وايت
SAGE = "#A7B8B1"    # رمادي ثانوي
WHITE = "#FFFFFF"

GREEN_RGB = (15, 45, 35)
GREEN_RGBA = (*GREEN_RGB, 255)
TRANSPARENT = (0, 0, 0, 0)

# نسبة عرض الشعار من الأيقونة. أقل يبدو ضائعًا، وأكثر يلامس الحواف
# فتقصّه أقنعة النظام المستديرة.
LOGO_WIDTH_RATIO = 0.62

# أقل عرض مقبول لصورة الخلفية. أصغر من ذلك يُكبَّر فيَنعُم ويظهر باهتًا
# على شاشات Retina — وأيقونة ناعمة أسوأ من أيقونة بلا صورة.
MIN_PHOTO_WIDTH = 1024


def render_logo(width: int, wordmark: str, dumbbell: str = WHITE) -> Image.Image:
    """يُصيّر الشعار بلونين قابلين للتبديل حسب الخلفية."""
    svg = LOGO.read_text().replace(GREEN, wordmark).replace(WHITE, dumbbell)
    png = cairosvg.svg2png(bytestring=svg.encode(), output_width=width)
    return Image.open(io.BytesIO(png)).convert("RGBA")


def depth_gradient(size: int) -> Image.Image:
    """أرضية خضراء بتدرّج عمق — بديل الصورة حين لا تتوفّر.

    ليست لونًا مصمتًا: تدرّج خفيف من الأعلى الفاتح إلى الأسفل الداكن
    يعطي إحساس العمق نفسه الذي تعطيه صورة الجبال، ويبقى حادًّا في كل
    المقاسات لأنه مولَّد لا مُكبَّر.
    """
    base = Image.new("RGB", (size, size), GREEN_RGB)
    grad = Image.new("L", (1, size))
    for y in range(size):
        # أفتح قليلًا في الأعلى (سماء) وأغمق في الأسفل (أرض)
        grad.putpixel((0, y), int(38 * (1 - y / size)))
    overlay = Image.new("RGB", (size, size), SAGE)
    return Image.composite(overlay, base, grad.resize((size, size)))


def photo_ground(path: Path, size: int) -> Image.Image:
    """يقصّ الصورة مربّعًا ويعتّمها حتى يقرأ الشعار فوقها."""
    img = Image.open(path).convert("RGB")
    if min(img.size) < MIN_PHOTO_WIDTH:
        raise SystemExit(
            f"الصورة {img.size[0]}×{img.size[1]} أصغر من {MIN_PHOTO_WIDTH}px. "
            "تكبيرها ينتج أيقونة ناعمة على شاشات Retina — استخدم الأصل عالي الدقة."
        )

    side = min(img.size)
    left = (img.width - side) // 2
    top = (img.height - side) // 2
    square = img.crop((left, top, left + side, top + side)).resize((size, size), Image.LANCZOS)

    # تعتيم + خفض تشبّع: الشعار بالأوف وايت يحتاج أرضية هادئة ليُقرأ،
    # وصورة كاملة السطوع تبتلعه عند المقاسات الصغيرة.
    square = ImageEnhance.Brightness(square).enhance(0.55)
    square = ImageEnhance.Color(square).enhance(0.7)
    tint = Image.new("RGB", (size, size), GREEN_RGB)
    return Image.blend(square, tint, 0.35)


def compose(size: int, ground, wordmark: str, dumbbell: str = WHITE) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    if isinstance(ground, Image.Image):
        canvas.paste(ground.resize((size, size), Image.LANCZOS), (0, 0))
    else:
        canvas = Image.new("RGBA", (size, size), ground)

    logo = render_logo(round(size * LOGO_WIDTH_RATIO), wordmark, dumbbell)
    # نتوسّط حدود المحتوى الفعلية لا حدود الملف: هامش الـSVG الشفاف غير
    # متماثل، والتوسيط على أبعاده يترك الشعار مائلًا بصريًا.
    bbox = logo.getbbox() or (0, 0, logo.width, logo.height)
    cropped = logo.crop(bbox)
    canvas.alpha_composite(cropped, ((size - cropped.width) // 2, (size - cropped.height) // 2))
    return canvas


def main() -> None:
    photo = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else None
    ground = photo_ground(photo, 1024) if photo else depth_gradient(1024)
    source = photo.name if photo else "تدرّج أخضر داكن (بلا صورة)"

    ASSETS.mkdir(exist_ok=True)

    # iOS: بلا شفافية إطلاقًا — يرفضها App Store.
    compose(1024, ground, IVORY).convert("RGB").save(ASSETS / "icon.png")
    compose(48, ground, IVORY).convert("RGB").save(ASSETS / "favicon.png")

    # أندرويد: الأمامية شفافة والخلفية مصمتة — يفرضه النظام.
    compose(512, TRANSPARENT, IVORY).save(ASSETS / "android-icon-foreground.png")
    Image.new("RGBA", (512, 512), GREEN_RGBA).save(ASSETS / "android-icon-background.png")
    # الأحادية يعيد النظام تلوينها، فالشكل وحده يهم.
    compose(432, TRANSPARENT, WHITE, WHITE).save(ASSETS / "android-icon-monochrome.png")

    # شاشة البدء على خلفية الأوف وايت: الشعار بالأخضر والدمبل بالأخضر
    # أيضًا — الدمبل الأبيض يختفي على أرضية فاتحة.
    compose(1024, TRANSPARENT, GREEN, GREEN).save(ASSETS / "splash-icon.png")

    print(f"تم توليد الأيقونات من {LOGO.name} — الخلفية: {source}")


if __name__ == "__main__":
    main()
