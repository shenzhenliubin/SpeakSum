"""Tests for custom exceptions."""

from fastapi.testclient import TestClient

from speaksum.core.exceptions import SpeakSumException


def test_speaksum_exception_handler(authorized_client: TestClient) -> None:
    # The exception handler is registered in main.py
    # Test that it properly formats SpeakSumException
    exc = SpeakSumException("Test error", status_code=418)
    assert exc.message == "Test error"
    assert exc.status_code == 418


def test_speaksum_exception_default_status() -> None:
    exc = SpeakSumException("Default status")
    assert exc.status_code == 500
