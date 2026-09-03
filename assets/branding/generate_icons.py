#!/usr/bin/env python3
"""
يولّد كل أيقونات هِمّة من مصدر واحد: علامة الدمبل المتجهية بنسب الشعار
الرسمي (راجع logo.svg وREADME.md في نفس المجلد).

التشغيل:
    pip install cairosvg pillow
    python3 assets/branding/generate_icons.py

يكتب (ويستبدل) الملفات التالية:
    assets/icon.png                     1024×1024  دمبل ذهبي على تيل داكن
    assets/favicon.png                    48×48    نسخة مصغّرة منها (ويب)
    assets/android-icon-foreground.png   512×512   دمبل ذهبي، خلفية شفافة
    assets/android-icon-background.png   512×512   تيل داكن صلب
    assets/android-icon-monochrome.png   432×432   نفس الشكل أبيض على شفاف

ملاحظة: splash-icon.png لا يُولَّد هنا — يحتوي كلمة "هِمّة" الخطّية
(مسارات متجهية في logo.svg) ويُحدَّث يدويًا عند تغيير الشعار نفسه.
"""
from pathlib import Path

import cairosvg
from PIL import Image

TEAL = (15, 46, 42, 255)  # #0F2E2A — اللون الأساسي في src/design-system/colors.ts
GOLD = "#C79A56"  # اللون المميِّز (Accent) نفسه
WHITE = "#FFFFFF"

ASSETS = Path(__file__).resolve().parent.parent

# نِسب علامة الدمبل — مقيسة مباشرةً من الشعار الرسمي (كنسبة من ارتفاع الدمبل)
ASPECT = 554 / 136  # عرض : ارتفاع
PARTS = {
    "plate_w": 0.257, "plate_h": 1.000,
    "gap1": 0.081,
    "mid_w": 0.199, "mid_h": 0.632,
    "gap2": 0.081,
    "collar_w": 0.059, "collar_h": 0.257,
    "bar_h": 0.118,
}


def dumbbell_svg(total_width: float, total_height: float, color: str = GOLD) -> str:
    """دمبل متجهي بنسب الشعار الرسمي، بأي مقاس مطلوب."""
    h = total_height
    p = {k: v * h for k, v in PARTS.items()}
    cy = h / 2

    head = p["plate_w"] + p["gap1"] + p["mid_w"] + p["gap2"] + p["collar_w"]
    bar_visible = total_width - 2 * head

    def rrect(x, w, height, r):
        return (f'<rect x="{x:.2f}" y="{cy - height / 2:.2f}" width="{w:.2f}" '
                f'height="{height:.2f}" rx="{r:.2f}" ry="{r:.2f}" fill="{color}"/>')

    x = 0.0
    out = []
    out.append(rrect(x, p["collar_w"], p["collar_h"], p["collar_w"] / 2)); x += p["collar_w"] + p["gap2"]
    out.append(rrect(x, p["mid_w"], p["mid_h"], min(p["mid_w"], p["mid_h"]) * 0.32)); x += p["mid_w"] + p["gap1"]
    out.append(rrect(x, p["plate_w"], p["plate_h"], min(p["plate_w"], p["plate_h"]) * 0.28)); x += p["plate_w"]
    bar_x = x
    x += bar_visible
    out.append(rrect(x, p["plate_w"], p["plate_h"], min(p["plate_w"], p["plate_h"]) * 0.28)); x += p["plate_w"] + p["gap1"]
    out.append(rrect(x, p["mid_w"], p["mid_h"], min(p["mid_w"], p["mid_h"]) * 0.32)); x += p["mid_w"] + p["gap2"]
    out.append(rrect(x, p["collar_w"], p["collar_h"], p["collar_w"] / 2))
    out.append(rrect(bar_x, bar_visible, p["bar_h"], p["bar_h"] / 2))

    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{total_width:.0f}" '
            f'height="{h:.0f}" viewBox="0 0 {total_width:.2f} {h:.2f}">{"".join(out)}</svg>')


def render_dumbbell(width: float, color: str) -> Image.Image:
    height = width / ASPECT
    tmp = f"/tmp/_hemma_db_{int(width)}_{color.strip('#')}.png"
    cairosvg.svg2png(bytestring=dumbbell_svg(width, height, color).encode(),
                     write_to=tmp, output_width=round(width), output_height=round(height))
    return Image.open(tmp).convert("RGBA")


def compose(canvas_size: int, dumbbell_width: float, background, color: str) -> Image.Image:
    canvas = Image.new("RGBA", (canvas_size, canvas_size), background)
    db = render_dumbbell(dumbbell_width, color)
    canvas.alpha_composite(db, ((canvas_size - db.width) // 2, (canvas_size - db.height) // 2))
    return canvas


def main() -> None:
    transparent = (0, 0, 0, 0)

    compose(1024, 620, TEAL, GOLD).convert("RGB").save(ASSETS / "icon.png")
    compose(48, 30, TEAL, GOLD).save(ASSETS / "favicon.png")
    compose(512, 300, transparent, GOLD).save(ASSETS / "android-icon-foreground.png")
    Image.new("RGBA", (512, 512), TEAL).save(ASSETS / "android-icon-background.png")
    compose(432, 260, transparent, WHITE).save(ASSETS / "android-icon-monochrome.png")

    print("تم توليد كل الأيقونات في", ASSETS)


if __name__ == "__main__":
    main()
