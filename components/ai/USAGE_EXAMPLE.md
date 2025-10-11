# Image Support in Chat Messages - Usage Guide

## Overview

The chat system now supports displaying images within messages with lazy loading, aspect-ratio preservation, and an accessible keyboard-navigable lightbox.

## Basic Usage

### Adding an Image to a Message

```typescript
const messageWithImage: Message = {
  id: '123',
  role: 'assistant',
  content: 'Here is the court document you requested:',
  timestamp: new Date(),
  image: {
    url: 'https://example.com/court-document.jpg',
    alt: 'Court document showing case details',
    aspectRatio: '16/9', // Optional, defaults to '16/9'
  },
}
```

### Common Aspect Ratios

```typescript
// Wide images (screenshots, documents)
aspectRatio: '16/9'

// Square images (profile photos, icons)
aspectRatio: '1/1'

// Portrait images (mobile screenshots)
aspectRatio: '9/16'

// Standard photo
aspectRatio: '4/3'

// Custom ratio
aspectRatio: '21/9'
```

## Integration Example

### In BuilderStyleChat Component

```typescript
const handleSubmit = async (e: React.FormEvent, overrideInput?: string) => {
  e.preventDefault()
  const queryText = overrideInput || input.trim()

  if (!queryText || isLoading) return

  // Add user message
  const userMessage: Message = {
    id: Date.now().toString(),
    role: 'user',
    content: queryText,
    type: 'text',
    timestamp: new Date(),
  }

  setMessages((prev) => [...prev, userMessage])

  // ... fetch response ...

  // Add assistant response with image
  const assistantMessage: Message = {
    id: Date.now().toString(),
    role: 'assistant',
    content: 'Here is the document you requested',
    timestamp: new Date(),
    image: {
      url: 'https://cdn.example.com/document.jpg',
      alt: 'Legal document from case #12345',
      aspectRatio: '16/9',
    },
  }

  setMessages((prev) => [...prev, assistantMessage])
}
```

### With API Response

```typescript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages, includeImages: true }),
})

const data = await response.json()

// If API returns image data
if (data.imageUrl) {
  const messageWithImage: Message = {
    id: Date.now().toString(),
    role: 'assistant',
    content: data.text,
    timestamp: new Date(),
    image: {
      url: data.imageUrl,
      alt: data.imageAlt || 'Attached image',
      aspectRatio: data.aspectRatio || '16/9',
    },
  }

  setMessages((prev) => [...prev, messageWithImage])
}
```

## Accessibility Features

### Keyboard Navigation

- **Tab**: Navigate to image expand button
- **Enter/Space**: Open lightbox
- **Escape**: Close lightbox
- **Tab** (in lightbox): Focus trapped within dialog

### Screen Reader Support

- Alt text announced for all images
- Dialog labeled as "Expanded image view"
- Close button has aria-label
- Focus returns to trigger button on close

## Performance Optimizations

### Lazy Loading

Images use Next.js Image component with lazy loading:

```typescript
<Image
  loading="lazy"        // Load when near viewport
  placeholder="blur"    // Show blur while loading
  blurDataURL="..."    // SVG placeholder
/>
```

### Aspect Ratio Container

Prevents Cumulative Layout Shift (CLS):

```tsx
<div style={{ aspectRatio: message.image.aspectRatio || '16/9' }}>
  <Image ... />
</div>
```

### Image Optimization

Next.js automatically optimizes images:

- WebP format when supported
- Responsive sizes
- Quality optimization

## Testing Checklist

- [ ] Images lazy load properly
- [ ] No layout shift when images load
- [ ] Click opens lightbox
- [ ] Escape closes lightbox
- [ ] Focus trapped in lightbox
- [ ] Focus restored on close
- [ ] Screen reader announces descriptions
- [ ] Works in light and dark mode
- [ ] Mobile responsive
- [ ] Touch gestures work

## Example Use Cases

### 1. Court Document Preview

```typescript
{
  content: 'Here is the filed motion:',
  image: {
    url: '/documents/motion-123.pdf.png',
    alt: 'Motion to dismiss filed on October 10, 2025',
    aspectRatio: '8.5/11'  // Standard document ratio
  }
}
```

### 2. Judge Profile Photo

```typescript
{
  content: 'Judge Thompson:',
  image: {
    url: '/judges/thompson.jpg',
    alt: 'Official photo of Judge Sarah Thompson',
    aspectRatio: '1/1'  // Square profile
  }
}
```

### 3. Case Timeline Visualization

```typescript
{
  content: 'Case timeline analysis:',
  image: {
    url: '/charts/timeline-case-456.png',
    alt: 'Timeline chart showing case progression from filing to verdict',
    aspectRatio: '21/9'  // Wide chart
  }
}
```

### 4. Court Layout Diagram

```typescript
{
  content: 'Courtroom seating arrangement:',
  image: {
    url: '/diagrams/courtroom-3.svg',
    alt: 'Diagram of Courtroom 3 seating layout',
    aspectRatio: '4/3'
  }
}
```

## Dark Mode Support

Images automatically adapt to dark mode:

- Lightbox background: `bg-black/90`
- Close button: `bg-white/10 hover:bg-white/20`
- Ring color matches theme

## Error Handling

If image fails to load, Next.js Image component handles gracefully:

```typescript
<Image
  src={message.image.url}
  alt={message.image.alt}
  onError={(e) => {
    console.error('Failed to load image:', message.image.url)
    // Fallback: could set a default broken image icon
  }}
/>
```

## Security Considerations

1. **URL Validation**: Only allow trusted image sources
2. **Alt Text Sanitization**: Escape HTML in alt text
3. **CSP Headers**: Configure Content Security Policy for images
4. **Size Limits**: Validate image dimensions server-side

## Next.js Image Configuration

Add to `next.config.js`:

```javascript
module.exports = {
  images: {
    domains: ['cdn.example.com', 'images.example.com'],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
}
```
