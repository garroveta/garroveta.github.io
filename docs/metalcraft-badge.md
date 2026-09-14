# Metalcraft badge

- Small asset: `public/badges/metalcraft.png`
- Large asset: `public/badges/large/metalcraft.webp`
- Generated with the built-in ImageGen tool.
- Public small output: optimized 192 × 192 PNG with alpha transparency.
- Public large output: lossless 640 × 640 WebP produced with `cwebp -lossless -exact`.
- Local master: `.local-assets/badges/metalcraft-master.png` (ignored by Git).
- The badge name should be supplied by the interface as accessible text.

## Magic references

- [Scars of Mirrodin Mechanics](https://magic.wizards.com/en/news/feature/scars-of-mirrodin-mechanics): official introduction to Metalcraft, the metal world of Mirrodin, and the threshold of three artifacts.
- [Storm Scale: Mirrodin and Scars of Mirrodin Blocks](https://magic.wizards.com/en/news/making-magic/storm-scale-mirrodin-and-scars-mirrodin-blocks-2018-06-11): official retrospective identifying Metalcraft as an artifact-heavy threshold mechanic.

The artwork uses exactly three distinct artifact cores joined by a luminous triangle. It evokes Mirrodin's metal-and-artifact theme without reproducing card art, faction watermarks, or set symbols.

## App wording

> Metalurgia: se activa si controlas tres o más artefactos.

## Generation prompt

```text
Use case: stylized-concept
Asset type: high-resolution master for a circular achievement badge in a Magic: The Gathering community app, displayed at 56–72 px and enlarged to 640 px.
Input images: Image 1, Image 2, and Image 3 are style references only for the existing badge series: circular medallion, engraved metallic rim, premium enamel relief, centered symmetry, bold readable silhouette. Do not reuse their subjects or compositions.
Primary request: Create one original premium fantasy medallion representing the Magic ability word Metalcraft. Official mechanical concept: Metalcraft becomes active when its controller has three or more artifacts. Visually communicate exactly three separate artifacts combining to unlock a stronger state.
Subject: exactly three large autonomous artifact cores arranged in a perfect triangular formation around one brilliant central forge spark. Each core is a distinct compact relic: one faceted silver hexagonal plate, one bronze gear-disc with broad teeth, and one darksteel ring inset with pale blue enamel. Three thick streams of molten-white energy connect the three relics into a clear luminous triangle; where they meet, the central spark ignites and sends a restrained halo through the mechanism. The number three and the act of combining must be instantly understandable without text.
Magic reference: evoke the all-metal world and artifact density associated with Metalcraft in Scars of Mirrodin, while creating an original emblem. Do not reproduce card art, Mox Opal, the Mirran watermark, the Phyrexian symbol, or any official set symbol.
Style/medium: sculpted high-relief fantasy-game insignia, engraved antique metal, polished enamel, dense but clean clockwork craftsmanship, consistent with the supplied premium badge series.
Composition/framing: straight-on centered circular medallion, full outer rim visible with even transparent padding; the three relics are large, simple, evenly spaced, and connected by the luminous triangle. Strong silhouette readable at 56 px. No perspective scene.
Color palette: bright silver, aged bronze, blackened steel, pale blue-white energy, subtle warm gold accents, deep midnight-blue enamel background.
Lighting/mood: precise, ingenious, activated, triumphant; controlled highlights and deep engraved recesses.
Background: genuine transparent alpha outside the circular medallion.
Constraints: exactly three artifact cores, one central spark, one complete circular badge; no text, letters, numbers, logos, watermark, creatures, people, hands, weapons, crowns, skulls, gems, loose coins, anvil, hammer, factory scene, or elements outside the rim; no square background; clean alpha edges; high contrast; square canvas.
```
