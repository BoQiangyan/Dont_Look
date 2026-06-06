from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "result-text-samples" / "arcade-no-frame"
TEXT = "你回头啊"
FONT_PATH = Path("/System/Library/Fonts/STHeiti Medium.ttc")
W, H = 960, 288


def font(size):
    return ImageFont.truetype(str(FONT_PATH), size)


def bbox(text, fnt, stroke=0):
    probe = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(probe)
    return draw.textbbox((0, 0), text, font=fnt, stroke_width=stroke)


def text_pos(text, fnt, y, stroke=0):
    box = bbox(text, fnt, stroke)
    tw = box[2] - box[0]
    return ((W - tw) // 2, y)


def draw_text(draw, xy, fill, fnt, stroke_fill=None, stroke_width=0):
    draw.text(xy, TEXT, font=fnt, fill=fill, stroke_width=stroke_width, stroke_fill=stroke_fill)


def draw_speed_lines(draw, color, y=42):
    for i, length in enumerate([180, 145, 96, 58]):
        draw.rectangle((84 + i * 42, y + i * 12, 84 + i * 42 + length, y + i * 12 + 8), fill=color)
        draw.rectangle((690 - i * 32, y + i * 12, 690 - i * 32 + length, y + i * 12 + 8), fill=color)


def draw_dots(draw, color):
    for y in range(48, 244, 32):
        for x in range(40 + (y // 32 % 2) * 16, 920, 64):
            draw.rectangle((x, y, x + 8, y + 8), fill=color)


def shear_image(img, factor):
    xshift = abs(factor) * img.height
    new_w = img.width + int(round(xshift))
    return img.transform(
        (new_w, img.height),
        Image.Transform.AFFINE,
        (1, factor, -xshift if factor > 0 else 0, 0, 1, 0),
        Image.Resampling.BICUBIC,
    )


def crop_alpha(img, pad=18):
    box = img.getbbox()
    if not box:
        return img
    x0, y0, x1, y1 = box
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(img.width, x1 + pad)
    y1 = min(img.height, y1 + pad)
    cropped = img.crop((x0, y0, x1, y1))
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    out.alpha_composite(cropped, ((W - cropped.width) // 2, (H - cropped.height) // 2))
    return out


def base_text_layer(fnt, fills, stroke, offsets):
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    base_xy = text_pos(TEXT, fnt, 72, stroke[1])
    for dx, dy, fill in offsets:
        draw_text(draw, (base_xy[0] + dx, base_xy[1] + dy), fill, fnt, stroke[0], stroke[1])
    draw_text(draw, base_xy, fills, fnt, stroke[0], stroke[1])
    return layer


def save(img, name):
    path = OUT / name
    img.save(path)
    return path


def style_01():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    f = font(112)
    draw_speed_lines(d, (238, 69, 35, 255), 26)
    layer = base_text_layer(
        f,
        (238, 69, 35, 255),
        ((18, 35, 58, 255), 5),
        [(-16, 13, (18, 35, 58, 255)), (11, -8, (255, 219, 79, 255))],
    )
    img.alpha_composite(layer)
    return save(img, "arcade-ni-huitou-01-red-blue-boom.png")


def style_02():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    draw_dots(d, (26, 42, 62, 80))
    f = font(116)
    layer = base_text_layer(
        f,
        (255, 226, 78, 255),
        ((9, 12, 16, 255), 6),
        [(18, 16, (228, 56, 39, 255)), (-14, -10, (76, 158, 255, 255))],
    )
    img.alpha_composite(layer)
    return save(img, "arcade-ni-huitou-02-yellow-impact.png")


def style_03():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    f = font(110)
    layer = base_text_layer(
        f,
        (244, 74, 42, 255),
        ((255, 239, 209, 255), 3),
        [(-20, 19, (21, 36, 57, 255)), (20, 11, (21, 36, 57, 210))],
    )
    layer = crop_alpha(shear_image(layer, -0.12), 0)
    img.alpha_composite(layer)
    return save(img, "arcade-ni-huitou-03-slanted-hero.png")


def style_04():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    f = font(104)
    for x in range(96, 860, 72):
        d.polygon([(x, 42), (x + 16, 42), (x - 36, 104)], fill=(238, 69, 35, 150))
    layer = base_text_layer(
        f,
        (242, 91, 50, 255),
        ((28, 29, 33, 255), 7),
        [(0, 18, (255, 181, 64, 255)), (-12, 10, (20, 88, 132, 255))],
    )
    img.alpha_composite(layer)
    return save(img, "arcade-ni-huitou-04-flame-retro.png")


def style_05():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    draw_speed_lines(d, (36, 66, 97, 255), 190)
    f = font(108)
    layer = base_text_layer(
        f,
        (255, 245, 221, 255),
        ((16, 27, 43, 255), 8),
        [(14, 14, (230, 65, 42, 255)), (-10, -7, (89, 179, 255, 255))],
    )
    img.alpha_composite(layer)
    return save(img, "arcade-ni-huitou-05-cream-chrome.png")


def style_06():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    f = font(118)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    xy = text_pos(TEXT, f, 70, 5)
    for i, fill in enumerate([(23, 36, 57, 255), (29, 72, 105, 255), (236, 67, 42, 255)]):
        draw_text(d, (xy[0] - 20 + i * 12, xy[1] + 22 - i * 10), fill, f, (9, 10, 13, 255), 4)
    draw_text(d, xy, (255, 214, 69, 255), f, (9, 10, 13, 255), 5)
    img.alpha_composite(layer)
    return save(img, "arcade-ni-huitou-06-layered-arcade.png")


def style_07():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    f = font(110)
    for i in range(7):
        d.line((110 + i * 16, 58, 70 + i * 18, 225), fill=(238, 69, 35, 120), width=8)
        d.line((850 - i * 16, 58, 890 - i * 18, 225), fill=(238, 69, 35, 120), width=8)
    layer = base_text_layer(
        f,
        (239, 72, 43, 255),
        ((22, 28, 36, 255), 6),
        [(-17, 14, (255, 240, 178, 255)), (14, -9, (44, 107, 168, 255))],
    )
    img.alpha_composite(layer)
    return save(img, "arcade-ni-huitou-07-fight-poster.png")


def style_08():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    f = font(106)
    layer = base_text_layer(
        f,
        (255, 83, 48, 255),
        ((245, 238, 220, 255), 4),
        [(-18, 18, (18, 30, 50, 255)), (18, -12, (255, 196, 64, 255))],
    )
    layer = crop_alpha(shear_image(layer, 0.1), 0)
    img.alpha_composite(layer)
    return save(img, "arcade-ni-huitou-08-forward-slam.png")


def style_09():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    draw_dots(d, (241, 92, 54, 90))
    f = font(102)
    xy = text_pos(TEXT, f, 76, 4)
    for dx in range(28, 0, -7):
        draw_text(d, (xy[0] - dx, xy[1] + dx), (18, 38, 58, 255), f, (18, 38, 58, 255), 4)
    draw_text(d, xy, (244, 72, 42, 255), f, (255, 235, 164, 255), 3)
    return save(img, "arcade-ni-huitou-09-3d-block.png")


def style_10():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    f = font(104)
    for x in range(76, 880, 32):
        d.rectangle((x, 38, x + 16, 46), fill=(244, 74, 42, 180))
    xy = text_pos(TEXT, f, 78, 5)
    draw_text(d, (xy[0] - 12, xy[1] + 12), (17, 30, 48, 255), f, (17, 30, 48, 255), 5)
    draw_text(d, xy, (255, 239, 205, 255), f, (244, 74, 42, 255), 5)
    draw_text(d, (xy[0] + 4, xy[1] - 4), (255, 186, 69, 120), f, None, 0)
    return save(img, "arcade-ni-huitou-10-cream-red-outline.png")


def contact_sheet(paths):
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
    sheet.save(OUT / "arcade-ni-huitou-contact-sheet.png")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    paths = [
        style_01(),
        style_02(),
        style_03(),
        style_04(),
        style_05(),
        style_06(),
        style_07(),
        style_08(),
        style_09(),
        style_10(),
    ]
    contact_sheet(paths)
    for path in paths:
        print(path)
    print(OUT / "arcade-ni-huitou-contact-sheet.png")


if __name__ == "__main__":
    main()
