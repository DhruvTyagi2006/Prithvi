import csv
from pathlib import Path

from backend.database.connection import SessionLocal, init_db
from backend.models.shelter import Shelter


CSV_PATH = Path("data/final_shelter_data.csv")


def main():
    print("=" * 70)
    print("PRITHVI SHELTER CSV IMPORT")
    print("=" * 70)

    if not CSV_PATH.exists():
        raise FileNotFoundError(
            f"Missing: {CSV_PATH}"
        )

    init_db()

    with CSV_PATH.open(
        "r",
        encoding="utf-8-sig",
        newline=""
    ) as f:
        rows = list(csv.DictReader(f))

    print("CSV records:", len(rows))

    db = SessionLocal()

    try:
        # Only replace the shelter records.
        # Nothing else in the database is touched.
        db.query(Shelter).delete()

        imported = 0

        for row in rows:
            try:
                shelter = Shelter(
                    id=row["facility_id"].strip(),
                    name=row["name"].strip(),
                    latitude=float(row["latitude"]),
                    longitude=float(row["longitude"]),
                    capacity=int(float(row.get("capacity") or 0)),
                )

                db.add(shelter)
                imported += 1

            except Exception as e:
                print(
                    "SKIPPED:",
                    row.get("facility_id"),
                    "|",
                    e
                )

        db.commit()

        print()
        print("=" * 70)
        print("IMPORT COMPLETE")
        print("=" * 70)
        print("Imported shelters:", imported)

        count = db.query(Shelter).count()

        print("Database shelter count:", count)

        if count != imported:
            raise RuntimeError(
                f"Expected {imported}, database contains {count}"
            )

        print()
        print("SUCCESS")
        print("=" * 70)

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    main()
