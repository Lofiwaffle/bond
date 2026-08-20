import json
import os
from pathlib import Path


def main() -> None:
    url = os.environ.get('EXPO_PUBLIC_SUPABASE_URL', '').strip()
    key = os.environ.get('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '').strip()
    if not url or not key:
        return
    if '127.0.0.1' in url or 'localhost' in url:
        return
    Path('dist').mkdir(exist_ok=True)
    Path('dist/supabase.json').write_text(
        json.dumps({'url': url, 'key': key}),
        encoding='utf-8',
    )


if __name__ == '__main__':
    main()
