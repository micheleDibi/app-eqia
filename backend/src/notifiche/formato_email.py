"""Stili inline e alternativa testuale a partire dallo stesso contenuto DB."""

import re
from html import escape
from html.parser import HTMLParser

from src.notifiche.stile_email import STILI_CLASSI, STILI_TAG


class HTMLConStili(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.parti = []

    def handle_starttag(self, tag, attrs):
        attributi = dict(attrs)
        classi = attributi.get("class", "").split()
        stile = STILI_TAG.get(tag, "") + "".join(STILI_CLASSI.get(c, "") for c in classi)
        if stile:
            attributi["style"] = stile + attributi.get("style", "")
        serializzati = "".join(
            f' {k}="{escape(v, quote=True)}"' if v is not None else f" {k}"
            for k, v in attributi.items()
        )
        self.parti.append(f"<{tag}{serializzati}>")

    def handle_endtag(self, tag):
        self.parti.append(f"</{tag}>")

    def handle_data(self, data):
        self.parti.append(data)

    def handle_entityref(self, name):
        self.parti.append(f"&{name};")

    def handle_charref(self, name):
        self.parti.append(f"&#{name};")


class TestoEmail(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parti = []
        self.link = []
        self.ignora = 0

    def handle_starttag(self, tag, attrs):
        if tag in {"style", "script", "head"}:
            self.ignora += 1
        if self.ignora:
            return
        if tag in {"p", "div", "br", "tr", "li"}:
            self.parti.append("\n")
        if tag == "a":
            self.link.append(dict(attrs).get("href", ""))

    def handle_endtag(self, tag):
        if tag in {"style", "script", "head"} and self.ignora:
            self.ignora -= 1
            return
        if self.ignora:
            return
        if tag == "a" and self.link:
            self.parti.append(f" ({self.link.pop()})")
        if tag in {"p", "div", "tr", "li"}:
            self.parti.append("\n")

    def handle_data(self, data):
        if not self.ignora:
            self.parti.append(data)


def applica_stili(corpo):
    parser = HTMLConStili()
    parser.feed(corpo)
    return "".join(parser.parti)


def come_testo(corpo):
    parser = TestoEmail()
    parser.feed(corpo)
    righe = [re.sub(r"[ \t]+", " ", riga).strip() for riga in "".join(parser.parti).splitlines()]
    return re.sub(r"\n{3,}", "\n\n", "\n".join(righe)).strip()
