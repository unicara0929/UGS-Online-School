import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">利用規約</CardTitle>
            <p className="text-center text-slate-600 mt-2">
              最終更新日: 2024年10月28日
            </p>
          </CardHeader>
          <CardContent className="prose prose-slate max-w-none">
            <div className="space-y-8">
              {/* 第1条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第1条（適用）</h2>
                <p className="text-slate-700 leading-relaxed">
                  本利用規約（以下「本規約」といいます。）は、Unicara Growth Salon（以下「当スクール」といいます。）が提供するオンライン学習サービス（以下「本サービス」といいます。）の利用条件を定めるものです。登録ユーザーの皆さま（以下「ユーザー」といいます。）には、本規約に従って、本サービスをご利用いただきます。
                </p>
              </section>

              {/* 第2条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第2条（利用登録）</h2>
                <div className="space-y-3">
                  <p className="text-slate-700 leading-relaxed">
                    1. 本サービスにおいては、登録希望者が本規約に同意の上、当スクールの定める方法によって利用登録を申請し、当スクールがこれを承認することによって、利用登録が完了するものとします。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    2. 当スクールは、利用登録の申請者に以下の事由があると判断した場合、利用登録の申請を承認しないことがあり、その理由については一切の開示義務を負わないものとします。
                  </p>
                  <ul className="list-disc list-inside text-slate-700 ml-4 space-y-1">
                    <li>利用登録の申請に際して虚偽の事項を届け出た場合</li>
                    <li>本規約に違反したことがある者からの申請である場合</li>
                    <li>その他、当スクールが利用登録を相当でないと判断した場合</li>
                  </ul>
                </div>
              </section>

              {/* 第3条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第3条（ユーザーIDおよびパスワードの管理）</h2>
                <div className="space-y-3">
                  <p className="text-slate-700 leading-relaxed">
                    1. ユーザーは、自己の責任において、本サービスのユーザーIDおよびパスワードを適切に管理するものとします。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    2. ユーザーは、いかなる場合にも、ユーザーIDおよびパスワードを第三者に譲渡または貸与し、もしくは第三者と共用することはできません。当スクールは、ユーザーIDとパスワードの組み合わせが登録情報と一致してログインされた場合には、そのユーザーIDを登録しているユーザー自身による利用とみなします。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    3. ユーザーID及びパスワードが第三者によって使用されたことによって生じた損害は、当スクールに故意又は重大な過失がある場合を除き、当スクールは一切の責任を負わないものとします。
                  </p>
                </div>
              </section>

              {/* 第4条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第4条（利用料金および支払方法）</h2>
                <div className="space-y-3">
                  <p className="text-slate-700 leading-relaxed">
                    1. ユーザーは、本サービスの有料部分の対価として、当スクールが別途定め、本ウェブサイトに表示する利用料金を、当スクールが指定する方法により支払うものとします。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    2. ユーザーが利用料金の支払を遅滞した場合には、ユーザーは年14.6％の割合による遅延損害金を支払うものとします。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    3. 本サービスの利用料金は月額5,500円（税込）とします。初回決済時は2ヶ月分の料金が発生します。
                  </p>
                </div>
              </section>

              {/* 第5条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第5条（禁止事項）</h2>
                <p className="text-slate-700 leading-relaxed mb-3">
                  ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。
                </p>
                <ul className="list-disc list-inside text-slate-700 ml-4 space-y-2">
                  <li>法令または公序良俗に違反する行為</li>
                  <li>犯罪行為に関連する行為</li>
                  <li>本サービスの内容等、本サービスに含まれる著作権、商標権ほか知的財産権を侵害する行為</li>
                  <li>当スクール、ほかのユーザー、またはその他第三者のサーバーまたはネットワークの機能を破壊したり、妨害したりする行為</li>
                  <li>本サービスによって得られた情報を商業的に利用する行為</li>
                  <li>当スクールのサービスの運営を妨害するおそれのある行為</li>
                  <li>不正アクセスをし、またはこれを試みる行為</li>
                  <li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
                  <li>違法、不正または不当な目的を持って本サービスを利用する行為</li>
                  <li>本サービスの他のユーザーまたはその他の第三者に不利益、損害、不快感を与える行為</li>
                  <li>他のユーザーに成りすます行為</li>
                  <li>当スクールが許諾しない本サービス上での宣伝、広告、勧誘、または営業行為</li>
                  <li>面識のない異性との出会いを目的とした行為</li>
                  <li>当スクールのサービスに関連して、反社会的勢力に対して直接または間接に利益を供与する行為</li>
                  <li>その他、当スクールが不適切と判断する行為</li>
                </ul>
              </section>

              {/* 第6条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第6条（本サービスの提供の停止等）</h2>
                <div className="space-y-3">
                  <p className="text-slate-700 leading-relaxed">
                    1. 当スクールは、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。
                  </p>
                  <ul className="list-disc list-inside text-slate-700 ml-4 space-y-1">
                    <li>本サービスにかかるコンピュータシステムの保守点検または更新を行う場合</li>
                    <li>地震、落雷、火災、停電または天災などの不可抗力により、本サービスの提供が困難となった場合</li>
                    <li>コンピュータまたは通信回線等が事故により停止した場合</li>
                    <li>その他、当スクールが本サービスの提供が困難と判断した場合</li>
                  </ul>
                  <p className="text-slate-700 leading-relaxed">
                    2. 当スクールは、本サービスの提供の停止または中断により、ユーザーまたは第三者が被ったいかなる不利益または損害についても、一切の責任を負わないものとします。
                  </p>
                </div>
              </section>

              {/* 第7条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第7条（利用制限および登録抹消）</h2>
                <div className="space-y-3">
                  <p className="text-slate-700 leading-relaxed">
                    1. 当スクールは、ユーザーが以下のいずれかに該当する場合には、事前の通知なく、ユーザーに対して、本サービスの全部もしくは一部の利用を制限し、またはユーザーとしての登録を抹消することができるものとします。
                  </p>
                  <ul className="list-disc list-inside text-slate-700 ml-4 space-y-1">
                    <li>本規約のいずれかの条項に違反した場合</li>
                    <li>登録事項に虚偽の事実があることが判明した場合</li>
                    <li>料金等の支払債務の不履行があった場合</li>
                    <li>当スクールからの連絡に対し、一定期間返答がない場合</li>
                    <li>本サービスについて、最終の利用から一定期間利用がない場合</li>
                    <li>その他、当スクールが本サービスの利用を適当でないと判断した場合</li>
                  </ul>
                  <p className="text-slate-700 leading-relaxed">
                    2. 当スクールは、本条に基づき当スクールが行った行為によりユーザーに生じた損害について、一切の責任を負いません。
                  </p>
                </div>
              </section>

              {/* 第8条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第8条（退会）</h2>
                <p className="text-slate-700 leading-relaxed">
                  ユーザーは、当スクールの定める退会手続により、本サービスから退会できるものとします。
                </p>
              </section>

              {/* 第9条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第9条（保証の否認および免責事項）</h2>
                <div className="space-y-3">
                  <p className="text-slate-700 leading-relaxed">
                    1. 当スクールは、本サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます。）がないことを明示的にも黙示的にも保証しておりません。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    2. 当スクールは、本サービスに起因してユーザーに生じたあらゆる損害について、当スクールの故意又は重過失による場合を除き、一切の責任を負いません。ただし、本サービスに関する当スクールとユーザーとの間の契約（本規約を含みます。）が消費者契約法に定める消費者契約となる場合、この免責規定は適用されません。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    3. 前項ただし書に定める場合であっても、当スクールは、当スクールの過失（重過失を除きます。）による債務不履行または不法行為によりユーザーに生じた損害のうち特別な事情から生じた損害（当スクールまたはユーザーが損害発生につき予見し、または予見し得た場合を含みます。）について一切の責任を負いません。また、当スクールの過失（重過失を除きます。）による債務不履行または不法行為によりユーザーに生じた損害の賠償は、ユーザーから当該損害が発生した月に受領した利用料金の額を上限とします。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    4. 当スクールは、本サービスに関して、ユーザーと他のユーザーまたは第三者との間において生じた取引、連絡または紛争等について一切責任を負いません。
                  </p>
                </div>
              </section>

              {/* 第10条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第10条（サービス内容の変更等）</h2>
                <p className="text-slate-700 leading-relaxed">
                  当スクールは、ユーザーに通知することなく、本サービスの内容を変更しまたは本サービスの提供を中止することができるものとし、これによってユーザーに生じた損害について一切の責任を負いません。
                </p>
              </section>

              {/* 第11条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第11条（利用規約の変更）</h2>
                <p className="text-slate-700 leading-relaxed">
                  当スクールは、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。なお、本規約の変更後、本サービスの利用を開始した場合には、当該ユーザーは変更後の規約に同意したものとみなします。
                </p>
              </section>

              {/* 第12条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第12条（個人情報の取扱い）</h2>
                <p className="text-slate-700 leading-relaxed">
                  当スクールは、本サービスの利用によって取得する個人情報については、当スクール「プライバシーポリシー」に従い適切に取り扱うものとします。
                </p>
              </section>

              {/* 第13条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第13条（通知または連絡）</h2>
                <p className="text-slate-700 leading-relaxed">
                  ユーザーと当スクールとの間の通知または連絡は、当スクールの定める方法によって行うものとします。当スクールは、ユーザーから、当スクールが別途定める方式に従った変更届け出がない限り、現在登録されている連絡先が有効なものとみなして当該連絡先へ通知または連絡を行い、これらは、発信時にユーザーへ到達したものとみなします。
                </p>
              </section>

              {/* 第14条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第14条（権利義務の譲渡の禁止）</h2>
                <p className="text-slate-700 leading-relaxed">
                  ユーザーは、当スクールの書面による事前の承諾なく、利用契約上の地位または本規約に基づく権利もしくは義務を第三者に譲渡し、または担保に供することはできません。
                </p>
              </section>

              {/* 第15条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第15条（準拠法・裁判管轄）</h2>
                <div className="space-y-3">
                  <p className="text-slate-700 leading-relaxed">
                    1. 本規約の解釈にあたっては、日本法を準拠法とします。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    2. 本サービスに関して紛争が生じた場合には、当スクールの本店所在地を管轄する裁判所を専属的合意管轄とします。
                  </p>
                </div>
              </section>

              {/* お問い合わせ */}
              <section className="bg-slate-50 p-6 rounded-lg">
                <h2 className="text-xl font-semibold text-slate-900 mb-3">お問い合わせ</h2>
                <p className="text-slate-700 leading-relaxed">
                  本規約に関するお問い合わせは、下記の連絡先までお願いいたします。
                </p>
                <div className="mt-4">
                  <p className="text-slate-700">
                    <strong>Unicara Growth Salon</strong><br />
                    Email: support@ugs-online-school.com<br />
                    受付時間: 平日 9:00-18:00
                  </p>
                </div>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
