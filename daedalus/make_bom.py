#!/usr/bin/env python3
"""Writes daedalus-bom-jlcpcb.csv from bom.json, and prints the sums the page's Cost section quotes.

    python3 make_bom.py           rewrite the CSV, print the sums
    python3 make_bom.py --check   change nothing; exit 1 if the CSV on disk is out of date

bom.json is the one list of parts. The page builds its Parts list tables from it in the browser, and the
CSV is the board parts again in the four columns JLCPCB's assembly order asks for (Comment, Designator,
Footprint, JLCPCB Part #), one line per different part. Never edit the CSV by hand.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "bom.json")
OUT = os.path.join(HERE, "daedalus-bom-jlcpcb.csv")


def cell(text):
    """One CSV field, quoted only when it has to be. The page's script does exactly the same."""
    text = str(text)
    if any(ch in text for ch in ',"\n'):
        return '"' + text.replace('"', '""') + '"'
    return text


def csv_text(bom):
    lines = [",".join(cell(c) for c in bom["csv_columns"])]
    for p in bom["board"]:
        lines.append(",".join(cell(c) for c in (p["comment"], ",".join(p["ref"]), p["footprint"], p["lcsc"])))
    return "\n".join(lines) + "\n"


def main():
    with open(SRC, encoding="utf-8") as f:
        bom = json.load(f)
    text = csv_text(bom)

    refs = [r for p in bom["board"] for r in p["ref"]]
    if len(refs) != len(set(refs)):
        sys.exit("bom.json: a reference letter is used twice")

    if "--check" in sys.argv:
        try:
            with open(OUT, encoding="utf-8", newline="") as f:
                same = f.read() == text
        except FileNotFoundError:
            same = False
        print("daedalus-bom-jlcpcb.csv is " + ("up to date" if same else "OUT OF DATE: run python3 make_bom.py"))
        sys.exit(0 if same else 1)

    with open(OUT, "w", encoding="utf-8", newline="") as f:
        f.write(text)

    board = bom["board"]
    parts = sum(len(p["ref"]) for p in board)
    per_board = sum(len(p["ref"]) * p["each"] for p in board)
    basic = sum(1 for p in board if p["cls"] == "Basic")
    fees = sum(1 for p in board if p["fee"])
    hand = [h for h in bom["hand"] if not h.get("board")]
    used = sum(h["used"] for h in hand)
    buy = sum(h["buy30"] for h in hand)
    tools = sum(t.get("cost", 0) for t in bom["tools"])
    print("wrote %s: %d lines for %d parts" % (os.path.basename(OUT), len(board), parts))
    print("kinds of part: %d (%d Basic, %d Extended, %d of those with a fee)" % (len(board), basic, len(board) - basic, fees))
    print("parts for one board: $%.4f" % per_board)
    print("hand-fitted parts used in one controller: $%.2f" % used)
    print("hand-fitted parts bought for %d, with spares and whole packs: $%.2f (%.2f more than %d sets)"
          % (bom["batch"], buy, buy - used * bom["batch"], bom["batch"]))
    print("tools and consumables, bought once: $%.2f" % tools)
    print("If any of these changed, update the Cost section, the Specifications table and COST in the page's script.")


if __name__ == "__main__":
    main()
