"""Run with Python 3: python tests/check_portfolio.py."""
from html.parser import HTMLParser
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]

class Portfolio(HTMLParser):
    def __init__(self):
        super().__init__()
        self.cards = []
        self.filters = []
        self.images = []
        self.full = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'portfolio-card' in attrs.get('class', '').split():
            self.cards.append(attrs['data-category'])
        if 'data-filter' in attrs:
            self.filters.append(attrs['data-filter'])
        if 'data-full' in attrs:
            assert attrs.get('aria-haspopup') == 'dialog'
            assert all(attrs.get('data-alt-' + lang) for lang in ('th', 'en', 'zh'))
            self.full.append(attrs['data-full'])
        if tag == 'img' and '/img/portfolio/' in attrs.get('src', ''):
            assert attrs.get('alt') and attrs.get('width') and attrs.get('height')
            assert attrs.get('loading') == 'lazy'
            self.images.append(attrs['src'])

def check():
    p = Portfolio()
    p.feed((ROOT / 'index.html').read_text(encoding='utf-8'))
    assert len(p.cards) == len(p.images) == len(p.full) == 15
    assert set(p.cards) == set(p.filters) - {'all'}
    sources = json.loads((ROOT / 'docs/portfolio-sources.json').read_text(encoding='utf-8'))
    assert len(sources) == len(p.cards)
    assert sum(row['source'].startswith('\\\\192.168.1.112') for row in sources) == 8
    assert not any(slug in src for src in p.full for slug in ('fluifort', 'exhibition-display'))
    for src in p.images + p.full:
        path = ROOT / src.lstrip('/')
        assert path.is_file(), src
        assert path.stat().st_size < 600_000, (src, 'oversized web asset')
    assert sum((ROOT / src.lstrip('/')).stat().st_size for src in p.images) < 1_200_000
    print('PASS: 15 projects, 4 filters, 8 Public photographs, multilingual labels, all optimized assets present')

if __name__ == '__main__':
    check()
