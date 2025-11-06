'use client'

interface Step {
  number: string
  title: string
  description: string
}

const steps: Step[] = [
  {
    number: "01",
    title: "会員登録",
    description: "UGSオンラインスクールに登録し、初回ガイダンスを視聴"
  },
  {
    number: "02", 
    title: "基礎学習",
    description: "基礎編の教育コンテンツでマネーリテラシーを習得"
  },
  {
    number: "03",
    title: "FPエイド昇格",
    description: "条件達成後、FPエイドに昇格して実践編の教育コンテンツにアクセス"
  },
  {
    number: "04",
    title: "実践・収益化",
    description: "実践編でスキルを磨き、報酬システムで収益を獲得"
  },
  {
    number: "05",
    title: "マネージャー昇格",
    description: "実績を積み、マネージャーとしてチームを育成"
  }
]

export function GrowthFlowSection() {
  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            成長フロー
          </h2>
          <p className="text-xl text-slate-600">
            明確なステップで、UGS会員からマネージャーまで
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="text-center">
              <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-lg">{step.number}</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {step.title}
              </h3>
              <p className="text-slate-600 text-sm">
                {step.description}
              </p>
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-slate-300 transform translate-x-4"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
