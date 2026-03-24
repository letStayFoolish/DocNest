---
title: CSS Tricks & Modern Layouts
description: Modern CSS features, layout techniques, and utility patterns I use regularly.
tags: [css, flexbox, grid, animations, tailwind]
category: CSS
date: 2024-02-20
---

## Custom Properties (Variables)

```css
:root {
  --color-primary: #7c3aed;
  --radius: 0.75rem;
  --shadow-sm: 0 1px 3px rgba(0,0,0,.1);
  --transition: 200ms ease;
}

/* Override in a dark theme scope */
.dark {
  --color-primary: #a78bfa;
}

.button {
  background: var(--color-primary);
  border-radius: var(--radius);
  transition: all var(--transition);
}
```

## Flexbox Essentials

```css
.container {
  display: flex;
  align-items: center;      /* cross-axis */
  justify-content: space-between; /* main-axis */
  gap: 1rem;                /* spacing between children */
  flex-wrap: wrap;          /* allow wrapping
}

/* Center anything */
.center {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Sticky footer — push footer to bottom */
body {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
main { flex: 1; }
```

## CSS Grid

```css
/* Responsive grid without media queries */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

/* Named areas */
.layout {
  display: grid;
  grid-template-areas:
    "header header"
    "sidebar main"
    "footer footer";
  grid-template-columns: 240px 1fr;
  grid-template-rows: auto 1fr auto;
  min-height: 100vh;
}

header { grid-area: header; }
aside  { grid-area: sidebar; }
main   { grid-area: main; }
footer { grid-area: footer; }
```

## Clamp and Fluid Typography

```css
/* Scales smoothly between viewport sizes — no media queries needed */
h1 { font-size: clamp(1.75rem, 4vw, 3rem); }
p  { font-size: clamp(1rem, 1.5vw, 1.125rem); }

/* Fluid spacing */
.section {
  padding: clamp(2rem, 5vw, 5rem) clamp(1rem, 4vw, 3rem);
}
```

## Scroll Snap

```css
.carousel {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  gap: 1rem;
  scroll-padding: 1rem;
}

.carousel-item {
  flex: 0 0 300px;
  scroll-snap-align: start;
}
```

## Modern Animations

```css
/* Smooth entrance with @keyframes */
@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card {
  animation: fade-up 0.4s ease forwards;
}

/* Stagger children */
.card:nth-child(2) { animation-delay: 0.08s; }
.card:nth-child(3) { animation-delay: 0.16s; }

/* Respect user's motion preference */
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; }
}
```

## Useful Selectors

```css
/* First child that is NOT the first element */
li + li { margin-top: 0.5rem; }

/* Last item — no bottom border */
li:last-child { border-bottom: none; }

/* Every 3rd item */
.item:nth-child(3n) { background: #f5f5f5; }

/* Has a specific child */
.card:has(img) { padding: 0; }

/* Focus visible — keyboard only */
button:focus-visible { outline: 2px solid var(--color-primary); }
```

## Backdrop Filter

```css
/* Frosted glass effect */
.glass {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
```

## Tailwind Utilities Worth Remembering

```html
<!-- Truncate text -->
<p class="truncate">...</p>
<p class="line-clamp-3">...</p>

<!-- Prevent layout shift on font load -->
<div class="font-sans antialiased">

<!-- Full-bleed section inside constrained layout -->
<div class="w-screen relative left-1/2 -translate-x-1/2">

<!-- Overlay with gradient -->
<div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent">
```
