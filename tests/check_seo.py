"""Run with Python 3: python tests/check_seo.py (no dependencies)."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import json
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://expertinterprint.com'

class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.path = path
        self.h1 = 0
        self.ids = set()
        self.links = []
        self.canonical = []
        self.meta = {}
        self.feed(path.read_text(encoding='utf-8'))

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.h1 += tag == 'h1'
        if 'id' in attrs:
            assert attrs['id'] not in self.ids, (self.path, 'duplicate id', attrs['id'])
            self.ids.add(attrs['id'])
        if tag == 'meta':
            self.meta[attrs.get('name', attrs.get('property'))] = attrs.get('content')
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonical.append(attrs['href'])
        if tag in ('a', 'img', 'link', 'script'):
            value = attrs.get('href') or attrs.get('src')
            if value:
                self.links.append(value)
        if tag == 'img':
            assert 'alt' in attrs, (self.path, 'missing image alt')

def check():
    sitemap = ET.parse(ROOT / 'sitemap.xml')
    urls = [n.text for n in sitemap.findall('.//{*}loc')]
    assert len(urls) == len(set(urls)) == 6, 'Expected home and 5 unique service URLs'
    paths = {u: ROOT / unquote(urlsplit(u).path).lstrip('/') / 'index.html' for u in urls}
    pages = {path.resolve(): Page(path) for path in paths.values()}
    for url, path in paths.items():
        page = pages[path.resolve()]
        source = path.read_text(encoding='utf-8')
        assert page.h1 == 1, (path, 'expected one h1')
        assert page.canonical == [url], (path, 'canonical must match sitemap')
        assert '<title>' in source and page.meta.get('description'), (path, 'missing metadata')
        assert page.meta.get('og:url') == url, (path, 'wrong social URL')
        assert page.meta.get('robots') == 'index, follow'
        for raw in re.findall(r'<script type="application/ld\+json">(.*?)</script>', source, re.S):
            schema = json.loads(raw)
            assert schema['@context'] == 'https://schema.org'
        assert 'application/ld+json' in source, (path, 'missing structured data')
        for link in page.links:
            target = urlsplit(link)
            if target.scheme or target.netloc:
                continue
            local = (ROOT / unquote(target.path).lstrip('/')) if target.path.startswith('/') else path.parent / unquote(target.path)
            if not target.path:
                local = path
            if local.is_dir():
                local /= 'index.html'
            assert local.is_file(), (path, 'broken link', link)
            if target.fragment and local.resolve() in pages:
                assert unquote(target.fragment) in pages[local.resolve()].ids, (path, 'missing anchor', link)
        if url != BASE + '/':
            assert f'/{path.parent.name}/' in (ROOT / 'index.html').read_text(encoding='utf-8')
    robots = (ROOT / 'robots.txt').read_text(encoding='utf-8')
    assert 'Sitemap: ' + BASE + '/sitemap.xml' in robots and 'Disallow: /' not in robots
    assert 'noindex' in (ROOT / '404.html').read_text(encoding='utf-8')
    redirects = (ROOT / '_redirects').read_text(encoding='utf-8')
    assert 'https://' not in redirects, 'Host-level redirects must be configured in Cloudflare'
    print('PASS: 6 pages, metadata, structured JSON, sitemap, local links/assets/anchors, robots and redirects')

if __name__ == '__main__':
    check()
