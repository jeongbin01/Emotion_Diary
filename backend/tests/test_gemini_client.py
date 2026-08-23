import pytest

from app.services.ai import gemini_client
from app.services.ai.gemini_client import GeminiClientError, classify_with_gemini


class FakeUsage:
    def __init__(self, prompt_token_count=None, candidates_token_count=None, thoughts_token_count=None):
        if prompt_token_count is not None:
            self.prompt_token_count = prompt_token_count
        if candidates_token_count is not None:
            self.candidates_token_count = candidates_token_count
        if thoughts_token_count is not None:
            self.thoughts_token_count = thoughts_token_count


class FakeResponse:
    def __init__(self, parsed=None, usage_metadata=None):
        self.parsed = parsed
        self.usage_metadata = usage_metadata


class FakeModels:
    def __init__(self, response=None, exception=None, calls=None):
        self._response = response
        self._exception = exception
        self._calls = calls

    def generate_content(self, **kwargs):
        if self._calls is not None:
            self._calls.append(kwargs)
        if self._exception is not None:
            raise self._exception
        return self._response


class FakeClient:
    def __init__(self, response=None, exception=None, calls=None):
        self.models = FakeModels(response=response, exception=exception, calls=calls)


def install_fake_client(monkeypatch, *, response=None, exception=None, calls=None, init_calls=None):
    def factory(api_key):
        if init_calls is not None:
            init_calls.append(api_key)
        return FakeClient(response=response, exception=exception, calls=calls)

    monkeypatch.setattr(gemini_client.genai, "Client", factory)


def test_classify_with_gemini_returns_parsed_result_and_token_counts(monkeypatch):
    sentinel_parsed = object()
    usage = FakeUsage(prompt_token_count=269, candidates_token_count=300, thoughts_token_count=44)
    install_fake_client(monkeypatch, response=FakeResponse(parsed=sentinel_parsed, usage_metadata=usage))

    result = classify_with_gemini("오늘은 좋은 하루였다", "긍정", "fake-api-key")

    assert result.parsed is sentinel_parsed
    assert result.input_tokens == 269
    # candidates(실제 출력) + thoughts(내부 추론) 모두 output 단가로 과금되므로 합산되어야 한다.
    assert result.output_tokens == 344


def test_classify_with_gemini_passes_the_api_key_to_the_sdk_client(monkeypatch):
    init_calls: list[str] = []
    install_fake_client(
        monkeypatch,
        response=FakeResponse(parsed=object(), usage_metadata=FakeUsage()),
        init_calls=init_calls,
    )

    classify_with_gemini("텍스트", "중립", "my-secret-key")

    assert init_calls == ["my-secret-key"]


def test_classify_with_gemini_disables_thinking_for_cost_savings(monkeypatch):
    # README의 Cost Optimization 실측(6.3배 절감)은 thinking_budget=0 설정 하나에서 나오므로,
    # 이 설정이 회귀로 빠지지 않도록 호출 인자를 직접 검증한다.
    calls: list[dict] = []
    install_fake_client(
        monkeypatch,
        response=FakeResponse(parsed=object(), usage_metadata=FakeUsage()),
        calls=calls,
    )

    classify_with_gemini("텍스트", "긍정", "fake-api-key")

    assert len(calls) == 1
    assert calls[0]["config"].thinking_config.thinking_budget == 0


def test_classify_with_gemini_treats_missing_usage_fields_as_zero(monkeypatch):
    install_fake_client(monkeypatch, response=FakeResponse(parsed=object(), usage_metadata=FakeUsage()))

    result = classify_with_gemini("텍스트", "긍정", "fake-api-key")

    assert result.input_tokens == 0
    assert result.output_tokens == 0


def test_classify_with_gemini_wraps_sdk_exceptions_as_gemini_client_error(monkeypatch):
    install_fake_client(monkeypatch, exception=RuntimeError("네트워크 실패"))

    with pytest.raises(GeminiClientError):
        classify_with_gemini("텍스트", "긍정", "fake-api-key")


def test_classify_with_gemini_raises_when_response_has_no_parsed_result(monkeypatch):
    install_fake_client(monkeypatch, response=FakeResponse(parsed=None, usage_metadata=FakeUsage()))

    with pytest.raises(GeminiClientError):
        classify_with_gemini("텍스트", "긍정", "fake-api-key")
