from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "store" / "screenshots"
OUT = ROOT / "store" / "play-phone-assets"
MEDIUM = "/usr/share/fonts/opentype/inter/Inter-Medium.otf"
REGULAR = "/usr/share/fonts/opentype/inter/Inter-Regular.otf"
SIZE = (1080, 1920)


def font(size: int, medium: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(MEDIUM if medium else REGULAR, size)


def gradient(top: str, bottom: str) -> Image.Image:
    canvas = Image.new("RGB", SIZE)
    draw = ImageDraw.Draw(canvas)
    a = tuple(bytes.fromhex(top.removeprefix("#")))
    b = tuple(bytes.fromhex(bottom.removeprefix("#")))
    for y in range(SIZE[1]):
        t = y / (SIZE[1] - 1)
        color = tuple(round(x + (z - x) * t) for x, z in zip(a, b))
        draw.line((0, y, SIZE[0], y), fill=color)
    return canvas


def rounded_image(image: Image.Image, radius: int) -> Image.Image:
    mask = Image.new("L", image.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, image.width - 1, image.height - 1), radius=radius, fill=255
    )
    result = image.convert("RGBA")
    result.putalpha(mask)
    return result


def add_phone(canvas: Image.Image, source: Path, *, x: int, y: int, width: int) -> None:
    shot = Image.open(source).convert("RGB")
    height = round(width * shot.height / shot.width)
    shot = shot.resize((width, height), Image.Resampling.LANCZOS)

    frame_pad = 18
    frame = Image.new("RGBA", (width + frame_pad * 2, height + frame_pad * 2), "#2F2228")
    frame = rounded_image(frame, 64)
    shot = rounded_image(shot, 48)
    frame.alpha_composite(shot, (frame_pad, frame_pad))

    shadow = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle(
        (x - 10, y + 18, x + frame.width + 10, y + frame.height + 38),
        radius=74,
        fill=(59, 41, 49, 72),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(28))
    canvas.paste(shadow, (0, 0), shadow)
    canvas.paste(frame, (x, y), frame)


def compose(
    filename: str,
    source: str,
    *,
    eyebrow: str,
    headline: str,
    subhead: str,
    top: str,
    bottom: str,
    accent: str,
) -> None:
    canvas = gradient(top, bottom)
    draw = ImageDraw.Draw(canvas)

    draw.rounded_rectangle((76, 76, 230, 128), radius=26, fill=accent)
    draw.text((153, 102), eyebrow, font=font(22, True), fill="#FFFFFF", anchor="mm")
    draw.multiline_text(
        (76, 177), headline, font=font(65, True), fill="#3B2931", spacing=4
    )
    draw.text((78, 345), subhead, font=font(28), fill="#765762")

    add_phone(canvas, SOURCE / source, x=176, y=440, width=728)
    canvas.save(OUT / filename, "PNG", optimize=True)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    compose(
        "01-two-minutes.png",
        "play-phone-1-promise.png",
        eyebrow="BOND",
        headline="Make two minutes\nmean more.",
        subhead="A small daily ritual for the two of you",
        top="#FFF8F3",
        bottom="#F9D9D0",
        accent="#C2386B",
    )
    compose(
        "02-check-in-privately.png",
        "play-phone-2-reveal-sealed.png",
        eyebrow="BOND",
        headline="Check in privately.\nNo guessing.",
        subhead="Your answer stays yours until they respond",
        top="#F4F8FF",
        bottom="#D6EAF8",
        accent="#568FB7",
    )
    compose(
        "03-reveal-together.png",
        "play-phone-2-reveal-open.png",
        eyebrow="BOND",
        headline="Reveal together.\nUnderstand the gap.",
        subhead="See both perspectives without keeping score",
        top="#FFF8F4",
        bottom="#EFDCEB",
        accent="#925AA5",
    )
    compose(
        "04-private-bond.png",
        "play-phone-3-invite.png",
        eyebrow="BOND",
        headline="One person.\nOne private Bond.",
        subhead="Invite your partner and build the habit",
        top="#FFF9ED",
        bottom="#F7DFC7",
        accent="#D46C4E",
    )


if __name__ == "__main__":
    main()
