from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "store" / "feature-graphics"
GENERATED = Path(
    "/home/ai/.codex/generated_images/01a0520f-f51d-7343-b008-b091dba4e062"
)

MEDIUM = "/usr/share/fonts/opentype/inter/Inter-Medium.otf"
REGULAR = "/usr/share/fonts/opentype/inter/Inter-Regular.otf"


def cover(source: Path) -> Image.Image:
    image = Image.open(source).convert("RGB")
    target_ratio = 1024 / 500
    source_ratio = image.width / image.height
    if source_ratio > target_ratio:
        width = round(image.height * target_ratio)
        left = (image.width - width) // 2
        image = image.crop((left, 0, left + width, image.height))
    else:
        height = round(image.width / target_ratio)
        top = (image.height - height) // 2
        image = image.crop((0, top, image.width, top + height))
    return image.resize((1024, 500), Image.Resampling.LANCZOS)


def font(size: int, medium: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(MEDIUM if medium else REGULAR, size)


def add_copy(
    image: Image.Image,
    *,
    align: str,
    eyebrow: str,
    headline: str,
    subhead: str,
    color: str,
    muted: str,
) -> None:
    draw = ImageDraw.Draw(image)
    x = 72 if align == "left" else 958
    anchor = "la" if align == "left" else "ra"
    draw.text((x, 95), eyebrow, font=font(24, True), fill=muted, anchor=anchor)
    draw.multiline_text(
        (x, 145),
        headline,
        font=font(58, True),
        fill=color,
        anchor=anchor,
        spacing=4,
        align=align,
    )
    draw.text((x, 354), subhead, font=font(22), fill=muted, anchor=anchor)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    specs = [
        (
            "bond-feature-01-feel-closer.png",
            "exec-2b2f87fe-110d-440d-8166-05c3916e9950.png",
            dict(
                align="left",
                eyebrow="BOND",
                headline="Feel closer.\nEvery day.",
                subhead="Private daily check-ins for couples",
                color="#3B2931",
                muted="#8D5864",
            ),
        ),
        (
            "bond-feature-02-reveal-together.png",
            "exec-e261ed62-a611-47cd-a00a-829622e0ccc5.png",
            dict(
                align="right",
                eyebrow="BOND  •  PRIVATE BY DESIGN",
                headline="Share honestly.\nReveal together.",
                subhead="Both answer before either can see",
                color="#FFF8F4",
                muted="#F5C8C2",
            ),
        ),
        (
            "bond-feature-03-daily-ritual.png",
            "exec-3fd4b200-5485-4e61-be92-635fcfd60f89.png",
            dict(
                align="left",
                eyebrow="BOND  •  YOUR DAILY RITUAL",
                headline="Two minutes.\nA stronger us.",
                subhead="Make connection a habit",
                color="#3B2931",
                muted="#8D5864",
            ),
        ),
    ]

    for filename, source, copy in specs:
        image = cover(GENERATED / source)
        add_copy(image, **copy)
        image.save(OUT / filename, "PNG", optimize=True)


if __name__ == "__main__":
    main()
