export type EmotionEffect = 'rain' | 'fog' | 'fire' | 'sunny' | 'forest' | 'sunset' | 'star'

export type EmotionTheme = {
  display: string
  icon: string
  color: string
  effect: EmotionEffect
}

// 긍정 계열은 황토~골드, 부정 계열은 슬레이트~인디고, 중립 계열은 세이지~그레이 색상 범위 안에서
// 감정마다 고유한 색조를 가진다. 아이콘은 감정을 직접 드러내는 표정 이모지를 사용하고,
// effect는 최근 7일 감정 변화 그래프에서 감정의 대략적인 기분 점수를 매기는 데 쓰인다.
export const EMOTION_THEME: Record<string, EmotionTheme> = {
  // ── 모델 기본 3 라벨 ──
  긍정:   { display: '긍정',   icon: '😊', color: '#E39A3D', effect: 'sunny' },
  중립:   { display: '평온',   icon: '😐', color: '#7FA06B', effect: 'forest' },
  부정:   { display: '부정',   icon: '😞', color: '#4A6FA5', effect: 'rain' },

  // ── 긍정 계열: 감정마다 뚜렷한 크레용 색을 하나씩 배정해 서로 섞이지 않게 한다 ──
  행복:   { display: '행복',   icon: '😄', color: '#F0A83A', effect: 'sunny' },  // 해바라기 골드
  사랑:   { display: '사랑',   icon: '🥰', color: '#E85A6B', effect: 'sunny' },  // 와일드 스트로베리
  설렘:   { display: '설렘',   icon: '🤩', color: '#F28A5B', effect: 'sunny' },  // 코랄 망고
  감사:   { display: '감사',   icon: '🙏', color: '#DB9640', effect: 'sunset' }, // 허니 앰버
  안도:   { display: '안도',   icon: '😌', color: '#7FA05C', effect: 'forest' }, // 모스 그린
  자부심: { display: '자부심', icon: '🫡', color: '#C4702E', effect: 'sunny' },  // 테라코타
  경외감: { display: '경외감', icon: '🤯', color: '#CB8F3E', effect: 'sunset' }, // 브론즈 골드
  평화로움: { display: '평화로움', icon: '🙂', color: '#5FA88A', effect: 'forest' }, // 제이드 그린
  흥분:   { display: '흥분',   icon: '😆', color: '#F5972E', effect: 'sunny' },  // 비비드 탠저린
  만족:   { display: '만족',   icon: '😋', color: '#B8923A', effect: 'forest' }, // 머스터드 올리브
  안심:   { display: '안심',   icon: '😮‍💨', color: '#7FBCA6', effect: 'forest' }, // 민트 시폼
  편안함: { display: '편안함', icon: '🫠', color: '#C99A5E', effect: 'forest' }, // 캐러멜 탠
  기대:   { display: '기대',   icon: '🤗', color: '#F0C23E', effect: 'sunny' },  // 브라이트 옐로
  감동:   { display: '감동',   icon: '🥹', color: '#D68A5A', effect: 'sunset' }, // 코랄 테라코타

  // ── 부정 계열: 차가운 톤 안에서도 파랑/보라/초록/회색이 겹치지 않게 구분한다 ──
  슬픔:   { display: '슬픔',   icon: '😢', color: '#3D5FA8', effect: 'rain' },   // 데님 블루
  분노:   { display: '분노',   icon: '😡', color: '#D93A2B', effect: 'fire' },   // 브릭 레드
  불안:   { display: '불안',   icon: '😰', color: '#5E82AC', effect: 'fog' },    // 스틸 블루
  혐오:   { display: '혐오',   icon: '🤢', color: '#7A8C4A', effect: 'fog' },    // 시크 옐로그린
  죄책감: { display: '죄책감', icon: '😓', color: '#5A5A99', effect: 'rain' },   // 블루 바이올렛
  수치심: { display: '수치심', icon: '😳', color: '#8A5A82', effect: 'fog' },    // 플럼
  질투:   { display: '질투',   icon: '😒', color: '#4F8F5A', effect: 'fire' },   // 재스퍼 그린
  외로움: { display: '외로움', icon: '🥺', color: '#34456E', effect: 'rain' },   // 딥 네이비
  무기력: { display: '무기력', icon: '😩', color: '#74747A', effect: 'rain' },   // 슬레이트 그레이
  후회:   { display: '후회',   icon: '😔', color: '#6B4E68', effect: 'rain' },   // 머드 모브

  // ── 중립 계열: 안개·별빛 톤을 서로 다른 색조로 나눈다 ──
  놀람:   { display: '놀람',   icon: '😲', color: '#6E85D6', effect: 'star' },   // 페리윙클
  지루함: { display: '지루함', icon: '🥱', color: '#9C9678', effect: 'fog' },    // 올리브 그레이
  피곤함: { display: '피곤함', icon: '😴', color: '#82829C', effect: 'fog' },    // 더스티 라벤더
  혼란:   { display: '혼란',   icon: '😵‍💫', color: '#9678A0', effect: 'fog' }, // 더스티 바이올렛
  당황:   { display: '당황',   icon: '😅', color: '#A0B073', effect: 'fog' },    // 옐로그린
  긴장:   { display: '긴장',   icon: '😬', color: '#5E7C9C', effect: 'fog' },    // 블루 그레이
}

const DEFAULT_THEME: Omit<EmotionTheme, 'display'> = {
  icon: '🍃',
  color: '#7C8B6F',
  effect: 'forest',
}

export function getEmotionTheme(label: string): EmotionTheme {
  return EMOTION_THEME[label] ?? { ...DEFAULT_THEME, display: label }
}

// 세분화된 감정 분류에 사용하는 전체 라벨 집합 (모델 기본 3 라벨 제외)
export const DETAILED_EMOTION_LABELS = Object.keys(EMOTION_THEME).filter(
  (label) => label !== '긍정' && label !== '중립' && label !== '부정',
)
