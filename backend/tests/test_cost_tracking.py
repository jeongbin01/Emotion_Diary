from app.services.cost_tracking import compute_gemini_cost_usd


def test_compute_gemini_cost_usd_matches_readme_measurement():
    # README Cost Optimization에서 실측한 값(thinkingBudget=0 설정): input 269 / output 344
    # 토큰일 때 요청당 비용 $0.000941. 계산식이 그 실측치를 재현하는지 확인한다.
    cost = compute_gemini_cost_usd(input_tokens=269, output_tokens=344)

    assert round(cost.total_cost_usd, 6) == round(
        (269 / 1_000_000) * 0.30 + (344 / 1_000_000) * 2.50, 6
    )
    assert round(cost.total_cost_usd, 6) == 0.000941


def test_compute_gemini_cost_usd_zero_tokens():
    cost = compute_gemini_cost_usd(input_tokens=0, output_tokens=0)
    assert cost.total_cost_usd == 0
