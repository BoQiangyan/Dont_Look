from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "characters"


SOURCES = {
    "zhang": {
        "path": Path("/Users/bytedance/Desktop/冷不丁-UI素材/冷不丁-角色-张八旦.png"),
        "cols": [0, 418, 836, 1254],
        "rows": [0, 418, 836, 1254],
        "mirror": False,
    },
    "michel": {
        "path": Path("/Users/bytedance/Desktop/冷不丁-UI素材/冷不丁-角色-米歇尔.png"),
        "cols": [0, 512, 1024, 1536],
        "rows": [0, 341, 682, 1024],
        "mirror": False,
    },
}


STATES = [
    ("idle", 0, 0),
    ("punch", 1, 0),
    ("doublePunch", 2, 0),
    ("lookBack", 0, 1),
    ("dodge", 1, 1),
    ("hit", 2, 1),
    ("throwMachine", 0, 2),
    ("win", 1, 2),
    ("lose", 2, 2),
]


def color_distance(a, b):
    return sum((int(a[i]) - int(b[i])) ** 2 for i in range(3)) ** 0.5


def remove_sheet_background(image):
    image = image.convert("RGBA")
    px = image.load()
    bg = image.getpixel((0, 0))
    width, height = image.size

    for y in range(height):
        for x in range(width):
            r, g, b, alpha = px[x, y]
            distance = color_distance((r, g, b), bg)
            # The sheets use a soft cream/white backdrop with a slight gradient.
            # Keep saturated ink, sparks, and costume colors; remove pale border
            # colors so the sprites can sit on the game stage.
            is_pale_backdrop = r > 225 and g > 218 and b > 200 and max(r, g, b) - min(r, g, b) < 58
            if distance < 40 or is_pale_backdrop:
                px[x, y] = (r, g, b, 0)
            elif distance < 76:
                px[x, y] = (r, g, b, int(alpha * ((distance - 40) / 36)))

    bbox = image.getbbox()
    if not bbox:
        return image

    left = max(0, bbox[0] - 10)
    top = max(0, bbox[1] - 10)
    right = min(width, bbox[2] + 10)
    bottom = min(height, bbox[3] + 10)
    return image.crop((left, top, right, bottom))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    extracted = {}
    max_width = 0
    max_height = 0

    for character, spec in SOURCES.items():
        sheet = Image.open(spec["path"])
        extracted[character] = []
        for state, col, row in STATES:
            box = (
                spec["cols"][col],
                spec["rows"][row],
                spec["cols"][col + 1],
                spec["rows"][row + 1],
            )
            sprite = remove_sheet_background(sheet.crop(box))
            if spec["mirror"]:
                sprite = sprite.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            extracted[character].append((state, sprite))
            max_width = max(max_width, sprite.width)
            max_height = max(max_height, sprite.height)

    for character, sprites in extracted.items():
        for state, sprite in sprites:
            canvas = Image.new("RGBA", (max_width, max_height), (0, 0, 0, 0))
            x = (max_width - sprite.width) // 2
            y = max_height - sprite.height
            canvas.alpha_composite(sprite, (x, y))
            canvas.save(OUT / f"{character}-{state}.png")


if __name__ == "__main__":
    main()
