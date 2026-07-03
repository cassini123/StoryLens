# Storyboard Skill (游点子)

Brutalism-style storyboard generator with AI image generation.

## Structure

```
├── SKILL.md                          # Skill definition
├── assets/
│   ├── storyboard-generator.html     # Main application (self-contained)
│   ├── sketch-style.jpg              # Style preview (sketch)
│   ├── render-style.jpg              # Style preview (render)
│   ├── anime-style.jpg               # Style preview (anime)
│   └── street-style.jpg              # Style preview (street)
├── scripts/
│   └── image_proxy_server.py         # Buddy Cloud proxy server
└── references/
    ├── game-design-frameworks.md
    ├── prompt-engineering-guide.md
    ├── serious-games-methodology.md
    ├── storyboard-language.md
    └── style-catalog.md
```

## Quick Start

1. Open `assets/storyboard-generator.html` in a browser
2. Start the proxy server: `python3 scripts/image_proxy_server.py`
3. Paste your Buddy Cloud token into the Token field
4. Click "测试连接" to verify
5. Generate storyboard images!

## Features

- 5 art styles: Sketch, Render, Anime, Street, LoRA
- 3 rendering dimensions: 2D, 3D, B&W, Color
- Knowledge Graph with interactive SVG visualization
- Buddy Cloud image generation (primary) + SD WebUI fallback + Canvas mock fallback
- PNG export with rendered images
- History panel with thumbnails
