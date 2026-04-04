"""Tests for authentication API."""

import pytest
from fastapi.testclient import TestClient


class TestAuthAPI:
    """Test authentication endpoints."""

    def test_login_success(self, client: TestClient, test_user) -> None:
        """Test successful login."""
        response = client.post("/api/v1/auth/login", json={
            "email": "test@example.com",
            "password": "pass123",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "access_token" in data["data"]
        assert data["data"]["token_type"] == "bearer"
        assert data["data"]["user"]["email"] == "test@example.com"

    def test_login_invalid_credentials(self, client: TestClient) -> None:
        """Test login with invalid credentials."""
        response = client.post("/api/v1/auth/login", json={
            "email": "test@example.com",
            "password": "wrongpassword",
        })
        assert response.status_code == 401

    def test_login_nonexistent_user(self, client: TestClient) -> None:
        """Test login with non-existent user."""
        response = client.post("/api/v1/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "somepassword",
        })
        assert response.status_code == 401

    def test_register_success(self, client: TestClient) -> None:
        """Test successful registration."""
        response = client.post("/api/v1/auth/register", json={
            "email": "newuser@example.com",
            "password": "newpass123",
        })
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert "access_token" in data["data"]
        assert data["data"]["user"]["email"] == "newuser@example.com"

    def test_register_duplicate_email(self, client: TestClient, test_user) -> None:
        """Test registration with duplicate email."""
        response = client.post("/api/v1/auth/register", json={
            "email": "test@example.com",
            "password": "somepassword",
        })
        assert response.status_code == 400
        assert "Email already registered" in response.json()["detail"]

    def test_register_invalid_password(self, client: TestClient) -> None:
        """Test registration with invalid password (too short)."""
        response = client.post("/api/v1/auth/register", json={
            "email": "test2@example.com",
            "password": "123",  # Too short
        })
        assert response.status_code == 422  # Validation error

    def test_get_current_user(self, authorized_client: TestClient, test_user) -> None:
        """Test getting current user info."""
        response = authorized_client.get("/api/v1/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "id" in data["data"]
        assert "email" in data["data"]

    def test_get_current_user_no_auth(self, client: TestClient) -> None:
        """Test getting current user without authentication."""
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 401
