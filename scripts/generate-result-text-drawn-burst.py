from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
import random


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "result-text-samples" / "drawn-burst"
TEXT = "你回头啊"
FONT_PATH = Path("/System/Library/Fonts/STHeiti Medium.ttc")
W, H = 960, 288
random.seed(5331)


def font(size):
    return ImageFont.truetype(str(FONT_PATH), size)


def textbbox(text, fnt, stroke=0):
    probe = Image.new("L", (W, H), 0)
    draw = ImageDraw.Draw(probe)
    return draw.textbbox((0, 0), text, font=fnt, stroke_width=stroke)


def make_text_mask(size=128, y=70, stroke=3):
    fnt = font(size)
    box = textbbox(TEXT, fnt, stroke)
    tw = box[2] - box[0]
    x = (W - tw) // 2
    mask = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(mask)
    d.text((x, y), TEXT, font=fnt, fill=255, stroke_width=stroke, stroke_fill=255)
    return mask


def paste_color_from_mask(base, mask, color):
    layer = Image.new("RGBA", (W, H), color)
    layer.putalpha(mask)
    base.alpha_composite(layer)


def expand_mask(mask, radius):
    return mask.filter(ImageFilter.MaxFilter(radius * 2 + 1))


def shear(img, factor):
    xshift = abs(factor) * img.height
    new_w = img.width + int(round(xshift))
    sheared = img.transform(
        (new_w, img.height),
        Image.Transform.AFFINE,
        (1, factor, -xshift if factor > 0 else 0, 0, 1, 0),
        Image.Resampling.BICUBIC,
    )
    out = Image.new(img.mode, (W, H), 0 if img.mode == "L" else (0, 0, 0, 0))
    out.paste(sheared, ((W - sheared.width) // 2, 0))
    return out


def character_masks(size=128, y=70, stroke=3):
    fnt = font(size)
    spacing = -4
    widths = []
    for ch in TEXT:
        box = textbbox(ch, fnt, stroke)
        widths.append(box[2] - box[0])
    total = sum(widths) + spacing * (len(TEXT) - 1)
    x = (W - total) // 2
    masks = []
    for ch, cw in zip(TEXT, widths):
        mask = Image.new("L", (W, H), 0)
        d = ImageDraw.Draw(mask)
        d.text((x, y), ch, font=fnt, fill=255, stroke_width=stroke, stroke_fill=255)
        masks.append(mask)
        x += cw + spacing
    return masks


def roughen_mask(mask, intensity=10, chips=22):
    out = mask.copy()
    draw = ImageDraw.Draw(out)
    box = out.getbbox()
    if not box:
        return out
    x0, y0, x1, y1 = box
    for _ in range(chips):
        cx = random.randint(x0, x1)
        cy = random.randint(y0, y1)
        s = random.randint(8, intensity + 20)
        if random.random() < 0.5:
            points = [(cx, cy), (cx + s, cy + random.randint(-s, s)), (cx + random.randint(-s, s), cy + s)]
        else:
            points = [(cx, cy), (cx - s, cy + random.randint(-s, s)), (cx + random.randint(-s, s), cy - s)]
        draw.polygon(points, fill=0)
    for _ in range(chips // 2):
        cx = random.randint(x0, x1)
        cy = random.randint(y0, y1)
        s = random.randint(7, intensity + 14)
        draw.polygon([(cx, cy), (cx + s, cy + 4), (cx + 3, cy + s)], fill=255)
    return out


def block_displace(chars, offsets):
    combined = Image.new("L", (W, H), 0)
    for mask, (dx, dy, skew) in zip(chars, offsets):
        piece = shear(mask, skew)
        combined = ImageChops.lighter(combined, ImageChops.offset(piece, dx, dy))
    return combined


def add_slash_marks(draw, color, count=7):
    for _ in range(count):
        x = random.randint(80, 850)
        y = random.randint(28, 210)
        length = random.randint(40, 90)
        height = random.randint(8, 18)
        draw.polygon(
            [(x, y), (x + length, y - height), (x + length + 10, y), (x + 8, y + height)],
            fill=color,
        )


def add_speed_lines(draw, color):
    for y in [38, 58, 205, 226]:
        for x in [60, 720]:
            length = random.randint(80, 180)
            draw.rectangle((x, y, x + length, y + 8), fill=color)


def compose(mask, fill, outline=(23, 34, 49, 255), shadow=(13, 18, 28, 255), second=None):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    add_speed_lines(d, (235, 70, 38, 160))
    add_slash_marks(d, (255, 205, 64, 125), 6)
    outline_mask = expand_mask(mask, 5)
    shadow_mask = ImageChops.offset(expand_mask(mask, 4), -18, 20)
    paste_color_from_mask(img, shadow_mask, shadow)
    paste_color_from_mask(img, outline_mask, outline)
    if second:
        inner_shadow = ImageChops.offset(mask, second[0], second[1])
        paste_color_from_mask(img, inner_shadow, second[2])
    paste_color_from_mask(img, mask, fill)
    return img


def style_01():
    chars = character_masks(136, 63, 4)
    rough = [roughen_mask(ch, 20, 26) for ch in chars]
    mask = block_displace(rough, [(-12, 6, -0.05), (2, -4, -0.08), (10, 2, -0.04), (18, -2, -0.06)])
    return compose(mask, (238, 67, 38, 255), second=(-9, 8, (255, 218, 82, 230)))


def style_02():
    chars = character_masks(132, 65, 5)
    rough = [roughen_mask(ch, 18, 32) for ch in chars]
    mask = block_displace(rough, [(-18, 3, 0.08), (-4, -6, 0.04), (8, 5, 0.08), (22, -4, 0.05)])
    return compose(mask, (255, 226, 58, 255), outline=(20, 27, 42, 255), second=(10, 10, (230, 54, 39, 255)))


def style_03():
    mask = make_text_mask(138, 58, 5)
    mask = roughen_mask(shear(mask, -0.16), 22, 40)
    return compose(mask, (239, 73, 42, 255), outline=(255, 241, 216, 255), shadow=(19, 31, 49, 255), second=(-15, 13, (19, 31, 49, 255)))


def style_04():
    chars = character_masks(126, 73, 6)
    rough = [roughen_mask(ch, 24, 36) for ch in chars]
    mask = block_displace(rough, [(-8, -8, -0.02), (7, 8, 0.1), (-5, 2, -0.1), (15, 5, 0.03)])
    return compose(mask, (232, 58, 43, 255), outline=(18, 32, 56, 255), second=(13, -8, (78, 156, 236, 255)))


def style_05():
    mask = make_text_mask(130, 66, 6)
    mask = roughen_mask(shear(mask, 0.14), 18, 34)
    return compose(mask, (255, 239, 210, 255), outline=(233, 64, 38, 255), shadow=(17, 30, 48, 255), second=(9, -7, (255, 191, 58, 180)))


def style_06():
    chars = character_masks(140, 58, 4)
    rough = [roughen_mask(ch, 16, 24) for ch in chars]
    mask = block_displace(rough, [(-20, 13, -0.12), (-4, -4, -0.08), (9, 5, -0.1), (24, -2, -0.07)])
    return compose(mask, (241, 75, 43, 255), outline=(8, 11, 16, 255), second=(-8, -8, (255, 226, 80, 255)))


def style_07():
    mask = make_text_mask(134, 64, 5)
    mask = roughen_mask(mask, 26, 46)
    img = compose(mask, (242, 68, 38, 255), outline=(20, 37, 61, 255), second=(16, 11, (255, 204, 64, 255)))
    d = ImageDraw.Draw(img)
    for x in range(90, 880, 92):
        d.rectangle((x, 44, x + 48, 54), fill=(20, 37, 61, 210))
    return img


def style_08():
    chars = character_masks(128, 68, 5)
    rough = [roughen_mask(ch, 18, 28) for ch in chars]
    mask = block_displace(rough, [(-16, -1, 0.13), (-5, 5, 0.08), (7, -5, 0.12), (18, 3, 0.1)])
    return compose(mask, (255, 218, 63, 255), outline=(235, 67, 40, 255), shadow=(17, 24, 36, 255), second=(-12, 13, (28, 87, 137, 255)))


def style_09():
    mask = make_text_mask(142, 56, 5)
    mask = roughen_mask(shear(mask, -0.08), 20, 44)
    return compose(mask, (240, 70, 42, 255), outline=(22, 34, 52, 255), shadow=(10, 12, 16, 255), second=(12, 12, (255, 222, 80, 255)))


def style_10():
    chars = character_masks(124, 72, 7)
    rough = [roughen_mask(ch, 30, 52) for ch in chars]
    mask = block_displace(rough, [(-18, 8, -0.08), (2, -8, 0.06), (12, 7, -0.03), (26, -6, 0.08)])
    return compose(mask, (255, 238, 210, 255), outline=(20, 32, 52, 255), shadow=(225, 56, 38, 255), second=(0, 12, (225, 56, 38, 255)))


def save_all():
    OUT.mkdir(parents=True, exist_ok=True)
    makers = [style_01, style_02, style_03, style_04, style_05, style_06, style_07, style_08, style_09, style_10]
    paths = []
    for i, maker in enumerate(makers, 1):
        path = OUT / f"drawn-burst-ni-huitou-{i:02d}.png"
        maker().save(path)
        paths.append(path)
    contact(paths)
    for path in paths:
        print(path)
    print(OUT / "drawn-burst-ni-huitou-contact-sheet.png")


def contact(paths):
    cols = 2
    cell_w, cell_h = W, H + 52
    sheet = Image.new("RGBA", (cols * cell_w, 5 * cell_h), (246, 244, 238, 255))
    draw = ImageDraw.Draw(sheet)
    label_font = font(28)
    for i, path in enumerate(paths):
        img = Image.open(path).convert("RGBA")
        x = (i % cols) * cell_w
        y = (i // cols) * cell_h
        sheet.alpha_composite(img, (x, y))
        draw.text((x + 24, y + H + 8), path.stem, font=label_font, fill=(30, 36, 46, 255))
    sheet.save(OUT / "drawn-burst-ni-huitou-contact-sheet.png")


if __name__ == "__main__":
    save_all()
