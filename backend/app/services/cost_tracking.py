from dataclasses import dataclass, field

# 가격 출처: https://ai.google.dev/gemini-api/docs/pricing (2026-08-09 확인). app/lib/geminiCost.ts와
# 동일한 값 — 모델을 교체하면 이 값도 함께 갱신해야 한다.
GEMINI_PRICING_USD_PER_1M_TOKENS = {"input": 0.30, "output": 2.50}


@dataclass
class CostStats:
    request_count: int = 0
    gemini_request_count: int = 0
    fasttext_request_count: int = 0
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    total_cost_usd: float = 0.0


@dataclass
class GeminiCostBreakdown:
    input_tokens: int
    output_tokens: int
    input_cost_usd: float
    output_cost_usd: float
    total_cost_usd: float


# 서버 프로세스 메모리에만 있는 인메모리 집계 — geminiCost.ts의 globalThis.__costStats와 동일한
# 한계(재시작 시 초기화)를 그대로 가진다. DB 적재는 EmotionAnalysis 테이블의 누적 쿼리로 대체한다
# (docs/PORTFOLIO_REDESIGN.md §19), 이 모듈은 "지금 이 순간"의 실시간 집계용으로만 남겨둔다.
_stats = CostStats()


def compute_gemini_cost_usd(input_tokens: int, output_tokens: int) -> GeminiCostBreakdown:
    input_cost = (input_tokens / 1_000_000) * GEMINI_PRICING_USD_PER_1M_TOKENS["input"]
    output_cost = (output_tokens / 1_000_000) * GEMINI_PRICING_USD_PER_1M_TOKENS["output"]
    return GeminiCostBreakdown(
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        input_cost_usd=input_cost,
        output_cost_usd=output_cost,
        total_cost_usd=input_cost + output_cost,
    )


def record_gemini_request(input_tokens: int, output_tokens: int) -> GeminiCostBreakdown:
    cost = compute_gemini_cost_usd(input_tokens, output_tokens)
    _stats.request_count += 1
    _stats.gemini_request_count += 1
    _stats.total_input_tokens += input_tokens
    _stats.total_output_tokens += output_tokens
    _stats.total_cost_usd += cost.total_cost_usd
    return cost


def record_fasttext_request() -> None:
    _stats.request_count += 1
    _stats.fasttext_request_count += 1


def get_cost_stats() -> dict:
    return {
        "requestCount": _stats.request_count,
        "geminiRequestCount": _stats.gemini_request_count,
        "fasttextRequestCount": _stats.fasttext_request_count,
        "totalInputTokens": _stats.total_input_tokens,
        "totalOutputTokens": _stats.total_output_tokens,
        "totalCostUSD": _stats.total_cost_usd,
        "avgCostPerRequestUSD": (
            _stats.total_cost_usd / _stats.request_count if _stats.request_count else 0
        ),
        "avgCostPerGeminiRequestUSD": (
            _stats.total_cost_usd / _stats.gemini_request_count if _stats.gemini_request_count else 0
        ),
        "fasttextTrafficShare": (
            _stats.fasttext_request_count / _stats.request_count if _stats.request_count else 0
        ),
        "pricingUsedUSD": GEMINI_PRICING_USD_PER_1M_TOKENS,
    }


def reset_cost_stats() -> None:
    # 테스트에서만 사용 — 프로덕션 코드 경로에서는 호출하지 않는다.
    global _stats
    _stats = CostStats()
