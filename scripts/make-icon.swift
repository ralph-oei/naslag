// Genereert de PWA-iconen (pine-squircle + notitiekaart) zonder externe tools.
// Tekent in een 512-referentieruimte en schaalt per doelgrootte.
//   swift scripts/make-icon.swift        (draai vanuit de repo-root)
import CoreGraphics
import ImageIO
import Foundation
import UniformTypeIdentifiers

let cs = CGColorSpaceCreateDeviceRGB()
func color(_ h: UInt32) -> CGColor {
    CGColor(colorSpace: cs, components: [CGFloat((h >> 16) & 0xff)/255,
        CGFloat((h >> 8) & 0xff)/255, CGFloat(h & 0xff)/255, 1])!
}
let pineA = color(0x338062), pineB = color(0x214F3A)
let paper = color(0xFBF8F2), line = color(0x2E6E57)

func render(size: Int, maskable: Bool) -> CGImage {
    let ctx = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8,
        bytesPerRow: 0, space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    let s = CGFloat(size) / 512.0
    ctx.scaleBy(x: s, y: s)   // teken voortaan in 512-ruimte

    // Achtergrond: volle squircle (of vol vierkant bij maskable).
    ctx.saveGState()
    let corner: CGFloat = maskable ? 0 : 115
    ctx.addPath(CGPath(roundedRect: CGRect(x: 0, y: 0, width: 512, height: 512),
        cornerWidth: corner, cornerHeight: corner, transform: nil))
    ctx.clip()
    let grad = CGGradient(colorsSpace: cs, colors: [pineA, pineB] as CFArray, locations: [0, 1])!
    ctx.drawLinearGradient(grad, start: CGPoint(x: 0, y: 0), end: CGPoint(x: 512, y: 512), options: [])
    ctx.restoreGState()

    // Voorgrond (kaart + regels), bij maskable iets kleiner binnen de safe zone.
    ctx.saveGState()
    if maskable {
        ctx.translateBy(x: 256, y: 256); ctx.scaleBy(x: 0.84, y: 0.84); ctx.translateBy(x: -256, y: -256)
    }
    // Notitiekaart — gecentreerd in de 512-ruimte en wat ruimer dan voorheen.
    let cardW: CGFloat = 210, cardH: CGFloat = 322
    let cardX = (512 - cardW) / 2      // 151 — horizontaal exact gecentreerd
    let cardY = (512 - cardH) / 2      // 95  — verticaal exact gecentreerd
    ctx.setFillColor(paper)
    ctx.addPath(CGPath(roundedRect: CGRect(x: cardX, y: cardY, width: cardW, height: cardH),
        cornerWidth: 31, cornerHeight: 31, transform: nil))
    ctx.fillPath()
    // Drie regels (CG heeft de oorsprong linksonder; y=256 is het midden).
    ctx.setStrokeColor(line); ctx.setLineWidth(22); ctx.setLineCap(.round)
    let lx = cardX + 48                // symmetrische marge links/rechts
    let rows: [(CGFloat, CGFloat)] = [(325, 313), (256, 313), (187, 270)]  // (y, x-eind)
    for (y, xEnd) in rows { ctx.move(to: CGPoint(x: lx, y: y)); ctx.addLine(to: CGPoint(x: xEnd, y: y)) }
    ctx.strokePath()
    ctx.restoreGState()

    return ctx.makeImage()!
}

func write(_ image: CGImage, to path: String) {
    let url = URL(fileURLWithPath: path)
    let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil)!
    CGImageDestinationAddImage(dest, image, nil)
    CGImageDestinationFinalize(dest)
    print("  ✓ \(path)")
}

let out = "icons"
try? FileManager.default.createDirectory(atPath: out, withIntermediateDirectories: true)
write(render(size: 180, maskable: false), to: "\(out)/apple-touch-icon.png")
write(render(size: 192, maskable: false), to: "\(out)/icon-192.png")
write(render(size: 512, maskable: false), to: "\(out)/icon-512.png")
write(render(size: 192, maskable: true),  to: "\(out)/maskable-192.png")
write(render(size: 512, maskable: true),  to: "\(out)/maskable-512.png")
print("iconen klaar.")
