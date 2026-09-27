from django.core.management.base import BaseCommand

from accounts.models import User


class Command(BaseCommand):
    help = "Force-reset the SentinelX admin user password."

    def handle(self, *args, **options):
        password = "SentinelX2025!"
        u, created = User.objects.get_or_create(
            username="admin",
            defaults={"email": "admin@sentinelx.local"},
        )
        u.role = "ADMIN"
        u.is_staff = True
        u.is_superuser = True
        u.is_active = True
        u.set_password(password)
        u.save()
        self.stdout.write(self.style.SUCCESS(
            f"{'Created' if created else 'Updated'} admin. "
            f"Password check: {u.check_password(password)}"
        ))
