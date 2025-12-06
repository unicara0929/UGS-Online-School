import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">UGS（Unicara Growth Salon）利用規約</CardTitle>
            <p className="text-center text-slate-600 mt-2">
              施行日: 2025年12月1日
            </p>
          </CardHeader>
          <CardContent className="prose prose-slate max-w-none">
            <div className="space-y-8">
              <p className="text-slate-700 leading-relaxed">
                Unicara株式会社（以下「当社」）は、UGS（Unicara Growth Salon）（以下「本サービス」）の利用規約（以下「本規約」）を定める。本サービス利用者（以下「会員」）は、本規約に同意したものとみなす。
              </p>

              {/* 第1条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第1条（目的）</h2>
                <p className="text-slate-700 leading-relaxed">
                  本サービスは、「お金の知識×稼げる力」を軸に、会員の金融リテラシー向上、副業・起業支援、実践的ビジネススキル習得を目的とした、オンライン・オフライン融合型ビジネスコミュニティである。
                </p>
              </section>

              {/* 第2条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第2条（本サービスの内容）</h2>
                <p className="text-slate-700 leading-relaxed mb-3">
                  当社が提供する本サービスの内容は以下の通り。
                </p>
                <ol className="list-decimal list-inside text-slate-700 ml-4 space-y-2">
                  <li>マネーリテラシー全般に関する教育コンテンツ提供</li>
                  <li>副業・起業に関する実践的指導及びスタートアップ支援（開業・税務相談等含む）</li>
                  <li>営業・マーケティング等の実践的ビジネススキル強化講義</li>
                  <li>FP実務に関する教育及び実践支援</li>
                  <li>オンライン会議ツール等による勉強会、セミナー、個別相談</li>
                  <li>ミーティング、勉強会、交流会等のオフラインイベント開催</li>
                  <li>会員専用コミュニティへの参加及び会員相互の交流機会提供</li>
                  <li>その他、前各号に付随するサービス</li>
                </ol>
              </section>

              {/* 第3条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第3条（入会）</h2>
                <div className="space-y-3">
                  <p className="text-slate-700 leading-relaxed">
                    1. 入会希望者は、本規約に同意の上、当社指定の方法で申込む。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    2. 入会手続き及び費用決済完了時点で利用契約が成立する。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    3. 当社は以下の場合、入会を承認せず、又は契約成立後も契約を解除できる。理由の開示義務を負わない。
                  </p>
                  <ul className="list-disc list-inside text-slate-700 ml-4 space-y-1">
                    <li>申込時に虚偽の届出をした場合</li>
                    <li>過去に本規約違反又は解約・除名処分歴がある場合</li>
                    <li>反社会的勢力に該当する場合</li>
                    <li>その他、当社が不適当と判断した場合</li>
                  </ul>
                  <p className="text-slate-700 leading-relaxed">
                    4. 未成年者は法定代理人の同意を得て申込む。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    5. 会員は契約成立後、当社指定期日までに本人確認書類（運転免許証、マイナンバーカード、パスポート等）を提出する。提出を怠った場合又は本人確認ができない場合、当社は契約を解除できる。
                  </p>
                </div>
              </section>

              {/* 第4条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第4条（費用及び支払方法）</h2>
                <div className="space-y-3">
                  <p className="text-slate-700 leading-relaxed">
                    1. 会員は、当社が別途定める費用を支払う。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    2. 当社は、時期や対象会員に応じて割引料金を適用するキャンペーン、特別プラン、個別価格設定を行うことがある。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    3. 費用の金額、割引条件、適用期間等は、当社が別途発行する申込書、契約書、通知書又はウェブサイトで定める。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    4. 入会金は契約成立時、月額会費は契約成立月から毎月、当社指定の方法で支払う。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    5. 支払方法はクレジットカード決済。当社が特に認めた場合のみ銀行振込等が可能。振込手数料は会員負担。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    6. 月額会費は月途中の契約成立・終了でも日割計算せず、1ヶ月分を支払う。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    7. 支払遅滞時は、支払期日翌日から年14.6%の遅延損害金を支払う。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    8. 会員は当社に届け出た登録事項変更時、速やかに届け出る。届出懈怠により通知不到達の場合、通知は到達したものとみなす。
                  </p>
                </div>
              </section>

              {/* 第5条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第5条（契約期間及び自動更新）</h2>
                <div className="space-y-3">
                  <p className="text-slate-700 leading-relaxed">
                    1. 契約期間は契約成立日から6ヶ月間。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    2. 期間満了10日前までに会員又は当社から解約申出がない限り、1ヶ月間自動更新される。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    3. 自動更新後も会員はいつでも解約できる。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    4. 契約期間中に退会を申し出ても、期間満了日までの費用支払義務を負う。
                  </p>
                </div>
              </section>

              {/* 第6条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第6条（会員資格の停止・喪失及び除名）</h2>
                <div className="space-y-3">
                  <p className="text-slate-700 leading-relaxed">
                    1. 月額会費2ヶ月以上滞納時、当社は事前通知なく利用を停止できる。停止中も支払義務は継続する。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    2. 月額会費3ヶ月以上滞納時、当社は催告なく契約解除し、会員資格を喪失させることができる。会員は期限の利益を喪失し、一切の債務を一括支払する。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    3. 当社は以下の場合、事前通知・催告なく除名し、契約解除できる。
                  </p>
                  <ul className="list-disc list-inside text-slate-700 ml-4 space-y-1">
                    <li>本規約違反</li>
                    <li>本人確認書類の未提出又は虚偽書類提出</li>
                    <li>費用3ヶ月以上滞納</li>
                    <li>登録事項の虚偽判明</li>
                    <li>当社、講師、スタッフ、他会員又は第三者への重大な迷惑行為</li>
                    <li>サービス運営妨害又は信用毀損</li>
                    <li>反社会的勢力該当判明</li>
                    <li>その他、会員として不適当と判断</li>
                  </ul>
                  <p className="text-slate-700 leading-relaxed">
                    4. 除名処分による会員の損害につき当社は責任を負わない。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    5. 除名処分を受けた会員は、利用権を失うが、発生済債務の支払義務を負う。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    6. 除名会員が当社に損害を与えた場合、当社は損害賠償（弁護士費用含む）を請求できる。
                  </p>
                </div>
              </section>

              {/* 第7条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第7条（返金規定）</h2>
                <div className="space-y-3">
                  <p className="text-slate-700 leading-relaxed">
                    1. 入会金及び月額会費は、理由を問わず返金しない。ただしクーリングオフを除く。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    2. 契約期間中の退会申出でも、期間満了日までの費用は返金しない。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    3. 月途中の退会・除名でも当該月分は返金しない。
                  </p>
                </div>
              </section>

              {/* 第8条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第8条（クーリングオフ）</h2>
                <div className="space-y-3">
                  <p className="text-slate-700 leading-relaxed">
                    1. 会員は契約締結・契約書面受領日から8日以内に、書面又は電子メールで通知し、契約解除できる。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    2. クーリングオフの効力は通知発信時に生じる。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    3. 当社が不実告知により誤認させ、又は威迫により困惑させてクーリングオフを妨げた場合、改めて書面受領日から8日間クーリングオフ可能。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    4. クーリングオフ時、当社は損害賠償・違約金を請求できず、既利用分も請求できない。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    5. 原状回復費用は当社負担。受領済代金は速やかに返還し、振込手数料は当社負担。
                  </p>
                </div>
              </section>

              {/* 第9条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第9条（退会）</h2>
                <div className="space-y-3">
                  <p className="text-slate-700 leading-relaxed">
                    1. 会員は当社所定の方法で退会申出できる。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    2. 退会申出は退会希望月の前月末日まで。退会は申出月の翌月末日に効力発生。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    3. 退会時、利用権を失うが、発生済債務の支払義務は継続する。
                  </p>
                </div>
              </section>

              {/* 第10条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第10条（禁止事項）</h2>
                <p className="text-slate-700 leading-relaxed mb-3">
                  会員は以下を行ってはならない。
                </p>
                <ol className="list-decimal list-inside text-slate-700 ml-4 space-y-2">
                  <li>法令・公序良俗違反</li>
                  <li>犯罪関連行為</li>
                  <li>知的財産権、肖像権、プライバシー権、名誉等の侵害</li>
                  <li>教育コンテンツ、ノウハウ等の無断複製・転載・提供</li>
                  <li>ID・パスワードの第三者への譲渡・共有</li>
                  <li>営業秘密、機密情報の無断開示・漏洩</li>
                  <li>誹謗中傷、名誉・信用毀損</li>
                  <li>サーバー・ネットワークの破壊・妨害</li>
                  <li>サービス運営妨害、信用毀損</li>
                  <li>なりすまし</li>
                  <li>反社会的勢力への利益供与</li>
                  <li>宗教活動・勧誘</li>
                  <li>無断営業・宣伝・広告・勧誘（予定範囲内の事業活動除く）</li>
                  <li>出会い目的、性的・わいせつ目的行為</li>
                  <li>暴力的・性的・差別的・反社会的表現の投稿</li>
                  <li>その他当社が不適切と判断する行為</li>
                </ol>
              </section>

              {/* 第11条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第11条（反社会的勢力の排除）</h2>
                <div className="space-y-3">
                  <p className="text-slate-700 leading-relaxed">
                    1. 会員は、現在・将来にわたり反社会的勢力（暴力団、暴力団員、総会屋等）に該当せず、反社会的勢力との関係を持たないことを表明・保証する。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    2. 会員は暴力的要求、不当要求、脅迫的言動、信用毀損・業務妨害等を行わないことを保証する。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    3. 該当判明時、当社は催告なく契約解除できる。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    4. 解除による会員の損害につき当社は責任を負わず、当社に損害発生時は会員が賠償する。
                  </p>
                </div>
              </section>

              {/* 第12条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第12条（知的財産権及び守秘義務）</h2>
                <div className="space-y-3">
                  <p className="text-slate-700 leading-relaxed">
                    1. 本サービスで提供する全コンテンツの知的財産権は当社又はライセンサーに帰属する。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    2. 会員は当社の事前書面承諾なく、私的使用範囲を超えて複製・転載・改変等できない。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    3. 会員は本サービスで知り得た機密情報を秘密保持し、無断開示・漏洩してはならない。この義務は契約終了後5年間存続する。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    4. 違反時、当社は行為中止・是正を求め、損害賠償（弁護士費用含む）を請求できる。
                  </p>
                </div>
              </section>

              {/* 第13条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第13条（損害賠償）</h2>
                <div className="space-y-3">
                  <p className="text-slate-700 leading-relaxed">
                    1. 会員が本規約違反又はサービス利用に関連して当社に損害を与えた場合、損害賠償（弁護士費用含む）責任を負う。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    2. 第10条第4号から第6号の禁止事項違反時、違反1件につき100万円を違約金として支払う。超過損害発生時は超過分も請求できる。
                  </p>
                </div>
              </section>

              {/* 第14条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第14条（免責事項）</h2>
                <div className="space-y-3">
                  <p className="text-slate-700 leading-relaxed">
                    1. 当社は、本サービスの内容・情報の完全性、正確性、有用性等につきいかなる保証もしない。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    2. 本サービスが会員の特定目的に適合すること、期待機能を有すること、適用法令に適合すること、不具合が生じないこと等を保証しない。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    3. 本サービス利用により会員が特定の経済的成果を得られることを保証しない。事業活動、副業、投資等の結果は全て自己責任とし、当社は責任を負わない。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    4. 会員と他会員・第三者間の取引、連絡、紛争等につき当社は責任を負わない。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    5. 当社の債務不履行責任は、故意・重過失によらない場合は免責される。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    6. 損害賠償責任を負う場合も、賠償範囲は通常生じうる損害に限られ、賠償額上限は直近6ヶ月分の月額会費合計額とする。
                  </p>
                </div>
              </section>

              {/* 第15条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第15条（本サービスの変更・中断・終了）</h2>
                <div className="space-y-3">
                  <p className="text-slate-700 leading-relaxed">
                    1. 当社は事前通知なく、サービス内容の変更、中断、終了ができる。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    2. システム点検、障害、不可抗力等の場合、事前通知なくサービスを一時中断できる。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    3. 本条に基づく変更・中断・終了による損害につき当社は責任を負わない。
                  </p>
                </div>
              </section>

              {/* 第16条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第16条（規約の変更）</h2>
                <div className="space-y-3">
                  <p className="text-slate-700 leading-relaxed">
                    1. 当社は以下の場合、本規約を変更できる。
                  </p>
                  <ul className="list-disc list-inside text-slate-700 ml-4 space-y-1">
                    <li>変更が会員の一般利益に適合するとき</li>
                    <li>変更が契約目的に反せず、変更の必要性・相当性に照らし合理的なとき</li>
                  </ul>
                  <p className="text-slate-700 leading-relaxed">
                    2. 変更時、効力発生日の相当期間前に、変更内容・効力発生日をサービス上掲示、メール送信等で周知する。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    3. 変更後の規約は効力発生日から効力を生じる。
                  </p>
                </div>
              </section>

              {/* 第17条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第17条（連絡・通知）</h2>
                <p className="text-slate-700 leading-relaxed">
                  当社から会員への連絡・通知は、サービス上掲示、メール送信等で行う。掲示は掲示時、メールは送信時に到達したものとみなす。
                </p>
              </section>

              {/* 第18条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第18条（権利義務の譲渡禁止）</h2>
                <p className="text-slate-700 leading-relaxed">
                  会員は当社の書面事前承諾なく、契約上の地位・権利・義務を第三者に譲渡・担保設定等できない。
                </p>
              </section>

              {/* 第19条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第19条（準拠法及び合意管轄）</h2>
                <div className="space-y-3">
                  <p className="text-slate-700 leading-relaxed">
                    1. 本規約の準拠法は日本法。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    2. 紛争は名古屋地方裁判所を第一審の専属的合意管轄裁判所とする。
                  </p>
                </div>
              </section>

              {/* 第20条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第20条（存続条項）</h2>
                <p className="text-slate-700 leading-relaxed">
                  契約終了後も、第7条（返金規定）、第6条第5項・第6項（除名処分後の義務）、第12条（知的財産権及び守秘義務）、第13条（損害賠償）、第14条（免責事項）、第19条（準拠法及び合意管轄）及び本条は有効に存続する。
                </p>
              </section>

              {/* 附則 */}
              <section className="bg-slate-50 p-6 rounded-lg">
                <h2 className="text-xl font-semibold text-slate-900 mb-3">附則</h2>
                <p className="text-slate-700 leading-relaxed">
                  本規約は、2025年12月1日から施行する。
                </p>
                <p className="text-slate-700 mt-4 font-semibold">
                  Unicara株式会社
                </p>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
