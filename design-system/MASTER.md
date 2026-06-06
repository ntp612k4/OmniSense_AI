# OmniSense AI Design System

## Step 2 Output

- Product type: SaaS dashboard
- Industry: AI, Data Analytics
- Keywords: modern, clean, minimal, dark mode, glassmorphism
- Stack: React

## Visual Direction

- Pattern: dashboard-first operational interface, adapted from the generated "Minimal Single Column" recommendation for dense product UI.
- Style: dark OLED with clean light mode support.
- Palette: blue data accents with amber export CTA.
- Typography: Fira Sans for UI, Fira Code for precise data labels.
- Effects: restrained glass panels, visible borders, light glow only on active states.

## Tokens

- Primary: `#1E40AF`
- Secondary: `#3B82F6`
- CTA: `#F59E0B`
- Light background: `#F8FAFC`
- Dark background: `#020617`
- Light text: `#0F172A`
- Dark text: `#E5E7EB`
- Muted light: `#475569`
- Muted dark: `#94A3B8`

## Rules

- No emoji icons. Use `lucide-react`.
- All clickable elements need `cursor-pointer`.
- Transitions must stay within 150-300ms.
- Glass cards must be visible in both light and dark mode.
- Focus states must be visible for keyboard users.
- Respect `prefers-reduced-motion`.
- Dashboard must work at 375px, 768px, 1024px, 1440px.
