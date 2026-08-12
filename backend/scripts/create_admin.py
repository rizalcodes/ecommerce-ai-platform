"""Create an admin account.

Admins are not self-registerable (/auth/register only creates sellers), so this
is the bootstrap path for the first platform administrator.

    python -m scripts.create_admin --email you@example.com --name "Your Name"

Prompts for the password if --password is omitted, so it stays out of shell history.
"""

import argparse
import getpass
import sys

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import Role, User


def main() -> int:
    parser = argparse.ArgumentParser(description="Create an admin user")
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", required=True)
    parser.add_argument("--password")
    args = parser.parse_args()

    password = args.password or getpass.getpass("Password: ")
    if len(password) < 8:
        print("Password must be at least 8 characters.", file=sys.stderr)
        return 1

    with SessionLocal() as db:
        if db.scalar(select(User).where(User.email == args.email)) is not None:
            print(f"A user with email {args.email} already exists.", file=sys.stderr)
            return 1

        admin_role = db.scalar(select(Role).where(Role.name == "admin"))
        if admin_role is None:
            print("The 'admin' role is missing. Run: alembic upgrade head", file=sys.stderr)
            return 1

        user = User(
            email=args.email,
            name=args.name,
            password_hash=hash_password(password),
        )
        user.roles.append(admin_role)
        db.add(user)
        db.commit()

        print(f"Created admin {args.email}")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
