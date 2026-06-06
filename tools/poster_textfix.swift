import AppKit
import Foundation

struct RectSpec {
    let x: CGFloat
    let y: CGFloat
    let width: CGFloat
    let height: CGFloat
}

let args = CommandLine.arguments
guard args.count == 4 else {
    fputs("Usage: poster_textfix.swift <input.png> <output.png> <scale>\n", stderr)
    exit(2)
}

let inputURL = URL(fileURLWithPath: args[1])
let outputURL = URL(fileURLWithPath: args[2])
let scale = CGFloat(Double(args[3]) ?? 1.0)

guard let input = NSImage(contentsOf: inputURL),
      let bitmap = NSBitmapImageRep(data: input.tiffRepresentation ?? Data()) else {
    fputs("Failed to read input image\n", stderr)
    exit(1)
}

let size = NSSize(width: bitmap.pixelsWide, height: bitmap.pixelsHigh)
let output = NSImage(size: size)

output.lockFocus()
NSGraphicsContext.current?.imageInterpolation = .none
bitmap.draw(in: NSRect(origin: .zero, size: size))

// Coordinates are measured from the original 1054 x 1492 poster draft.
// AppKit draws from the bottom-left, so y is converted from top-left.
let sourceRect = RectSpec(x: 807, y: 1347, width: 215, height: 60)
let rect = NSRect(
    x: sourceRect.x * scale,
    y: size.height - (sourceRect.y + sourceRect.height) * scale,
    width: sourceRect.width * scale,
    height: sourceRect.height * scale
)

let radius = 8 * scale
let boxPath = NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)
NSColor(calibratedRed: 0.07, green: 0.05, blue: 0.03, alpha: 1).setFill()
boxPath.fill()
NSColor(calibratedRed: 1.0, green: 0.69, blue: 0.16, alpha: 1).setStroke()
boxPath.lineWidth = 3 * scale
boxPath.stroke()

let text = "派对破冰"
let font = NSFont.boldSystemFont(ofSize: 31 * scale)
let paragraph = NSMutableParagraphStyle()
paragraph.alignment = .center

let baseAttributes: [NSAttributedString.Key: Any] = [
    .font: font,
    .paragraphStyle: paragraph
]

let textRect = rect.insetBy(dx: 6 * scale, dy: 8 * scale)
let shadowOffset = NSSize(width: 2 * scale, height: -2 * scale)

// Pixel-poster-style dark stroke is approximated with several offset draws.
for dx in [-2, 0, 2] {
    for dy in [-2, 0, 2] {
        if dx == 0 && dy == 0 { continue }
        var attrs = baseAttributes
        attrs[.foregroundColor] = NSColor(calibratedRed: 0.36, green: 0.17, blue: 0.0, alpha: 1)
        let offsetRect = textRect.offsetBy(dx: CGFloat(dx) * scale + shadowOffset.width, dy: CGFloat(dy) * scale + shadowOffset.height)
        text.draw(in: offsetRect, withAttributes: attrs)
    }
}

var attrs = baseAttributes
attrs[.foregroundColor] = NSColor(calibratedRed: 1.0, green: 0.86, blue: 0.29, alpha: 1)
text.draw(in: textRect, withAttributes: attrs)

output.unlockFocus()

guard let tiff = output.tiffRepresentation,
      let outputBitmap = NSBitmapImageRep(data: tiff),
      let pngData = outputBitmap.representation(using: .png, properties: [:]) else {
    fputs("Failed to encode output PNG\n", stderr)
    exit(1)
}

try pngData.write(to: outputURL)
