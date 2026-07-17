import { GoogleGenAI, Type } from '@google/genai'
import { runInference, type Emotion } from '@/app/lib/inferServer'
import { DETAILED_EMOTION_LABELS } from '@/app/lib/emotion-theme'

const GEMINI_MODEL = 'gemini-2.5-flash'

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    label: {
      type: Type.STRING,
      format: 'enum',
      enum: DETAILED_EMOTION_LABELS,
      description: '일기 전체를 가장 잘 대표하는 하나의 감정',
    },
    confidence: {
      type: Type.NUMBER,
      description: 'label에 대한 확신도 (0~1)',
    },
    emotions: {
      type: Type.ARRAY,
      description: '일기에서 느껴지는 감정 최대 5개, 강한 순서대로',
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING, format: 'enum', enum: DETAILED_EMOTION_LABELS },
          score: { type: Type.NUMBER, description: '해당 감정의 강도 (0~1)' },
        },
        required: ['label', 'score'],
      },
    },
    aiOneLiner: {
      type: Type.STRING,
      description: '오늘 감정을 관통하는 통찰을 정말 한 문장(15~35자)으로. 마침표 하나만 사용하고 줄바꿈 없이 작성',
    },
    aiMessage: {
      type: Type.STRING,
      description: '일기에 공감하는 2~3문장의 따뜻한 답변',
    },
    causes: {
      type: Type.ARRAY,
      description: '오늘의 감정에 영향을 준 주요 원인 2~4가지와 각각의 비중(%). 비중의 합은 대략 100.',
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING, description: '원인을 짧은 명사구로 (예: 수면 부족, 업무 스트레스)' },
          percent: { type: Type.NUMBER, description: '해당 원인이 차지하는 비중 (0~100)' },
        },
        required: ['label', 'percent'],
      },
    },
    keywords: {
      type: Type.ARRAY,
      description: '일기 내용에서 뽑은 상황 키워드 3~5개, 짧은 명사형 (예: 추움, 야근, 산책)',
      items: { type: Type.STRING },
    },
    mindState: {
      type: Type.STRING,
      description: '오늘 일기에서 드러나는 심리 상태에 대한 통찰, 2문장 이내',
    },
    growthPoint: {
      type: Type.STRING,
      description: '오늘의 기록에서 찾을 수 있는 성장 포인트나 스스로를 다독일 말, 2문장 이내',
    },
    tomorrowMessage: {
      type: Type.STRING,
      description: '내일의 나에게 보내는 짧은 응원 메시지, 1~2문장',
    },
    activities: {
      type: Type.ARRAY,
      description: '오늘의 감정 상태에 도움이 될 만한 짧은 추천 활동 4가지',
      items: {
        type: Type.OBJECT,
        properties: {
          icon: { type: Type.STRING, description: '활동을 표현하는 이모지 1개' },
          label: { type: Type.STRING, description: '활동 이름, 6자 이내' },
        },
        required: ['icon', 'label'],
      },
    },
    quote: {
      type: Type.STRING,
      description: '오늘 하루를 위한 짧은 응원 문장 1개',
    },
  },
  required: [
    'label',
    'confidence',
    'emotions',
    'aiOneLiner',
    'aiMessage',
    'causes',
    'keywords',
    'mindState',
    'growthPoint',
    'tomorrowMessage',
    'activities',
    'quote',
  ],
}

type AnalyzeResult = Emotion & {
  aiOneLiner: string
  aiMessage: string
  causes: { label: string; percent: number }[]
  keywords: string[]
  mindState: string
  growthPoint: string
  tomorrowMessage: string
  activities: { icon: string; label: string }[]
  quote: string
}

function createFallbackMessage(emotion: Emotion) {
  return `오늘 일기에서 ${emotion.label} 감정이 느껴졌어요. 지금의 감정을 천천히 인정해도 괜찮고, 오늘 하루를 잘 지나온 자신에게 조금 다정하게 대해주세요.`
}

function createFallbackOneLiner(emotion: Emotion) {
  return `오늘 하루, ${emotion.label} 감정이 마음을 가장 크게 채웠어요.`
}

const FALLBACK_ACTIVITIES: Record<string, { icon: string; label: string }[]> = {
  긍정: [
    { icon: '🎵', label: '좋아하는 음악' },
    { icon: '📞', label: '소중한 사람과 통화' },
    { icon: '🚶', label: '산책 10분' },
    { icon: '📝', label: '오늘 기분 기록' },
  ],
  중립: [
    { icon: '🧘', label: '스트레칭' },
    { icon: '☕', label: '따뜻한 차' },
    { icon: '🚶', label: '산책 10분' },
    { icon: '📖', label: '가벼운 독서' },
  ],
  부정: [
    { icon: '☕', label: '따뜻한 차' },
    { icon: '🌙', label: '일찍 자기' },
    { icon: '🚶', label: '산책 10분' },
    { icon: '🧘', label: '스트레칭' },
  ],
}

function createFallbackResult(baseEmotion: Emotion): AnalyzeResult {
  const polarity = ['긍정', '중립', '부정'].includes(baseEmotion.label) ? baseEmotion.label : '중립'
  return {
    ...baseEmotion,
    aiOneLiner: createFallbackOneLiner(baseEmotion),
    aiMessage: createFallbackMessage(baseEmotion),
    causes: [{ label: '오늘 하루의 여러 순간', percent: 100 }],
    keywords: [baseEmotion.label],
    mindState: `오늘은 ${baseEmotion.label} 감정이 두드러진 하루였어요. 스스로의 상태를 알아차린 것만으로도 의미가 있어요.`,
    growthPoint: '감정을 있는 그대로 기록해본 것 자체가 오늘의 성장 포인트예요.',
    tomorrowMessage: '오늘보다 조금 더 편안한 하루가 되기를 바라요.',
    activities: FALLBACK_ACTIVITIES[polarity],
    quote: '충분히 쉬는 것도 하루를 잘 보내는 방법입니다.',
  }
}

async function classifyWithGemini(text: string, baseEmotion: Emotion): Promise<AnalyzeResult> {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    console.warn('GEMINI_API_KEY is missing.')
    return createFallbackResult(baseEmotion)
  }

  try {
    const ai = new GoogleGenAI({ apiKey })
    const prompt = `당신은 따뜻하고 공감 능력이 뛰어난 감정 일기 AI입니다.
사용자가 오늘 하루 일기를 작성했습니다. 아래 일기 내용을 읽고 감정을 세밀하게 분석해주세요.

일기 내용:
"${text}"

참고로 간단한 감정 분류 모델은 이 일기를 "${baseEmotion.label}" 계열로 예측했습니다.

주어진 감정 목록 중에서만 골라 label, emotions를 작성하고,
aiOneLiner에는 오늘 감정을 관통하는 통찰을 정말 한 문장(15~35자, 마침표 하나, 줄바꿈 없이)으로 작성하고,
aiMessage에는 일기에 공감하며 2~3문장으로 따뜻하게 답변해주세요.
추가로 causes(감정 원인과 비중), keywords(상황 키워드), mindState(심리 상태 통찰), growthPoint(성장 포인트),
tomorrowMessage(내일의 나에게), activities(추천 활동 4개), quote(오늘의 응원 문장)도 함께 작성해주세요.`

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    })

    const parsed = JSON.parse(response.text ?? '')
    return {
      label: parsed.label,
      confidence: parsed.confidence,
      emotions: parsed.emotions,
      aiOneLiner: parsed.aiOneLiner,
      aiMessage: parsed.aiMessage,
      causes: parsed.causes,
      keywords: parsed.keywords,
      mindState: parsed.mindState,
      growthPoint: parsed.growthPoint,
      tomorrowMessage: parsed.tomorrowMessage,
      activities: parsed.activities,
      quote: parsed.quote,
    }
  } catch (error) {
    console.error('Gemini API failed:', error)
    return createFallbackResult(baseEmotion)
  }
}

export async function POST(request: Request) {
  try {
    const { text } = await request.json()

    if (!text?.trim()) {
      return Response.json({ error: '텍스트를 입력해주세요.' }, { status: 400 })
    }

    const baseEmotion = await runInference(text)
    const result = await classifyWithGemini(text, baseEmotion)

    return Response.json(result)
  } catch (error) {
    console.error('Analyze API failed:', error)
    return Response.json(
      { error: '감정 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 },
    )
  }
}
