#!/usr/bin/env python3
"""
Fetch and archive articles from https://claude.com/blog
Saves each article as a Markdown file with YAML front matter.
Designed to run in GitHub Actions (Python 3.12+, no pip install needed).
"""

import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

BLOG_URL = "https://claude.com/blog"
USER_AGENT = "BabyDiary-BlogArchiver/1.0 (GitHub Actions)"
ARCHIVE_DIR = Path(os.environ.get("ARCHIVE_DIR", "archive/claude-blog"))


# ---------------------------------------------------------------------------
# Minimal HTML helpers (stdlib only — no BeautifulSoup)
# ---------------------------------------------------------------------------

def fetch(url: str) -> str:
    """Fetch a URL and return decoded text."""
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


class LinkExtractor(HTMLParser):
    """Extract all <a href="..."> links from HTML."""

    def __init__(self):
        super().__init__()
        self.links: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            for name, value in attrs:
                if name == "href" and value:
                    self.links.append(value)


class JSONLDExtractor(HTMLParser):
    """Extract JSON-LD blocks from <script type="application/ld+json">."""

    def __init__(self):
        super().__init__()
        self._in_jsonld = False
        self._data = ""
        self.blocks: list[dict] = []

    def handle_starttag(self, tag, attrs):
        if tag == "script":
            attr_dict = dict(attrs)
            if attr_dict.get("type") == "application/ld+json":
                self._in_jsonld = True
                self._data = ""

    def handle_data(self, data):
        if self._in_jsonld:
            self._data += data

    def handle_endtag(self, tag):
        if tag == "script" and self._in_jsonld:
            self._in_jsonld = False
            try:
                self.blocks.append(json.loads(self._data))
            except json.JSONDecodeError:
                pass


class ContentExtractor(HTMLParser):
    """
    Extract the main article body text from the rich-text container.
    Converts common HTML tags to Markdown.
    """

    # Tags whose text content we want to capture
    BLOCK_TAGS = {"p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "blockquote", "figcaption"}
    SKIP_TAGS = {"script", "style", "nav", "footer", "header", "noscript"}

    def __init__(self):
        super().__init__()
        self._in_rich_text = False
        self._depth = 0
        self._skip_depth = 0
        self._current_tag = ""
        self._current_text = ""
        self._paragraphs: list[str] = []
        self._in_list = False
        self._list_type = ""

    def handle_starttag(self, tag, attrs):
        attr_dict = dict(attrs)
        cls = attr_dict.get("class", "")

        # Detect the rich text blog container
        if "u-rich-text-blog" in cls or "rich-text-block" in cls or "w-richtext" in cls:
            self._in_rich_text = True
            self._depth = 0

        if self._in_rich_text:
            self._depth += 1

            if tag in self.SKIP_TAGS:
                self._skip_depth = self._depth
                return

            if tag in ("ul", "ol"):
                self._in_list = True
                self._list_type = tag

            if tag in self.BLOCK_TAGS:
                self._current_tag = tag
                self._current_text = ""

            if tag == "a":
                href = attr_dict.get("href", "")
                if href:
                    self._current_text += "["

            if tag == "br":
                self._current_text += "\n"

            if tag == "img":
                alt = attr_dict.get("alt", "")
                src = attr_dict.get("src", "")
                if src:
                    self._paragraphs.append(f"![{alt}]({src})")

            if tag in ("strong", "b"):
                self._current_text += "**"
            if tag in ("em", "i"):
                self._current_text += "*"
            if tag == "code":
                self._current_text += "`"

    def handle_endtag(self, tag):
        if not self._in_rich_text:
            return

        if tag in self.SKIP_TAGS and self._skip_depth:
            self._skip_depth = 0
            self._depth -= 1
            return

        if tag in ("strong", "b"):
            self._current_text += "**"
        if tag in ("em", "i"):
            self._current_text += "*"
        if tag == "code":
            self._current_text += "`"

        if tag == "a":
            self._current_text += "]()"

        if tag in ("ul", "ol"):
            self._in_list = False
            self._list_type = ""

        if tag in self.BLOCK_TAGS and self._current_text.strip():
            text = self._current_text.strip()
            text = re.sub(r"\s+", " ", text)

            if tag.startswith("h"):
                level = int(tag[1])
                text = "#" * level + " " + text
            elif tag == "li":
                prefix = "- " if self._list_type != "ol" else "1. "
                text = prefix + text
            elif tag == "blockquote":
                text = "> " + text

            self._paragraphs.append(text)
            self._current_text = ""

        self._depth -= 1
        if self._depth <= 0 and self._in_rich_text:
            self._in_rich_text = False

    def handle_data(self, data):
        if self._in_rich_text and not self._skip_depth:
            self._current_text += data

    def get_markdown(self) -> str:
        return "\n\n".join(self._paragraphs)


class MetaExtractor(HTMLParser):
    """Extract <meta> tags for og: and twitter: metadata."""

    def __init__(self):
        super().__init__()
        self.meta: dict[str, str] = {}

    def handle_starttag(self, tag, attrs):
        if tag == "meta":
            attr_dict = dict(attrs)
            name = attr_dict.get("property") or attr_dict.get("name", "")
            content = attr_dict.get("content", "")
            if name and content:
                self.meta[name] = content


class CategoryExtractor(HTMLParser):
    """Extract category/tag links from blog article pages."""

    def __init__(self):
        super().__init__()
        self.categories: list[str] = []
        self._in_category_link = False
        self._current_text = ""

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            attr_dict = dict(attrs)
            href = attr_dict.get("href", "")
            if "/blog/category/" in href:
                self._in_category_link = True
                self._current_text = ""

    def handle_data(self, data):
        if self._in_category_link:
            self._current_text += data

    def handle_endtag(self, tag):
        if tag == "a" and self._in_category_link:
            self._in_category_link = False
            cat = self._current_text.strip()
            if cat and cat not in self.categories:
                self.categories.append(cat)


# ---------------------------------------------------------------------------
# Core logic
# ---------------------------------------------------------------------------

def discover_article_slugs(html: str) -> list[str]:
    """Extract unique blog article slugs from the listing page."""
    parser = LinkExtractor()
    parser.feed(html)

    slugs = []
    seen = set()
    for href in parser.links:
        # Match /blog/some-slug but not /blog/category/...
        m = re.match(r"^/blog/([a-z0-9][a-z0-9\-]+)$", href)
        if m and "category" not in href:
            slug = m.group(1)
            if slug not in seen:
                seen.add(slug)
                slugs.append(slug)
    return slugs


def parse_article(slug: str, html: str) -> dict:
    """Parse a single article page into structured data."""
    # JSON-LD
    jld = JSONLDExtractor()
    jld.feed(html)
    ld_data = {}
    for block in jld.blocks:
        if block.get("@type") in ("Article", "BlogPosting", "NewsArticle"):
            ld_data = block
            break

    # Meta tags
    meta_ext = MetaExtractor()
    meta_ext.feed(html)

    # Categories
    cat_ext = CategoryExtractor()
    cat_ext.feed(html)

    # Content
    content_ext = ContentExtractor()
    content_ext.feed(html)

    title = ld_data.get("headline") or meta_ext.meta.get("og:title", slug)
    description = ld_data.get("description") or meta_ext.meta.get("og:description", "")
    date_published = ld_data.get("datePublished", "")
    date_modified = ld_data.get("dateModified", "")
    image = (ld_data.get("image") or [None])[0] if isinstance(ld_data.get("image"), list) else ld_data.get("image", "")
    if not image:
        image = meta_ext.meta.get("og:image", "")

    return {
        "slug": slug,
        "title": title,
        "description": description,
        "date_published": date_published,
        "date_modified": date_modified,
        "categories": cat_ext.categories,
        "image": image,
        "url": f"{BLOG_URL}/{slug}",
        "content_md": content_ext.get_markdown(),
    }


def save_article(article: dict) -> Path:
    """Save article as Markdown with YAML front matter."""
    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)

    # Use date prefix if available
    date_str = ""
    if article["date_published"]:
        try:
            dt = datetime.fromisoformat(article["date_published"].replace("Z", "+00:00"))
            date_str = dt.strftime("%Y-%m-%d")
        except ValueError:
            pass

    filename = f"{date_str}_{article['slug']}.md" if date_str else f"{article['slug']}.md"
    filepath = ARCHIVE_DIR / filename

    categories_yaml = "\n".join(f"  - {c}" for c in article["categories"]) if article["categories"] else "  []"

    escaped_title = article['title'].replace('"', "'")
    escaped_desc = article['description'].replace('"', "'")
    archived_at = datetime.now(timezone.utc).isoformat()

    front_matter = f"""---
title: "{escaped_title}"
slug: {article['slug']}
url: {article['url']}
date_published: {article['date_published']}
date_modified: {article['date_modified']}
description: "{escaped_desc}"
categories:
{categories_yaml}
image: {article['image']}
archived_at: {archived_at}
---"""

    content = article["content_md"] or f"*Content could not be extracted. Visit [{article['url']}]({article['url']}) for the full article.*"

    filepath.write_text(f"{front_matter}\n\n# {article['title']}\n\n{content}\n", encoding="utf-8")
    return filepath


def load_index() -> dict:
    """Load existing index to detect new/updated articles."""
    index_path = ARCHIVE_DIR / "index.json"
    if index_path.exists():
        return json.loads(index_path.read_text(encoding="utf-8"))
    return {"articles": {}, "last_updated": ""}


def save_index(index: dict):
    """Save the article index."""
    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
    index["last_updated"] = datetime.now(timezone.utc).isoformat()
    (ARCHIVE_DIR / "index.json").write_text(
        json.dumps(index, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main():
    print(f"=== Claude Blog Archiver ===")
    print(f"Archive dir: {ARCHIVE_DIR}")

    # Load existing index
    index = load_index()

    # Fetch blog listing
    print(f"\nFetching {BLOG_URL} ...")
    listing_html = fetch(BLOG_URL)
    slugs = discover_article_slugs(listing_html)
    print(f"Found {len(slugs)} articles on listing page")

    if not slugs:
        print("ERROR: No articles found. The page structure may have changed.")
        sys.exit(1)

    new_count = 0
    updated_count = 0
    errors = []

    for i, slug in enumerate(slugs):
        url = f"{BLOG_URL}/{slug}"
        existing = index["articles"].get(slug)

        print(f"\n[{i+1}/{len(slugs)}] Fetching: {slug}")
        try:
            html = fetch(url)
            article = parse_article(slug, html)

            # Check if article is new or updated
            is_new = existing is None
            is_updated = (
                not is_new
                and article["date_modified"]
                and article["date_modified"] != existing.get("date_modified")
            )

            if is_new or is_updated:
                filepath = save_article(article)
                index["articles"][slug] = {
                    "title": article["title"],
                    "date_published": article["date_published"],
                    "date_modified": article["date_modified"],
                    "categories": article["categories"],
                    "file": str(filepath),
                    "url": article["url"],
                }
                if is_new:
                    new_count += 1
                    print(f"  -> NEW: {article['title']}")
                else:
                    updated_count += 1
                    print(f"  -> UPDATED: {article['title']}")
            else:
                print(f"  -> unchanged, skipping")

        except Exception as e:
            errors.append(f"{slug}: {e}")
            print(f"  -> ERROR: {e}")

    # Save index
    save_index(index)

    # Summary
    print(f"\n=== Summary ===")
    print(f"Total articles: {len(slugs)}")
    print(f"New: {new_count}")
    print(f"Updated: {updated_count}")
    print(f"Errors: {len(errors)}")

    if errors:
        print("\nErrors:")
        for e in errors:
            print(f"  - {e}")

    # Set GitHub Actions output
    github_output = os.environ.get("GITHUB_OUTPUT")
    if github_output:
        with open(github_output, "a") as f:
            f.write(f"new_count={new_count}\n")
            f.write(f"updated_count={updated_count}\n")
            f.write(f"total_count={len(slugs)}\n")
            has_changes = "true" if (new_count + updated_count) > 0 else "false"
            f.write(f"has_changes={has_changes}\n")

    return 0 if not errors or (new_count + updated_count) > 0 else 1


if __name__ == "__main__":
    sys.exit(main())
