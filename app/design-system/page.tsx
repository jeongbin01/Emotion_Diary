import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowLeft, Loader2, Stamp, Clock, TrendingUp, Star, Heart,
  Coffee, Moon, Footprints, Wind, Music, BookOpen, Phone, PenLine,
  Droplet, Dumbbell, Sun, Cloud, Sparkles, Brain, Sprout, type LucideIcon,
} from 'lucide-react'
import { EMOTION_THEME, DETAILED_EMOTION_LABELS } from '../lib/emotion-theme'
import EmotionRingCard from '../components/EmotionRingCard'
import EmotionSummaryCard from '../components/EmotionSummaryCard'
import EmotionTop3Card from '../components/EmotionTop3Card'
import CauseDonutChart from '../components/CauseDonutChart'
import WeeklyTrendChart from '../components/WeeklyTrendChart'
import DiaryEntry from '../components/DiaryEntry'
import AiMemo from '../components/AiMemo'
import ActivitiesCard from '../components/ActivitiesCard'
import QuoteCard from '../components/QuoteCard'
import EmotionDetailSummary from '../components/EmotionDetailSummary'
import EmotionChart from '../components/EmotionChart'

export const metadata: Metadata = {
  title: '디자인 시스템 · 오늘의 하루',
  description: 'Warm Minimal 디자인 시스템 — 컬러 토큰, 감정 색상 체계, 컴포넌트 쇼케이스',
}

const COLOR_TOKENS = [
  { name: '--bg', value: '#F8F4EE', usage: '페이지 배경' },
  { name: '--card', value: '#FFFFFF', usage: '카드 배경' },
  { name: '--primary', value: '#8B74D9', usage: '포인트 컬러(보라)' },
  { name: '--primary-light', value: '#ECE6FF', usage: '진행률 트랙, 은은한 강조' },
  { name: '--secondary', value: '#F5F2FF', usage: '태그·강조 배경' },
  { name: '--border', value: '#E8E3DA', usage: '카드 테두리' },
  { name: '--text', value: '#2B2B2B', usage: '본문 텍스트' },
  { name: '--sub-text', value: '#6D6D6D', usage: '보조 텍스트' },
  { name: '--success', value: '#7DCB88', usage: '성공/긍정 상태' },
  { name: '--warning', value: '#F2C94C', usage: '경고 상태' },
  { name: '--error', value: '#EB6A6A', usage: '에러/부정 상태' },
]

const TOC = [
  { id: 'colors', label: '컬러 토큰' },
  { id: 'typography', label: '타이포그래피' },
  { id: 'card-utilities', label: '카드 & 유틸리티' },
  { id: 'icons', label: '아이콘' },
  { id: 'emotion-colors', label: '감정 색상 체계' },
  { id: 'components', label: '컴포넌트 쇼케이스' },
]

// 프로젝트 전반에서 실제로 쓰이는 lucide-react 아이콘. 새 아이콘을 추가할 때 이 목록도 같이 업데이트한다.
const ICON_SET: { icon: LucideIcon; name: string; usedIn: string }[] = [
  { icon: Stamp, name: 'Stamp', usedIn: '일기 기록하기 버튼' },
  { icon: Loader2, name: 'Loader2', usedIn: '분석 중 로딩 스피너' },
  { icon: Clock, name: 'Clock', usedIn: 'EmotionRingCard 시각' },
  { icon: TrendingUp, name: 'TrendingUp', usedIn: 'EmotionRingCard 전일 대비' },
  { icon: Star, name: 'Star', usedIn: '감정 강도 별점' },
  { icon: Heart, name: 'Heart', usedIn: 'QuoteCard 좋아요' },
  { icon: Brain, name: 'Brain', usedIn: 'EmotionDetailSummary 심리 상태' },
  { icon: Sprout, name: 'Sprout', usedIn: 'EmotionDetailSummary 성장 포인트' },
  { icon: Coffee, name: 'Coffee', usedIn: 'ActivitiesCard 차/커피' },
  { icon: Moon, name: 'Moon', usedIn: 'ActivitiesCard 수면' },
  { icon: Footprints, name: 'Footprints', usedIn: 'ActivitiesCard 산책' },
  { icon: Wind, name: 'Wind', usedIn: 'ActivitiesCard 스트레칭' },
  { icon: Music, name: 'Music', usedIn: 'ActivitiesCard 음악' },
  { icon: BookOpen, name: 'BookOpen', usedIn: 'ActivitiesCard 독서' },
  { icon: Phone, name: 'Phone', usedIn: 'ActivitiesCard 통화' },
  { icon: PenLine, name: 'PenLine', usedIn: 'ActivitiesCard 기록' },
  { icon: Droplet, name: 'Droplet', usedIn: 'ActivitiesCard 샤워' },
  { icon: Dumbbell, name: 'Dumbbell', usedIn: 'ActivitiesCard 운동' },
  { icon: Sun, name: 'Sun', usedIn: 'ActivitiesCard 햇살' },
  { icon: Cloud, name: 'Cloud', usedIn: 'ActivitiesCard 바람' },
  { icon: Sparkles, name: 'Sparkles', usedIn: 'ActivitiesCard 기본 아이콘' },
  { icon: ArrowLeft, name: 'ArrowLeft', usedIn: '뒤로가기 링크' },
]

const POLARITY_GROUPS: { title: string; labels: string[] }[] = [
  {
    title: '긍정 · 황토 ~ 골드',
    labels: DETAILED_EMOTION_LABELS.filter((l) =>
      ['행복', '사랑', '설렘', '감사', '안도', '자부심', '경외감', '평화로움', '흥분', '만족', '안심', '편안함', '기대', '감동'].includes(l),
    ),
  },
  {
    title: '부정 · 슬레이트 ~ 인디고',
    labels: DETAILED_EMOTION_LABELS.filter((l) =>
      ['슬픔', '분노', '불안', '혐오', '죄책감', '수치심', '질투', '외로움', '무기력', '후회'].includes(l),
    ),
  },
  {
    title: '중립 · 세이지 ~ 그레이',
    labels: DETAILED_EMOTION_LABELS.filter((l) =>
      ['놀람', '지루함', '피곤함', '혼란', '당황', '긴장'].includes(l),
    ),
  },
]

// 컴포넌트 쇼케이스용 샘플 데이터. 실제 분석 결과가 아니라 레이아웃 확인 목적의 목데이터다.
const MOCK = {
  label: '설렘',
  confidence: 0.82,
  aiOneLiner: '새로운 시작 앞에서 마음이 한껏 부풀어 오른 하루였어요.',
  keywords: ['새로운 시작', '친구', '커피'],
  emotions: [
    { label: '설렘', score: 0.82 },
    { label: '행복', score: 0.64 },
    { label: '감사', score: 0.47 },
    { label: '평화로움', score: 0.31 },
    { label: '피곤함', score: 0.18 },
  ],
  causes: [
    { label: '오랜만의 친구 만남', percent: 45 },
    { label: '새로 시작한 프로젝트', percent: 35 },
    { label: '맑은 날씨', percent: 20 },
  ],
  activities: [
    { icon: '🎵', label: '좋아하는 음악' },
    { icon: '📞', label: '소중한 사람과 통화' },
    { icon: '🚶', label: '산책 10분' },
    { icon: '📝', label: '오늘 기분 기록' },
  ],
  diaryText: '오랜만에 만난 친구랑 카페에서 두 시간 넘게 수다 떨었다. 다음 주에 시작하는 새 프로젝트 얘기도 했는데, 걱정보다 기대가 더 큰 것 같다. 날씨도 좋아서 집에 오는 길에 괜히 한 바퀴 더 돌았다.',
  aiMessage: '새로운 시작을 앞두고 설레는 마음이 잘 느껴져요. 친구와의 시간이 오늘 하루를 더 든든하게 채워준 것 같아요. 그 기분 그대로 다음 주를 맞이해도 좋을 것 같습니다.',
  quote: '설렘은 준비가 되었다는 마음의 신호입니다.',
  mindState: '변화를 앞두고 불안보다 기대가 앞서는, 안정적인 심리 상태예요.',
  growthPoint: '걱정에 머무르지 않고 기대로 마음을 옮긴 것 자체가 성장 포인트예요.',
  tomorrowMessage: '오늘의 설렘을 잊지 말고, 내일도 한 걸음씩 가볍게 나아가요.',
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="mb-14 lg:mb-20 scroll-mt-8">
      <h2 className="font-pretendard text-[22px] sm:text-[26px] font-bold text-[#2B2B2B]">{title}</h2>
      <p className="mt-1.5 font-pretendard text-[14px] text-[#6D6D6D]">{description}</p>
      <div className="mt-6">{children}</div>
    </section>
  )
}

export default function DesignSystemPage() {
  return (
    <div className="dashboard-bg min-h-screen px-5 sm:px-8 lg:px-10 py-12 lg:py-16">
      <div className="w-full max-w-[1200px] mx-auto">
        <header className="fade-up mb-12 lg:mb-16">
          <Link
            href="/"
            className="ds-btn inline-flex items-center gap-1.5 font-pretendard text-[13px] font-medium text-[#8B74D9]"
          >
            <ArrowLeft size={15} strokeWidth={2.5} />
            오늘의 하루로 돌아가기
          </Link>
          <h1 className="mt-4 font-pretendard font-bold text-[32px] sm:text-[38px] lg:text-[44px] text-[#2B2B2B]">
            Warm Minimal Design System
          </h1>
          <p className="mt-3 font-pretendard text-[14px] text-[#6D6D6D] max-w-[640px]">
            컬러 토큰, 감정 색상 체계, 카드 컴포넌트를 한 화면에 모았습니다. 아래 컴포넌트 쇼케이스는
            실제 감정 분석 결과가 아니라 레이아웃 확인용 샘플 데이터로 채워져 있습니다.
          </p>
          <nav className="mt-6 flex flex-wrap gap-2">
            {TOC.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="ds-btn ds-tag hover:brightness-95"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </header>

        <Section
          id="colors"
          title="컬러 토큰"
          description="globals.css에 정의된 CSS 변수. 카드, 배경, 텍스트 등 UI 전반에서 이 토큰만 참조한다."
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {COLOR_TOKENS.map((token) => (
              <div key={token.name} className="ds-card p-4">
                <div
                  className="h-14 rounded-xl border"
                  style={{ backgroundColor: token.value, borderColor: 'var(--border)' }}
                />
                <p className="mt-3 font-pretendard text-[13px] font-semibold text-[#2B2B2B]">{token.name}</p>
                <p className="font-pretendard text-[12px] text-[#6D6D6D]">{token.value}</p>
                <p className="mt-1 font-pretendard text-[11px] text-[#6D6D6D]">{token.usage}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="typography"
          title="타이포그래피"
          description="본문은 Pretendard, 손으로 쓴 일기 원문과 결과 텍스트는 Gaegu를 사용한다."
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="ds-card p-6 lg:p-8">
              <p className="font-pretendard text-[13px] font-medium text-[#6D6D6D] mb-4">Pretendard Variable</p>
              <p className="font-pretendard text-[28px] font-bold text-[#2B2B2B]">오늘 하루 어땠나요?</p>
              <p className="font-pretendard text-[18px] font-semibold text-[#2B2B2B] mt-2">감정 요약 카드 타이틀</p>
              <p className="font-pretendard text-[15px] font-medium text-[#2B2B2B] mt-2">본문 텍스트, 15px medium</p>
              <p className="font-pretendard text-[13px] text-[#6D6D6D] mt-2">보조 텍스트, 13px regular</p>
            </div>
            <div className="ds-card p-6 lg:p-8">
              <p className="font-pretendard text-[13px] font-medium text-[#6D6D6D] mb-4">Gaegu (손글씨)</p>
              <p className="font-gaegu text-[24px] text-[#2B2B2B]">오늘도 하루를 잘 보냈다.</p>
              <p className="notepad-lines rounded-2xl bg-[#FDF6D8] px-5 pt-1 pb-4 mt-4 font-gaegu text-[19px] text-[#2B2B2B]">
                실제 일기 입력창과 같은 줄노트 배경 위에 표시하면 이런 느낌이다.
              </p>
            </div>
          </div>
        </Section>

        <Section
          id="card-utilities"
          title="카드 & 유틸리티"
          description="ds-card, ds-tag, ds-progress-*, ds-btn 은 대시보드 전체에서 공유하는 기본 단위다."
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="ds-card ds-card-hover p-6">
              <p className="font-pretendard text-[13px] font-medium text-[#6D6D6D] mb-2">.ds-card / .ds-card-hover</p>
              <p className="font-pretendard text-[13px] text-[#2B2B2B]">흰 배경, 1px 보더, radius 20px, hover 시 살짝 떠오른다.</p>
            </div>
            <div className="ds-card p-6">
              <p className="font-pretendard text-[13px] font-medium text-[#6D6D6D] mb-3">.ds-tag</p>
              <div className="flex flex-wrap gap-2">
                <span className="ds-tag" style={{ backgroundColor: '#F5F2FF', color: '#8B74D9' }}>#산책</span>
                <span className="ds-tag" style={{ backgroundColor: '#FFF3E0', color: '#E0A458' }}>#커피</span>
                <span className="ds-tag" style={{ backgroundColor: '#E8F5EC', color: '#5FAE73' }}>#새로운 시작</span>
              </div>
            </div>
            <div className="ds-card p-6">
              <p className="font-pretendard text-[13px] font-medium text-[#6D6D6D] mb-3">.ds-progress-track / .ds-progress-fill</p>
              <div className="ds-progress-track">
                <div className="ds-progress-fill" style={{ width: '68%', backgroundColor: '#8B74D9' }} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
            <div className="ds-card p-6">
              <p className="font-pretendard text-[13px] font-medium text-[#6D6D6D] mb-4">버튼 (DiaryForm 기준)</p>
              <div className="space-y-3">
                <button
                  type="button"
                  className="ds-btn w-full py-3.5 rounded-2xl font-pretendard text-[15px] font-semibold text-white flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#8B74D9' }}
                >
                  <Stamp size={17} strokeWidth={2} />
                  오늘의 감정 기록하기
                </button>
                <button
                  type="button"
                  disabled
                  className="ds-btn w-full py-3.5 rounded-2xl font-pretendard text-[15px] font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#8B74D9' }}
                >
                  <Loader2 size={17} className="animate-spin" />
                  감정을 분석하는 중...
                </button>
                <button
                  type="button"
                  className="ds-btn w-full py-3.5 rounded-2xl border font-pretendard text-[15px] font-medium text-[#6D6D6D] hover:bg-white transition-colors duration-150"
                  style={{ borderColor: '#E8E3DA' }}
                >
                  다시 쓰기
                </button>
              </div>
            </div>
            <div className="ds-card p-6">
              <p className="font-pretendard text-[13px] font-medium text-[#6D6D6D] mb-4">Radius & Shadow</p>
              <div className="flex items-center gap-4">
                <div
                  className="w-20 h-20 shrink-0 bg-[#F5F2FF] border"
                  style={{ borderRadius: 'var(--radius)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}
                />
                <div>
                  <p className="font-pretendard text-[13px] text-[#2B2B2B]">--radius: 20px</p>
                  <p className="font-pretendard text-[13px] text-[#2B2B2B] mt-1">--shadow: 0 6px 20px rgba(0,0,0,.04)</p>
                  <p className="font-pretendard text-[12px] text-[#6D6D6D] mt-2">모든 카드가 이 두 값을 공유해 통일된 입체감을 낸다.</p>
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section
          id="icons"
          title="아이콘"
          description="lucide-react에서 가져와 쓰는 아이콘 목록. 새 컴포넌트를 만들 때 여기 없는 아이콘이 필요하면 이 목록에도 추가한다."
        >
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {ICON_SET.map(({ icon: Icon, name, usedIn }) => (
              <div
                key={name}
                className="ds-card ds-card-hover p-3 flex flex-col items-center text-center gap-1.5"
                title={usedIn}
              >
                <span className="w-9 h-9 rounded-full flex items-center justify-center bg-[#F5F2FF]">
                  <Icon size={18} strokeWidth={2} color="#8B74D9" />
                </span>
                <span className="font-pretendard text-[11px] text-[#2B2B2B]">{name}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="emotion-colors"
          title="감정 색상 체계"
          description="긍정·부정·중립 각 계열 안에서 감정마다 고유한 색과 표정 이모지를 갖는다. emotion-theme.ts에 정의된 값 그대로다."
        >
          <div className="space-y-8">
            {POLARITY_GROUPS.map((group) => (
              <div key={group.title}>
                <p className="font-pretendard text-[14px] font-semibold text-[#2B2B2B] mb-3">{group.title}</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
                  {group.labels.map((label) => {
                    const theme = EMOTION_THEME[label]
                    return (
                      <div
                        key={label}
                        className="ds-card ds-card-hover p-3 flex flex-col items-center text-center gap-1.5"
                      >
                        <span
                          className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
                          style={{ backgroundColor: `${theme.color}1A` }}
                        >
                          {theme.icon}
                        </span>
                        <span className="font-pretendard text-[12px] text-[#2B2B2B]">{theme.display}</span>
                        <span className="font-pretendard text-[10px] text-[#6D6D6D]">{theme.color}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="components"
          title="컴포넌트 쇼케이스"
          description="아래 카드는 모두 실제 대시보드 컴포넌트에 샘플 데이터를 넣어 그대로 렌더링한 것이다."
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EmotionRingCard label={MOCK.label} confidence={MOCK.confidence} />
              <EmotionSummaryCard
                label={MOCK.label}
                confidence={MOCK.confidence}
                aiOneLiner={MOCK.aiOneLiner}
                keywords={MOCK.keywords}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <EmotionTop3Card emotions={MOCK.emotions} />
              <CauseDonutChart label={MOCK.label} causes={MOCK.causes} />
              <WeeklyTrendChart label={MOCK.label} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DiaryEntry text={MOCK.diaryText} />
              <ActivitiesCard activities={MOCK.activities} />
              <AiMemo message={MOCK.aiMessage} />
              <QuoteCard label={MOCK.label} quote={MOCK.quote} />
            </div>

            <EmotionChart emotions={MOCK.emotions} />

            <EmotionDetailSummary
              mindState={MOCK.mindState}
              causes={MOCK.causes}
              growthPoint={MOCK.growthPoint}
              tomorrowMessage={MOCK.tomorrowMessage}
            />
          </div>
        </Section>
      </div>
    </div>
  )
}
