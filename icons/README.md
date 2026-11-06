# Icons Directory

This directory should contain PWA icons in the following sizes:

## Required Icons

- `icon-72x72.png` - 72x72 pixels
- `icon-96x96.png` - 96x96 pixels
- `icon-128x128.png` - 128x128 pixels
- `icon-144x144.png` - 144x144 pixels
- `icon-152x152.png` - 152x152 pixels
- `icon-192x192.png` - 192x192 pixels
- `icon-384x384.png` - 384x384 pixels
- `icon-512x512.png` - 512x512 pixels (maskable)

## How to Generate Icons

### Option 1: Use Online Tools

- [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- Upload a 512x512 PNG logo and generate all sizes

### Option 2: Use ImageMagick

```bash
# Install ImageMagick
# For Windows: choco install imagemagick
# For Mac: brew install imagemagick
# For Linux: sudo apt-get install imagemagick

# Generate from source image
convert source.png -resize 72x72 icon-72x72.png
convert source.png -resize 96x96 icon-96x96.png
convert source.png -resize 128x128 icon-128x128.png
convert source.png -resize 144x144 icon-144x144.png
convert source.png -resize 152x152 icon-152x152.png
convert source.png -resize 192x192 icon-192x192.png
convert source.png -resize 384x384 icon-384x384.png
convert source.png -resize 512x512 icon-512x512.png
```

### Option 3: Use Node.js Script

```javascript
const sharp = require('sharp');
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

sizes.forEach(size => {
    sharp('source.png').resize(size, size).toFile(`icon-${size}x${size}.png`);
});
```

## Temporary Placeholder

Until you create your icons, you can use a temporary placeholder:

- Create a simple colored square with "SAKSHAM" text
- Use a free icon from [Flaticon](https://www.flaticon.com/) or [Icons8](https://icons8.com/)
- Use your project logo

## Icon Design Guidelines

- Use solid background color (no transparency for iOS)
- Include padding (safe area) for maskable icons
- Keep design simple and recognizable at small sizes
- Use your brand colors
- Test on different devices and backgrounds
