import {
  Coffee, Moon, Footprints, Wind, Music, BookOpen, Phone, PenLine,
  Droplet, Dumbbell, Sun, Cloud, Sparkles, type LucideIcon,
} from 'lucide-react'

type Activity = { icon: string; label: string }

type Props = {
  activities: Activity[]
}

const KEYWORD_ICON: [RegExp, LucideIcon][] = [
  [/차|티|커피/, Coffee],
  [/잠|수면|일찍|눈\s?감/, Moon],
  [/산책|걷기|걸으/, Footprints],
  [/스트레칭|요가|호흡/, Wind],
  [/음악|노래/, Music],
  [/독서|책/, BookOpen],
  [/통화|전화|연락/, Phone],
  [/기록|메모|일기|글/, PenLine],
  [/샤워|목욕|씻/, Droplet],
  [/운동/, Dumbbell],
  [/햇살|햇볕|산책로/, Sun],
  [/하늘|바람/, Cloud],
]

function pickIcon(label: string): LucideIcon {
  const found = KEYWORD_ICON.find(([re]) => re.test(label))
  return found ? found[1] : Sparkles
}

const PASTEL_BG = ['#F5F2FF', '#FFF3E0', '#E8F5EC', '#E9F2FC']
const PASTEL_ICON = ['#8B74D9', '#E0A458', '#5FAE73', '#5B93C7']

export default function ActivitiesCard({ activities }: Props) {
  return (
    <div className="ds-card ds-card-hover p-6 lg:p-8">
      <p className="font-pretendard text-[18px] font-semibold text-[#2B2B2B] mb-5">AI 추천 활동</p>
      <div className="grid grid-cols-4 gap-3">
        {activities.map((a, i) => {
          const Icon = pickIcon(a.label)
          return (
            <div
              key={a.label}
              className="flex flex-col items-center gap-2 min-w-0 transition-transform duration-300 ease-out hover:-translate-y-1"
            >
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: PASTEL_BG[i % PASTEL_BG.length] }}
              >
                <Icon size={20} strokeWidth={2} color={PASTEL_ICON[i % PASTEL_ICON.length]} />
              </div>
              <span className="font-pretendard text-[12px] text-[#2B2B2B] text-center leading-tight break-keep">
                {a.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
