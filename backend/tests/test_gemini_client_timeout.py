from app.core.config import settings
from app.services.ai import gemini_client
from app.services.ai.gemini_client import classify_with_gemini


class FakeUsage:
    prompt_token_count = 10
    candidates_token_count = 20
    thoughts_token_count = 0


class FakeResponse:
    parsed = object()
    usage_metadata = FakeUsage()


class FakeModels:
    def generate_content(self, **kwargs):
        return FakeResponse()


class FakeClient:
    def __init__(self, api_key, http_options=None):
        self.api_key = api_key
        self.http_options = http_options
        self.models = FakeModels()


def test_classify_with_gemini_configures_the_sdk_client_timeout(monkeypatch):
    captured: list[FakeClient] = []

    def factory(api_key, http_options=None):
        client = FakeClient(api_key=api_key, http_options=http_options)
        captured.append(client)
        return client

    monkeypatch.setattr(gemini_client.genai, "Client", factory)
    monkeypatch.setattr(settings, "gemini_timeout_seconds", 5.0)

    classify_with_gemini("텍스트", "긍정", "fake-api-key")

    assert len(captured) == 1
    # google-genai의 http_options.timeout 단위는 밀리초다.
    assert captured[0].http_options.timeout == 5000
