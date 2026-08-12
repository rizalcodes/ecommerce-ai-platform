"""Seed the demo catalogue.

    python -m scripts.seed              # add seed data
    python -m scripts.seed --reset      # remove previous seed data first
    python -m scripts.seed --no-images  # skip photo sourcing (fast, for schema work)

Schema.md Section 3 sets the targets: multiple sellers, 10+ categories, 50-100
products, inquiries spread across all three statuses with varied dates, and
backfilled view timestamps. Rules.md Section 6 is explicit that flat or empty
demo data defeats the purpose — so views and inquiries below are generated with
an uneven popularity distribution, a weekly rhythm and a growth trend, rather
than being spread uniformly.

Categories are created through the admin account only (Rules.md Section 6): this
script never attributes a category to a seller.

The run is split into stages, each with its own short transaction. Photo
sourcing and uploading — minutes of network work — happens with no database
session open at all. An earlier version held one transaction across the whole
run and lost every row when the connection did not survive it.
"""

import argparse
import datetime as dt
import math
import random
import sys
import uuid

from slugify import slugify
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.services import storage_service
from app.models import (
    Category,
    Inquiry,
    InquiryStatus,
    Notification,
    Product,
    ProductImage,
    ProductStatus,
    ProductView,
    Role,
    SellerProfile,
    User,
)
from scripts.seed_content import CATEGORIES, PRODUCTS, SELLERS
from scripts.seed_images import ImageFetcher

SEED_EMAIL_SUFFIX = ".example.com"
ADMIN_EMAIL = "admin@aicommerce.example.com"
DEMO_PASSWORD = "demo-password-2026"

HISTORY_DAYS = 90

# Fictional buyers. Names are common Malaysian ones so the dashboard reads as a
# local marketplace; addresses stay on example.com so nothing here can reach a
# real inbox.
BUYER_NAMES = [
    "Amirul Hakim", "Chong Li Ying", "Priya Ramasamy", "Nur Aina Sofea",
    "Kavitha Nair", "Tan Jia Hui", "Muhammad Danial", "Wong Kar Wai",
    "Sharifah Alia", "Ganesh Kumar", "Lee Chee Seng", "Nadia Farhana",
    "Brandon Teoh", "Siti Aminah", "Vikram Suresh", "Chua Yi Xuan",
    "Hafiz Rahman", "Melissa Ong", "Thanaraj Pillai", "Zulaikha Hassan",
]

INQUIRY_MESSAGES = [
    "Is this still available? Looking to collect this week if possible.",
    "Do you ship to Penang, and what would postage cost?",
    "Can I see more photos of the actual item before I decide?",
    "Is there any discount if I take two?",
    "What is the warranty period on this?",
    "Hi, does this come in other colours?",
    "Would you hold one for me until Friday?",
    "Is the price negotiable for cash on collection?",
    "How long does delivery to Johor usually take?",
    "Can you confirm the exact dimensions?",
    None,  # some buyers leave the message blank
    "Do you have this in stock right now or is it pre-order?",
]


def product_specs() -> list[dict]:
    """PRODUCTS with a stable slug attached.

    The slug is the key shared between the photo manifest and the database rows,
    so it has to be derived identically in every stage.
    """
    specs, seen = [], set()
    for index, (seller_key, category_name, name, price, stock, status, description, queries) in enumerate(
        PRODUCTS
    ):
        slug = slugify(name)[:220]
        if slug in seen:
            slug = f"{slug}-{index}"
        seen.add(slug)
        specs.append({
            "slug": slug, "seller_key": seller_key, "category": category_name,
            "name": name, "price": price, "stock": stock, "status": status,
            "description": description, "queries": queries,
        })
    return specs


# --- Stage 1: accounts and taxonomy ---------------------------------------

def reset(db: Session, *, purge_storage: bool = True) -> None:
    """Remove previously seeded rows. Only touches the seeded accounts."""
    user_ids = list(db.scalars(select(User.id).where(User.email.like(f"%{SEED_EMAIL_SUFFIX}"))))

    if purge_storage and user_ids:
        # Storage objects are namespaced by seller id and are not covered by the
        # database cascade, so without this every reset leaves the bucket
        # holding photos no row points at any more.
        removed = 0
        for user_id in user_ids:
            removed += storage_service.delete_objects(storage_service.list_objects(str(user_id)))
        print(f"reset: removed {removed} storage object(s)")

    if user_ids:
        # Products, images, views, inquiries and notifications all cascade from
        # users, so deleting the accounts is enough.
        db.execute(delete(User).where(User.id.in_(user_ids)))
        db.flush()
    db.execute(delete(Category))
    db.commit()
    print(f"reset: removed {len(user_ids)} seeded account(s) and all categories")


def get_or_create_admin(db: Session) -> User:
    admin = db.scalar(select(User).where(User.email == ADMIN_EMAIL))
    if admin is not None:
        return admin

    role = db.scalar(select(Role).where(Role.name == "admin"))
    if role is None:
        sys.exit("The 'admin' role is missing. Run: alembic upgrade head")

    admin = User(email=ADMIN_EMAIL, name="Platform Admin", password_hash=hash_password(DEMO_PASSWORD))
    admin.roles.append(role)
    db.add(admin)
    db.flush()
    return admin


def create_categories(db: Session, admin: User) -> dict[str, uuid.UUID]:
    ids = {}
    for name in CATEGORIES:
        category = Category(name=name, slug=slugify(name), created_by=admin.id)
        db.add(category)
        db.flush()
        ids[name] = category.id
    print(f"categories: {len(ids)} created")
    return ids


def create_sellers(db: Session, rng: random.Random) -> dict[str, uuid.UUID]:
    role = db.scalar(select(Role).where(Role.name == "seller"))
    ids = {}

    for index, spec in enumerate(SELLERS):
        # Older stores joined earlier, so the seller list reads as a history
        # rather than everyone appearing on the same day.
        joined = dt.datetime.now(dt.timezone.utc) - dt.timedelta(
            days=HISTORY_DAYS + 30 + index * rng.randint(8, 25)
        )
        user = User(
            email=spec["email"], name=spec["name"], phone=spec["phone"],
            password_hash=hash_password(DEMO_PASSWORD),
            created_at=joined, updated_at=joined,
        )
        user.roles.append(role)
        user.seller_profile = SellerProfile(
            store_name=spec["store_name"],
            store_description=spec["store_description"],
            whatsapp_number=spec["whatsapp_number"],
        )
        db.add(user)
        db.flush()
        ids[spec["key"]] = user.id

    print(f"sellers: {len(ids)} created")
    return ids


# --- Stage 2: photos (no database session open) ---------------------------

def resolve_photos(
    specs: list[dict], seller_ids: dict[str, uuid.UUID], fetcher: ImageFetcher, rng: random.Random
) -> dict[str, list[str]]:
    """Source photos and upload them, returning slug -> public URLs.

    Deliberately runs outside any transaction: this is the slow part.
    """
    photos: dict[str, list[str]] = {}
    for position, spec in enumerate(specs, start=1):
        want = rng.choices([2, 3, 4], weights=[4, 4, 2])[0]
        names = fetcher.resolve(slug=spec["slug"], queries=spec["queries"], want=want)
        urls = fetcher.upload(seller_id=seller_ids[spec["seller_key"]], cache_names=names)
        photos[spec["slug"]] = urls
        marker = "" if urls else "   <- no photo"
        print(f"  [{position:>2}/{len(specs)}] {spec['name'][:44]:<44} {len(urls)} image(s){marker}")

    covered = sum(1 for urls in photos.values() if urls)
    print(f"photos: {sum(len(u) for u in photos.values())} uploaded across {covered}/{len(specs)} products")
    return photos


# --- Stage 3: products -----------------------------------------------------

def create_products(
    db: Session,
    specs: list[dict],
    seller_ids: dict[str, uuid.UUID],
    category_ids: dict[str, uuid.UUID],
    photos: dict[str, list[str]],
    rng: random.Random,
) -> None:
    now = dt.datetime.now(dt.timezone.utc)

    for spec in specs:
        # Listings are spread across the history window, weighted towards recent
        # weeks, so the admin "new listings per week" chart has a shape.
        age_days = min(HISTORY_DAYS - 1, int(rng.betavariate(2.2, 1.6) * HISTORY_DAYS))
        listed_at = now - dt.timedelta(days=HISTORY_DAYS - age_days, hours=rng.randint(0, 23))

        product = Product(
            seller_id=seller_ids[spec["seller_key"]],
            category_id=category_ids[spec["category"]],
            name=spec["name"],
            slug=spec["slug"],
            description=spec["description"],
            price=spec["price"],
            stock=spec["stock"],
            status=ProductStatus(spec["status"]),
            created_at=listed_at,
            updated_at=listed_at,
        )
        product.images = [
            ProductImage(url=url, is_main=(position == 0), sort_order=position)
            for position, url in enumerate(photos.get(spec["slug"], []))
        ]
        db.add(product)

    db.flush()
    print(f"products: {len(specs)} created")


# --- Stage 4: view history -------------------------------------------------

def backfill_views(db: Session, rng: random.Random) -> int:
    """Generate view history.

    Three things stop the charts being flat: a long-tailed popularity weight per
    product, a platform-wide growth trend across the window, and a weekend lift.
    """
    now = dt.datetime.now(dt.timezone.utc)
    rows: list[dict] = []

    products = db.execute(
        select(Product.id, Product.created_at).where(Product.status == ProductStatus.active)
    ).all()

    for product_id, created_at in products:
        # Long-tailed, so a handful of products clearly outperform the rest.
        # The cap matters: an uncapped Pareto draw produced a single product with
        # 100x the median, which flattened every other bar on the charts.
        popularity = min(rng.paretovariate(1.3), 9.0)
        live_days = max(1, (now - created_at).days)

        for day_offset in range(live_days):
            day = now - dt.timedelta(days=day_offset)
            trend = 0.55 + 0.9 * ((HISTORY_DAYS - day_offset) / HISTORY_DAYS)
            weekend = 1.35 if day.weekday() >= 5 else 1.0

            for _ in range(_poisson(rng, popularity * trend * weekend * 0.55)):
                rows.append({
                    "product_id": product_id,
                    "viewed_at": day.replace(
                        hour=rng.randint(8, 23), minute=rng.randint(0, 59), second=rng.randint(0, 59)
                    ),
                })

    for start in range(0, len(rows), 5000):
        db.bulk_insert_mappings(ProductView, rows[start:start + 5000])
    db.flush()
    print(f"product_views: {len(rows)} rows backfilled over {HISTORY_DAYS} days")
    return len(rows)


def _poisson(rng: random.Random, mean: float) -> int:
    """Small Poisson draw by inversion — plenty fast at these means."""
    if mean <= 0:
        return 0
    limit = math.exp(-mean)
    k, product = 0, rng.random()
    while product > limit and k < 40:
        k += 1
        product *= rng.random()
    return k


# --- Stage 5: inquiries ----------------------------------------------------

def create_inquiries(db: Session, rng: random.Random) -> int:
    """Inquiries across all three statuses with varied dates.

    Older inquiries are more likely to be resolved, which is what makes the
    seller dashboard's status breakdown look like a real workload rather than an
    even three-way split.
    """
    now = dt.datetime.now(dt.timezone.utc)
    active = db.execute(
        select(Product.id, Product.seller_id, Product.created_at)
        .where(Product.status == ProductStatus.active)
    ).all()

    # Popular products attract proportionally more questions, capped for the
    # same reason as the view weights.
    weights = [min(rng.paretovariate(1.5), 7.0) for _ in active]
    count = 0

    for _ in range(140):
        product_id, seller_id, created_at = rng.choices(active, weights=weights)[0]
        live_days = max(1, (now - created_at).days)
        age_days = rng.randint(0, live_days - 1) if live_days > 1 else 0
        created = now - dt.timedelta(days=age_days, hours=rng.randint(0, 23))

        if age_days < 4:
            status = rng.choices([InquiryStatus.new, InquiryStatus.contacted], weights=[7, 3])[0]
        elif age_days < 21:
            status = rng.choices(
                [InquiryStatus.new, InquiryStatus.contacted, InquiryStatus.closed], weights=[2, 5, 3]
            )[0]
        else:
            status = rng.choices([InquiryStatus.contacted, InquiryStatus.closed], weights=[2, 8])[0]

        resolved = created + dt.timedelta(
            hours=rng.randint(2, 96) if status is not InquiryStatus.new else 0
        )
        buyer = rng.choice(BUYER_NAMES)
        contact = (
            f"{slugify(buyer)}@example.com" if rng.random() < 0.65
            else f"+601{rng.randint(10000000, 99999999)}"
        )

        inquiry = Inquiry(
            product_id=product_id, seller_id=seller_id, buyer_name=buyer, buyer_contact=contact,
            message=rng.choice(INQUIRY_MESSAGES), status=status,
            created_at=created, updated_at=min(resolved, now),
        )
        db.add(inquiry)
        db.flush()

        # Every inquiry produced a notification when it arrived; sellers have
        # worked through the older ones.
        db.add(Notification(
            user_id=seller_id, type="new_inquiry", reference_id=inquiry.id,
            is_read=status is not InquiryStatus.new, created_at=created,
        ))
        count += 1

    db.flush()
    print(f"inquiries: {count} created, each with a notification")
    return count


# --- Orchestration ---------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description="Seed the demo catalogue")
    parser.add_argument("--reset", action="store_true", help="remove existing seed data first")
    parser.add_argument("--no-images", action="store_true", help="skip photo sourcing")
    parser.add_argument("--seed", type=int, default=20260812, help="RNG seed for reproducibility")
    args = parser.parse_args()

    rng = random.Random(args.seed)
    specs = product_specs()

    # Stage 1 — accounts and taxonomy.
    with SessionLocal() as db:
        if args.reset:
            reset(db)
        if db.scalar(select(Category.id).limit(1)) is not None:
            sys.exit("Catalogue is not empty. Re-run with --reset to replace it.")

        admin = get_or_create_admin(db)
        category_ids = create_categories(db, admin)
        seller_ids = create_sellers(db, rng)
        db.commit()

    # Stage 2 — photos. No session held while this runs.
    photos: dict[str, list[str]] = {}
    if args.no_images:
        print("photos: skipped (--no-images)")
    else:
        fetcher = ImageFetcher()
        try:
            photos = resolve_photos(specs, seller_ids, fetcher, rng)
        finally:
            fetcher.close()

    # Stages 3 to 5 — short transactions each.
    with SessionLocal() as db:
        create_products(db, specs, seller_ids, category_ids, photos, rng)
        db.commit()

    with SessionLocal() as db:
        backfill_views(db, rng)
        db.commit()

    with SessionLocal() as db:
        create_inquiries(db, rng)
        db.commit()

    print("\nSeed complete.")
    print(f"  admin  : {ADMIN_EMAIL} / {DEMO_PASSWORD}")
    print(f"  sellers: {SELLERS[0]['email']} (and 7 others) / {DEMO_PASSWORD}")
    print("  Change these before any public deployment.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
