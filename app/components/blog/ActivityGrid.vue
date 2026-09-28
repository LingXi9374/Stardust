<script setup lang="ts">
/**
 * 仿 GitHub 贡献图的文章活跃格子。
 *
 * 与 GitHub 的差异：列是「周」、行是「周日到周六」，横向读是时间推进，
 * 和左边的月历方向一致。
 *
 * 格子用 `1fr` 列宽 + `aspect-square` 铺满容器，而不是固定像素——
 * 固定 11px 时右边会剩一大片空白，容器越宽越明显。
 */
const props = withDefaults(
  defineProps<{
    /** 文章日期计数，键为 YYYY-MM-DD */
    counts: Map<string, number>
    /** 往回看多少周 */
    weeks?: number
  }>(),
  { weeks: 53 },
)

const DAY = 86_400_000

function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`)
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10)
}

interface Cell {
  iso: string
  count: number
  /** 落在统计区间内；区间外的补位格子不渲染 */
  valid: boolean
}

interface Week {
  cells: Cell[]
  /** 这一周里若有某个月的 1 号，就在上方标出月份 */
  monthLabel: string
}

const todayIso = useState('site-today', () => new Date().toISOString().slice(0, 10))

/** 五档配色。0 档是空格子，压得很淡——它占绝大多数，太显眼整片格子会糊成一块 */
const LEVEL_CLASS = [
  'bg-line/45',
  'bg-accent/35',
  'bg-accent/60',
  'bg-accent/85',
  'bg-accent',
] as const

function levelOf(count: number): number {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  if (count <= 4) return 3
  return 4
}

const grid = computed<Week[]>(() => {
  const today = toDate(todayIso.value)
  // 周日为一周之首，与下面的行标签一致
  const end = new Date(today.getTime() - today.getUTCDay() * DAY)
  const start = new Date(end.getTime() - (props.weeks - 1) * 7 * DAY)

  const weeks: Week[] = []

  for (let w = 0; w < props.weeks; w += 1) {
    const cells: Cell[] = []
    let monthLabel = ''

    for (let d = 0; d < 7; d += 1) {
      const date = new Date(start.getTime() + (w * 7 + d) * DAY)
      const iso = toIso(date)
      const valid = date.getTime() <= today.getTime()

      cells.push({ iso, count: valid ? (props.counts.get(iso) ?? 0) : 0, valid })

      // 每月 1 号所在的那一列标一次月份
      if (valid && date.getUTCDate() === 1) {
        monthLabel = `${date.getUTCMonth() + 1}月`
      }
    }

    // 第一列特殊处理：区间不是从 1 号开始的，用起始月补一个标签
    if (w === 0 && !monthLabel) {
      monthLabel = `${start.getUTCMonth() + 1}月`
    }

    weeks.push({ cells, monthLabel })
  }

  return weeks
})

/** 展平成「列优先」的顺序，对应下面的 grid-auto-flow: column */
const flatCells = computed(() => grid.value.flatMap((week) => week.cells))

const total = computed(() => {
  let sum = 0
  for (const cell of flatCells.value) sum += cell.count
  return sum
})

function titleOf(cell: Cell): string {
  return cell.count > 0 ? `${cell.iso}：${cell.count} 篇` : `${cell.iso}：无`
}

/** 行标签：只在周一、三、五标注，和 GitHub 一样避免拥挤 */
const ROW_LABELS = ['日', '一', '二', '三', '四', '五', '六'] as const
const SHOWN_LABELS = new Set([1, 3, 5])

/**
 * 列模板与行模板。
 * 行用 `auto` 而不是 `1fr`：高度交给格子的 aspect-square 决定，
 * 否则格子会被拉成竖条。
 */
const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${props.weeks}, minmax(0, 1fr))`,
  gridTemplateRows: 'repeat(7, auto)',
  gridAutoFlow: 'column' as const,
}))
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="flex items-baseline justify-between gap-4">
      <h3 class="text-sm font-medium text-ink-strong">文章活跃</h3>
      <p class="text-xs text-ink-soft">近 {{ weeks }} 周共 {{ total }} 篇</p>
    </div>

    <!-- 窄屏给一个下限，避免 53 列被压成看不见的细线 -->
    <div class="mt-4 flex-1 overflow-x-auto">
      <div class="min-w-[38rem]">
        <!-- 月份行。左边留出行标签的宽度，两边的列才对得齐。
             每个标签跨 4 列：单列只有 20 多像素，「10月」放不下会被截断；
             月份之间相隔约 4.3 周，跨 4 列不会互相压到。 -->
        <div class="flex gap-2">
          <span class="w-4 shrink-0" />
          <div class="grid flex-1 gap-[3px]" :style="gridStyle">
            <span
              v-for="(week, index) in grid"
              :key="`m-${index}`"
              class="whitespace-nowrap text-[0.625rem] leading-4 text-ink-soft"
              :style="{ gridColumn: `${index + 1} / span 4`, gridRow: 1 }"
            >
              {{ week.monthLabel }}
            </span>
          </div>
        </div>

        <div class="mt-1 flex gap-2">
          <!-- 行标签：7 行等分，与右边的格子一一对应 -->
          <div class="flex w-4 shrink-0 flex-col justify-around">
            <span
              v-for="(label, index) in ROW_LABELS"
              :key="label"
              class="text-[0.625rem] leading-none text-ink-soft"
            >
              {{ SHOWN_LABELS.has(index) ? label : '' }}
            </span>
          </div>

          <div class="grid flex-1 gap-[3px]" :style="gridStyle">
            <span
              v-for="cell in flatCells"
              :key="cell.iso"
              class="aspect-square rounded-[3px]"
              :class="cell.valid ? LEVEL_CLASS[levelOf(cell.count)] : 'bg-transparent'"
              :title="cell.valid ? titleOf(cell) : undefined"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 图例放在格子下方，而不是右上角——顶部的横向空间要留给月份标签 -->
    <div class="mt-4 flex items-center justify-between gap-4 text-[0.625rem] text-ink-soft">
      <span>
        <span v-if="total > 0">有文章的日期按篇数着色</span>
        <span v-else>这段时间还没有发布文章</span>
      </span>

      <span class="flex shrink-0 items-center gap-1.5">
        <span>少</span>
        <span
          v-for="(cls, index) in LEVEL_CLASS"
          :key="index"
          class="size-3 rounded-[3px]"
          :class="cls"
        />
        <span>多</span>
      </span>
    </div>
  </div>
</template>
