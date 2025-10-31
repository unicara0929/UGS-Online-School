import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">プライバシーポリシー</CardTitle>
            <p className="text-center text-slate-600 mt-2">
              最終更新日: 2024年10月28日
            </p>
          </CardHeader>
          <CardContent className="prose prose-slate max-w-none">
            <div className="space-y-8">
              {/* はじめに */}
              <section className="bg-blue-50 p-6 rounded-lg">
                <h2 className="text-xl font-semibold text-slate-900 mb-3">はじめに</h2>
                <p className="text-slate-700 leading-relaxed">
                  UGSオンラインスクール（以下「当スクール」といいます。）は、本ウェブサイト上で提供するサービス（以下「本サービス」といいます。）における、ユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」といいます。）を定めます。
                </p>
              </section>

              {/* 第1条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第1条（個人情報）</h2>
                <p className="text-slate-700 leading-relaxed">
                  「個人情報」とは、個人情報保護法にいう「個人情報」を指すものとし、生存する個人に関する情報であって、当該情報に含まれる氏名、生年月日、住所、電話番号、連絡先その他の記述等により特定の個人を識別できる情報及び容貌、指紋、声紋にかかるデータ、及び健康保険証の保険者番号などの当該情報単体から特定の個人を識別できる情報（個人識別情報）を指します。
                </p>
              </section>

              {/* 第2条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第2条（個人情報の収集方法）</h2>
                <p className="text-slate-700 leading-relaxed mb-3">
                  当スクールは、ユーザーが利用登録をする際に氏名、生年月日、住所、電話番号、メールアドレス、銀行口座番号、クレジットカード番号、運転免許証番号などの個人情報をお尋ねすることがあります。また、ユーザーと提携先などとの間でなされたユーザーの個人情報を含む取引記録や決済に関する情報を、当スクールの提携先（情報提供元、広告主、広告配信先などを含みます。以下、「提携先」といいます。）などから収集することがあります。
                </p>
                <p className="text-slate-700 leading-relaxed">
                  当スクールは、以下の方法で個人情報を収集します：
                </p>
                <ul className="list-disc list-inside text-slate-700 ml-4 mt-3 space-y-1">
                  <li>ユーザー登録フォームからの入力</li>
                  <li>決済処理時の情報提供</li>
                  <li>お問い合わせフォームからの送信</li>
                  <li>学習進捗データの自動収集</li>
                  <li>Cookieやアクセスログの収集</li>
                </ul>
              </section>

              {/* 第3条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第3条（個人情報を収集・利用する目的）</h2>
                <p className="text-slate-700 leading-relaxed mb-3">
                  当スクールが個人情報を収集・利用する目的は、以下のとおりです。
                </p>
                <ul className="list-disc list-inside text-slate-700 ml-4 space-y-2">
                  <li>本サービスの提供・運営のため</li>
                  <li>ユーザーからのお問い合わせに回答するため（本人確認を行うことを含む）</li>
                  <li>ユーザーが利用中のサービスの新機能、更新情報、キャンペーン等及び当スクールが提供する他のサービスの案内のメールを送付するため</li>
                  <li>メンテナンス、重要なお知らせなど必要に応じたご連絡のため</li>
                  <li>利用規約に違反したユーザーや、不正・不当な目的でサービスを利用しようとするユーザーの特定をし、ご利用をお断りするため</li>
                  <li>ユーザーにご自身の登録情報の閲覧・変更・削除・ご利用状況の閲覧を行っていただくため</li>
                  <li>有料サービスにおいて、ユーザーに利用料金を請求するため</li>
                  <li>上記の利用目的に付随する目的</li>
                </ul>
              </section>

              {/* 第4条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第4条（利用目的の変更）</h2>
                <p className="text-slate-700 leading-relaxed">
                  当スクールは、利用目的が変更前と関連性を有すると合理的に認められる場合に限り、個人情報の利用目的を変更するものとします。利用目的の変更を行った場合には、変更後の目的について、当スクール所定の方法により、ユーザーに通知し、または本ウェブサイト上に公表するものとします。
                </p>
              </section>

              {/* 第5条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第5条（個人情報の第三者提供）</h2>
                <div className="space-y-3">
                  <p className="text-slate-700 leading-relaxed">
                    1. 当スクールは、次に掲げる場合を除いて、あらかじめユーザーの同意を得ることなく、第三者に個人情報を提供することはありません。ただし、個人情報保護法その他の法令で認められる場合を除きます。
                  </p>
                  <ul className="list-disc list-inside text-slate-700 ml-4 space-y-1">
                    <li>人の生命、身体または財産の保護のために必要がある場合であって、本人の同意を得ることが困難であるとき</li>
                    <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合であって、本人の同意を得ることが困難であるとき</li>
                    <li>国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合であって、本人の同意を得ることにより当該事務の遂行に支障を及ぼすおそれがあるとき</li>
                    <li>予め次の事項を告知あるいは公表し、かつ当スクールが個人情報保護委員会に届出をしたとき</li>
                  </ul>
                  <p className="text-slate-700 leading-relaxed">
                    2. 前項の定めにかかわらず、次に掲げる場合には、当該情報の提供先は第三者に該当しないものとします。
                  </p>
                  <ul className="list-disc list-inside text-slate-700 ml-4 space-y-1">
                    <li>当スクールが利用目的の達成に必要な範囲内において個人情報の取扱いの全部または一部を委託する場合</li>
                    <li>合併その他の事由による事業の承継に伴って個人情報が提供される場合</li>
                    <li>個人情報を特定の者との間で共同して利用する場合であって、その旨並びに共同して利用される個人情報の項目、共同して利用する者の範囲、利用する者の利用目的および当該個人情報の管理について責任を有する者の氏名または名称について、あらかじめ本人に通知し、または本人が容易に知り得る状態に置いた場合</li>
                  </ul>
                </div>
              </section>

              {/* 第6条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第6条（個人情報の開示）</h2>
                <div className="space-y-3">
                  <p className="text-slate-700 leading-relaxed">
                    1. 当スクールは、本人から個人情報の開示を求められたときは、本人に対し、遅滞なくこれを開示します。ただし、開示することにより次のいずれかに該当する場合は、その全部または一部を開示しないこともあり、開示しない決定をした場合には、その旨を遅滞なく通知します。なお、個人情報の開示に際しては、1件あたり1,000円の手数料を申し受けます。
                  </p>
                  <ul className="list-disc list-inside text-slate-700 ml-4 space-y-1">
                    <li>本人または第三者の生命、身体、財産その他の権利利益を害するおそれがある場合</li>
                    <li>当スクールの業務の適正な実施に著しい支障を及ぼすおそれがある場合</li>
                    <li>その他法令に違反することとなる場合</li>
                  </ul>
                  <p className="text-slate-700 leading-relaxed">
                    2. 前項の定めにかかわらず、履歴情報および特性情報などの個人情報以外の情報については、原則として開示いたしません。
                  </p>
                </div>
              </section>

              {/* 第7条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第7条（個人情報の訂正および削除）</h2>
                <div className="space-y-3">
                  <p className="text-slate-700 leading-relaxed">
                    1. ユーザーは、当スクールの保有する自己の個人情報が誤った情報である場合には、当スクールが定める手続により、当スクールに対して個人情報の訂正、追加または削除（以下、「訂正等」といいます。）を請求することができます。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    2. 当スクールは、ユーザーから前項の請求を受けてその請求に理由があると判断した場合には、遅滞なく、当該個人情報の訂正等を行うものとします。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    3. 当スクールは、前項の規定に基づき訂正等を行った場合、または訂正等を行わない旨の決定をしたときは遅滞なく、これをユーザーに通知します。
                  </p>
                </div>
              </section>

              {/* 第8条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第8条（個人情報の利用停止等）</h2>
                <div className="space-y-3">
                  <p className="text-slate-700 leading-relaxed">
                    1. 当スクールは、本人から、個人情報が、利用目的の範囲を超えて取り扱われているという理由、または不正の手段により取得されたものであるという理由により、その利用の停止または消去（以下、「利用停止等」といいます。）を求められた場合には、遅滞なく必要な調査を行います。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    2. 前項の調査結果に基づき、その請求に理由があると判断した場合には、遅滞なく、当該個人情報の利用停止等を行います。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    3. 当スクールは、前項の規定に基づき利用停止等を行った場合、または利用停止等を行わない旨の決定をしたときは、遅滞なく、これをユーザーに通知します。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    4. 前2項にかかわらず、利用停止等に多額の費用を有する場合その他利用停止等を行うことが困難な場合であって、ユーザーの権利利益を保護するために必要なこれに代わるべき措置をとれる場合は、この代替策を講じるものとします。
                  </p>
                </div>
              </section>

              {/* 第9条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第9条（プライバシーポリシーの変更）</h2>
                <div className="space-y-3">
                  <p className="text-slate-700 leading-relaxed">
                    1. 本ポリシーの内容は、法令その他本ポリシーに別段の定めのある事項を除いて、ユーザーに通知することなく、変更することができるものとします。
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    2. 当スクールが別途定める場合を除いて、変更後のプライバシーポリシーは、本ウェブサイトに掲載したときから効力を生じるものとします。
                  </p>
                </div>
              </section>

              {/* 第10条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第10条（Cookieの使用について）</h2>
                <div className="space-y-3">
                  <p className="text-slate-700 leading-relaxed">
                    当スクールは、ユーザーの利便性向上のため、以下のCookieを使用しています：
                  </p>
                  <ul className="list-disc list-inside text-slate-700 ml-4 space-y-1">
                    <li><strong>必須Cookie</strong>: サイトの基本機能に必要なCookie</li>
                    <li><strong>機能Cookie</strong>: ユーザーの設定や選択を記憶するCookie</li>
                    <li><strong>分析Cookie</strong>: サイトの利用状況を分析するCookie</li>
                    <li><strong>広告Cookie</strong>: 関連する広告を表示するCookie</li>
                  </ul>
                  <p className="text-slate-700 leading-relaxed">
                    ユーザーは、ブラウザの設定によりCookieの使用を制限することができますが、一部の機能が利用できなくなる場合があります。
                  </p>
                </div>
              </section>

              {/* 第11条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第11条（セキュリティ対策）</h2>
                <p className="text-slate-700 leading-relaxed">
                  当スクールは、個人情報の保護のため、以下のセキュリティ対策を実施しています：
                </p>
                <ul className="list-disc list-inside text-slate-700 ml-4 mt-3 space-y-1">
                  <li>SSL/TLS暗号化通信の使用</li>
                  <li>アクセス制御と認証システムの実装</li>
                  <li>定期的なセキュリティ監査と脆弱性診断</li>
                  <li>データベースの暗号化とバックアップ</li>
                  <li>従業員への個人情報保護教育の実施</li>
                </ul>
              </section>

              {/* 第12条 */}
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">第12条（未成年者の個人情報）</h2>
                <p className="text-slate-700 leading-relaxed">
                  当スクールは、18歳未満の未成年者の個人情報については、親権者の同意を得た場合にのみ収集・利用いたします。未成年者の個人情報について、親権者からの開示、訂正、削除、利用停止等の請求があった場合には、速やかに対応いたします。
                </p>
              </section>

              {/* お問い合わせ */}
              <section className="bg-slate-50 p-6 rounded-lg">
                <h2 className="text-xl font-semibold text-slate-900 mb-3">お問い合わせ窓口</h2>
                <p className="text-slate-700 leading-relaxed mb-4">
                  本ポリシーに関するお問い合わせは、下記までご連絡ください。
                </p>
                <div className="bg-white p-4 rounded border">
                  <p className="text-slate-700">
                    <strong>UGSオンラインスクール 個人情報保護管理者</strong><br />
                    Email: privacy@ugs-online-school.com<br />
                    受付時間: 平日 9:00-18:00<br />
                    <br />
                    <strong>個人情報保護委員会への苦情申立て先</strong><br />
                    個人情報保護委員会 苦情相談窓口<br />
                    TEL: 03-6457-9849<br />
                    URL: https://www.ppc.go.jp/
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
