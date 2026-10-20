// Icon rasteriser (macOS): swift scripts/icons.swift
// - mouse/favicon.png: the mouse face emoji, large, on the cream background
// - square/favicon.png, square/apple-touch-icon.png: square/favicon.svg rendered to PNG
import AppKit

let root = URL(fileURLWithPath: CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : ".")
let cream = NSColor(red: 0xf6/255.0, green: 0xe7/255.0, blue: 0xc8/255.0, alpha: 1)

func png(_ size: Int, _ draw: (CGRect) -> Void) -> Data {
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    draw(CGRect(x: 0, y: 0, width: size, height: size))
    NSGraphicsContext.restoreGraphicsState()
    return rep.representation(using: .png, properties: [:])!
}
func write(_ data: Data, _ rel: String) { try! data.write(to: root.appendingPathComponent(rel)); print("wrote", rel) }

// Mouse face: emoji glyph scaled to fill the tile.
func mouseFace(_ size: Int) -> Data {
    return png(size) { r in
        let path = NSBezierPath(roundedRect: r, xRadius: r.width * 0.22, yRadius: r.width * 0.22)
        cream.setFill(); path.fill()
        let font = NSFont.systemFont(ofSize: CGFloat(size) * 0.82)
        let s = NSAttributedString(string: "🐭", attributes: [.font: font])
        let b = s.boundingRect(with: NSSize(width: 10000, height: 10000), options: [.usesLineFragmentOrigin])
        s.draw(at: NSPoint(x: (r.width - b.width) / 2 - b.minX, y: (r.height - b.height) / 2 - b.minY))
    }
}
write(mouseFace(64), "mouse/favicon.png")

// Square Peg: rasterise the SVG.
let svg = NSImage(contentsOf: root.appendingPathComponent("square/favicon.svg"))!
func svgPng(_ size: Int) -> Data {
    return png(size) { r in
        NSGraphicsContext.current?.imageInterpolation = .high
        svg.draw(in: r, from: .zero, operation: .sourceOver, fraction: 1)
    }
}
write(svgPng(64), "square/favicon.png")
write(svgPng(180), "square/apple-touch-icon.png")
