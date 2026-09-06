"""يولّد أيقونات التطبيق من الشعار الرسمي نفسه.

قبل هذا كان السكربت يرسم دمبلًا وحده، فلم تحمل أيقونة التطبيق كلمة
«هِمّة» إطلاقًا — بينما ملف الهوية (brand-identity.png) يعرض الأيقونة
كالشعار كاملًا على مربّع أخضر. الآن نُصيّر `logo.svg` نفسه، فيستحيل أن
تنحرف الأيقونة عن الشعار: مصدرهما واحد.

التشغيل:
    python3 assets/branding/generate_icons.py

يتطلب: pillow, cairosvg
"""

import io
from pathlib import Path

import cairosvg
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "assets"
LOGO = Path(__file__).resolve().parent / "logo.svg"

# ألوان ملف الهوية — assets/branding/README.md
GREEN = "#0F3D3E"   # أخضر أساسي
BEIGE = "#D9C3A6"   # بيج (الدمبل)
IVORY = "#F7F3EE"   # أوف وايت
WHITE = "#FFFFFF"

GREEN_RGBA = (15, 61, 62, 255)
TRANSPARENT = (0, 0, 0, 0)

# نسبة ما يشغله الشعار من عرض الأيقونة. أقل من ذلك يبدو ضائعًا، وأكثر
# يلامس الحواف فتقصّه أقنعة النظام المستديرة.
LOGO_WIDTH_RATIO = 0.62


def render_logo(width: int, wordmark_color: str, dumbbell_color: str = BEIGE) -> Image.Image:
    """يُصيّر الشعار بلونين قابلين للتبديل.

    لون الكلمة يتبدّل حسب الخلفية: أخضر على الفاتح، وأوف وايت على
    الداكن. الدمبل يبقى بيجًا في الحالتين كما في ملف الهوية.
    """
    svg = LOGO.read_text()
    svg = svg.replace(GREEN, wordmark_color).replace(BEIGE, dumbbell_color)
    png = cairosvg.svg2png(bytestring=svg.encode(), output_width=width)
    return Image.open(io.BytesIO(png)).convert("RGBA")


def compose(canvas_size: int, background, wordmark_color: str, dumbbell_color: str = BEIGE) -> Image.Image:
    canvas = Image.new("RGBA", (canvas_size, canvas_size), background)
    logo = render_logo(round(canvas_size * LOGO_WIDTH_RATIO), wordmark_color, dumbbell_color)

    # نتوسّط حدود المحتوى الفعلية لا حدود الملف: للـSVG هامش شفاف غير
    # متماثل، فالتوسيط على أبعاده يترك الشعار مائلًا بصريًا.
    bbox = logo.getbbox() or (0, 0, logo.width, logo.height)
    cropped = logo.crop(bbox)
    x = (canvas_size - cropped.width) // 2
    y = (canvas_size - cropped.height) // 2
    canvas.alpha_composite(cropped, (x, y))
    return canvas


def main() -> None:
    ASSETS.mkdir(exist_ok=True)

    # أيقونة iOS: الشعار بالأوف وايت على الأخضر — كما في ملف الهوية.
    compose(1024, GREEN_RGBA, IVORY).convert("RGB").save(ASSETS / "icon.png")
    compose(48, GREEN_RGBA, IVORY).save(ASSETS / "favicon.png")

    # أندرويد: الطبقة الأمامية شفافة، والخلفية لون مصمت — يفرضها النظام.
    compose(512, TRANSPARENT, IVORY).save(ASSETS / "android-icon-foreground.png")
    Image.new("RGBA", (512, 512), GREEN_RGBA).save(ASSETS / "android-icon-background.png")

    # الأحادية: النظام يعيد تلوينها، فتُصدَّر بالأبيض كاملة (الشكل وحده يهم).
    compose(432, TRANSPARENT, WHITE, WHITE).save(ASSETS / "android-icon-monochrome.png")

    # شاشة البدء: الشعار على خلفية أوف وايت، بالأخضر.
    splash = compose(1024, TRANSPARENT, GREEN)
    splash.save(ASSETS / "splash-icon.png")

    print(f"تم توليد الأيقونات من {LOGO.name} في {ASSETS}")


if __name__ == "__main__":
    main()
