# Image Support - Quick Start Guide

## Add an Image to a Message (3 Steps)

### 1. Basic Example

```typescript
const message: Message = {
  id: Date.now().toString(),
  role: 'assistant',
  content: 'Here is your document:',
  timestamp: new Date(),
  image: {
    url: 'https://example.com/doc.jpg',
    alt: 'Court document from case XYZ',
    aspectRatio: '16/9', // Optional - defaults to '16/9'
  },
}
```

### 2. Without Image (Regular Message)

```typescript
const message: Message = {
  id: Date.now().toString(),
  role: 'user',
  content: 'Show me the document',
  timestamp: new Date(),
  // No image property - renders normally
}
```

### 3. In BuilderStyleChat

```typescript
setMessages((prev) => [
  ...prev,
  {
    id: Date.now().toString(),
    role: 'assistant',
    content: 'Analysis complete:',
    timestamp: new Date(),
    image: {
      url: '/charts/analysis.png',
      alt: 'Chart showing case analysis results',
    },
  },
])
```

## Common Aspect Ratios

- `'16/9'` - Documents, screenshots (default)
- `'1/1'` - Profile photos, square images
- `'4/3'` - Standard photos
- `'21/9'` - Wide charts/timelines
- `'9/16'` - Mobile screenshots

## Features

- Click image to expand (lightbox)
- Press Escape to close
- Keyboard accessible
- Screen reader friendly
- Lazy loading
- No layout shift
- Dark mode compatible

## Files Changed

1. `BuilderStyleChat.tsx` - Added `image?` to Message interface
2. `ChatMessage.tsx` - Renders images and lightbox
3. `ImageLightbox.tsx` - Full-screen image view (new)

## Testing

```bash
# Run tests
npm run test:unit components/ai/ChatMessage.test.tsx

# Manual test
1. Add image to message
2. Click image (should open lightbox)
3. Press Escape (should close)
4. Tab key (focus trapped in lightbox)
```

## Full Documentation

See `/Users/tannerosterkamp/JudgeFinder/JudgeFinderPlatform/components/ai/USAGE_EXAMPLE.md` for detailed examples
