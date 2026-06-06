from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageChops


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "result-text-samples" / "arcade-solid"
TEXT = "你回头啊"
FONT_PATH = Path("/System/Library/Fonts/STHeiti Medium.ttc")
W, H = 960, 288


def font(size):
    return ImageFont.truetype(str(FONT_PATH), size)


def text_bbox(text, fnt, stroke=0):
    img = Image.new("L", (W, H), 0)
    draw = ImageDraw.Draw(img)
    return draw.textbbox((0, 0), text, font=fnt, stroke_width=stroke)


def text_xy(text, fnt, y, stroke=0):
    box = text_bbox(text, fnt, stroke)
    return ((W - (box[2] - box[0])) // 2, y)


def text_mask(size=136, y=62, stroke=4):
    fnt = font(size)
    mask = Image.new("L", (W, H), 0)
    draw = ImageDraw.Draw(mask)
    draw.text(text_xy(TEXT, fnt, y, stroke), TEXT, font=fnt, fill=255, stroke_width=stroke, stroke_fill=255)
    return mask


def char_masks(size=136, y=62, stroke=4, spacing=-8):
    fnt = font(size)
    widths = [text_bbox(ch, fnt, stroke)[2] - text_bbox(ch, fnt, stroke)[0] for ch in TEXT]
    total = sum(widths) + spacing * (len(widths) - 1)
    x = (W - total) // 2
    masks = []
    for ch, cw in zip(TEXT, widths):
        mask = Image.new("L", (W, H), 0)
        draw = ImageDraw.Draw(mask)
        draw.text((x, y), ch, font=fnt, fill=255, stroke_width=stroke, stroke_fill=255)
        masks.append(mask)
        x += cw + spacing
    return masks


def shear_mask(mask, factor):
    xshift = abs(factor) * mask.height
    new_w = mask.width + int(round(xshift))
    sheared = mask.transform(
        (new_w, mask.height),
        Image.Transform.AFFINE,
        (1, factor, -xshift if factor > 0 else 0, 0, 1, 0),
        Image.Resampling.BICUBIC,
    )
    out = Image.new("L", (W, H), 0)
    out.paste(sheared, ((W - sheared.width) // 2, 0))
    return out


def offset_mask(mask, dx, dy):
    return ImageChops.offset(mask, dx, dy)


def expand(mask, radius):
    return mask.filter(ImageFilter.MaxFilter(radius * 2 + 1))


try:
    from PIL import ImageFilter
except ImportError:
    ImageFilter = None


def grow(mask, radius):
    if radius <= 0:
        return mask
    return mask.filter(ImageFilter.MaxFilter(radius * 2 + 1))


def color_layer(mask, color):
    layer = Image.new("RGBA", (W, H), color)
    layer.putalpha(mask)
    return layer


def compose(mask, fill, outline, shadow, accent=None, bg_marks=True):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    if bg_marks:
        for x, y, l in [(76, 36, 220), (116, 58, 130), (700, 34, 190), (742, 58, 108), (68, 218, 155), (728, 216, 178)]:
            draw.rectangle((x, y, x + l, y + 8), fill=(237, 70, 38, 150))
    img.alpha_composite(color_layer(offset_mask(grow(mask, 5), -18, 20), shadow))
    img.alpha_composite(color_layer(grow(mask, 6), outline))
    if accent:
        img.alpha_composite(color_layer(offset_mask(mask, accent[0], accent[1]), accent[2]))
    img.alpha_composite(color_layer(mask, fill))
    return img


def merge_chars(specs):
    masks = char_masks()
    merged = Image.new("L", (W, H), 0)
    for mask, (dx, dy, skew) in zip(masks, specs):
        merged = ImageChops.lighter(merged, offset_mask(shear_mask(mask, skew), dx, dy))
    return merged


def style_01():
    mask = merge_chars([(-16, 2, -0.08), (-4, -5, -0.06), (8, 1, -0.07), (22, -3, -0.05)])
    return compose(mask, (238, 69, 35, 255), (22, 33, 51, 255), (11, 16, 25, 255), (-10, 9, (255, 220, 75, 220)))


def style_02():
    mask = merge_chars([(-18, -2, 0.07), (-2, 5, 0.04), (10, -4, 0.06), (25, 4, 0.04)])
    return compose(mask, (255, 226, 64, 255), (16, 25, 42, 255), (230, 61, 40, 255), (12, 10, (230, 61, 40, 255)))


def style_03():
    mask = shear_mask(text_mask(144, 54, 5), -0.14)
    return compose(mask, (239, 74, 42, 255), (255, 239, 214, 255), (18, 31, 50, 255), (-16, 14, (18, 31, 50, 255)))


def style_04():
    mask = merge_chars([(-10, 5, -0.04), (4, -5, 0.08), (12, 5, -0.06), (24, -4, 0.07)])
    return compose(mask, (255, 239, 213, 255), (236, 67, 40, 255), (17, 29, 47, 255), (8, -7, (255, 191, 60, 190)))


def style_05():
    mask = merge_chars([(-20, 10, -0.12), (-5, -4, -0.08), (9, 5, -0.1), (26, -2, -0.07)])
    return compose(mask, (238, 70, 39, 255), (8, 11, 16, 255), (255, 214, 68, 255), (-8, -8, (255, 226, 80, 230)))


def contact(paths):
    cols = 1
    cell_w, cell_h = W, H + 48
    sheet = Image.new("RGBA", (cell_w, len(paths) * cell_h), (246, 244, 238, 255))
    draw = ImageDraw.Draw(sheet)
    label_font = font(26)
    for i, path in enumerate(paths):
        img = Image.open(path).convert("RGBA")
        y = i * cell_h
        sheet.alpha_composite(img, (0, y))
        draw.text((24, y + H + 8), path.stem, font=label_font, fill=(30, 36, 46, 255))
    sheet.save(OUT / "arcade-solid-ni-huitou-contact-sheet.png")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    paths = []
    for i, maker in enumerate([style_01, style_02, style_03, style_04, style_05], 1):
        path = OUT / f"arcade-solid-ni-huitou-{i:02d}.png"
        maker().save(path)
        paths.append(path)
        print(path)
    contact(paths)
    print(OUT / "arcade-solid-ni-huitou-contact-sheet.png")


if __name__ == "__main__":
    main()
