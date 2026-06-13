#!/usr/bin/env python3
"""Generate shared Startlink brand logo display assets from the app icon master.

The native desktop/app launcher icons keep their platform-specific resource
pipeline. This script only creates the in-app / PC chrome brand mark, where the
same icon needs to stay crisp at small UI sizes. The display mark trims the
launcher icon's outer shadow and writes alpha-rounded corners, so login and PC
chrome slots do not show the launcher's dark edge.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError as exc:  # pragma: no cover - environment guidance
    raise SystemExit(
        "Pillow is required: python3 -m pip install Pillow",
    ) from exc


REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_SOURCE = REPO_ROOT / "lpp/lpp_mobile/assets/brand/app_icon.png"
OUTPUTS = (
    REPO_ROOT / "lpp/lpp_mobile/assets/brand/brand_logo_icon.png",
    REPO_ROOT / "lpp/lpp_pc_client/assets/brand/brand-logo-icon.png",
    REPO_ROOT / "lpp/lpp_pc_client/public/brand-logo-icon.png",
)
CANVAS_SIZE = 1024
DISPLAY_CROP_INSET = 160


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate App/PC brand logo PNGs from the shared Startlink app icon.",
    )
    parser.add_argument(
        "--source",
        type=Path,
        default=DEFAULT_SOURCE,
        help="1024px app icon master. Defaults to lpp_mobile/assets/brand/app_icon.png.",
    )
    parser.add_argument(
        "--crop-inset",
        type=int,
        default=DISPLAY_CROP_INSET,
        help="Pixels to crop from each edge before scaling back to 1024.",
    )
    return parser.parse_args()


def generate(source_path: Path, crop_inset: int) -> Image.Image:
    image = Image.open(source_path).convert("RGB")
    if image.size != (CANVAS_SIZE, CANVAS_SIZE):
        raise ValueError(f"source must be {CANVAS_SIZE}x{CANVAS_SIZE}, got {image.size}")
    if crop_inset < 0 or crop_inset * 2 >= CANVAS_SIZE:
        raise ValueError("crop inset must keep a positive source area")

    crop_box = (
        crop_inset,
        crop_inset,
        CANVAS_SIZE - crop_inset,
        CANVAS_SIZE - crop_inset,
    )
    logo = image.crop(crop_box).resize((CANVAS_SIZE, CANVAS_SIZE), Image.Resampling.LANCZOS)
    logo = logo.convert("RGBA")

    mask = Image.new("L", (CANVAS_SIZE, CANVAS_SIZE), 0)
    radius = int(CANVAS_SIZE * 0.245)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, CANVAS_SIZE - 1, CANVAS_SIZE - 1),
        radius=radius,
        fill=255,
    )
    logo.putalpha(mask)
    return logo


def main() -> int:
    args = parse_args()
    source_path = args.source.resolve()
    if not source_path.exists():
        raise FileNotFoundError(source_path)

    logo = generate(source_path, args.crop_inset)
    for output in OUTPUTS:
        output.parent.mkdir(parents=True, exist_ok=True)
        logo.save(output, "PNG", optimize=True)
        print(output)
    return 0


if __name__ == "__main__":
    sys.exit(main())
