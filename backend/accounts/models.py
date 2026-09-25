from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):

    ROLE_CHOICES = [
        ("ADMIN", "Administrator"),
        ("ANALYST", "Security Analyst"),
        ("VIEWER", "Viewer"),
    ]

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default="VIEWER"
    )

    department = models.CharField(
        max_length=150,
        null=True,
        blank=True
    )

    phone = models.CharField(
        max_length=30,
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.username} ({self.role})"

    @property
    def is_admin(self):
        return self.role == "ADMIN"

    @property
    def is_analyst(self):
        return self.role == "ANALYST"

    @property
    def is_viewer(self):
        return self.role == "VIEWER"
