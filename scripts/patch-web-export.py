from pathlib import Path


def patch(html: str) -> str:
    html = html.replace(
        '<body>',
        '<body style="margin:0;background:#FBF5EE">',
        1,
    )
    html = html.replace(
        '<div id="root"></div>',
        (
            '<div id="root">'
            '<div style="min-height:100%;background:#FBF5EE;color:#3C2A24;'
            'font-family:system-ui,sans-serif;padding:48px 24px">'
            '<h1 style="font-size:28px;margin:0 0 8px">Bond</h1>'
            '<p style="margin:0;color:#6E534C">Daily check-ins for couples.</p>'
            '</div></div>'
        ),
        1,
    )
    if 'manifest.webmanifest' not in html:
        html = html.replace(
            '</head>',
            '<link rel="manifest" href="/bond/manifest.webmanifest" />'
            '<link rel="apple-touch-icon" href="/bond/pwa-192.png" />'
            '</head>',
            1,
        )
    return html


def main() -> None:
    dist = Path('dist')
    index = dist / 'index.html'
    html = patch(index.read_text())
    index.write_text(html)
    (dist / '404.html').write_text(html)
    (dist / '.nojekyll').write_text('')
    # Store listing URLs must be real HTML, not the SPA 404 fallback.
    for name in ('privacy-policy.html', 'support.html'):
        src = Path('public') / name
        if src.exists():
            (dist / name).write_text(src.read_text())


if __name__ == '__main__':
    main()
