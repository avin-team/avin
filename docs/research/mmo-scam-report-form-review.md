# Review lại form tố cáo scam theo bối cảnh MMO của Avin

> **Research snapshot, not the implementation contract.** Các vòng grill sau tài liệu này đã chốt lại taxonomy ba flow, lookup theo vai trò, public narrative, evidence bundle trước submit, moderation nguyên packet và các neutral alert cho account bị back/mạo danh. Khi có khác biệt, dùng [`CONTEXT.md`](../../CONTEXT.md), [`docs/specs/avin-check.md`](../specs/avin-check.md) và ADR 0036–0042.

_Ngày review: 2026-08-26. Phạm vi: giao dịch tài khoản game/social, tài khoản bị back/reclaim, hàng hóa và dịch vụ số, GDV/trung gian, chuyển khoản/ví, website/app/profile giả. Đây là thiết kế P0, không phải tư vấn pháp lý._

## Kết luận

Avin không phải hộp thư tiếp nhận khiếu nại đại trà. Đây là hệ thống reputation và tra cứu cảnh báo cho cộng đồng MMO, nên P0 phải dùng mô hình:

> **Tài khoản Avin đã xác thực + hồ sơ bằng chứng bắt buộc + tường trình thật của reporter được công khai sau redaction + dữ kiện Avin xác minh riêng + quyền phản hồi/appeal + lịch sử không bị sửa âm thầm.**

Không làm guest quick report trong P0. Không cho một tố cáo thiếu file tác động đến tra cứu hoặc uy tín. Mỗi incident được duyệt vẫn là một lời chứng riêng của reporter; Avin chỉ nhóm các report liên quan theo định danh, không viết lại chúng thành một “public summary”.

## Vòng review trước đã sai ở đâu

1. **Sai đối tượng so sánh.** Nó lấy form của cơ quan tiếp nhận fraud/phishing đại trà làm chuẩn, trong khi Avin gần EpicNPC, PlayerAuctions, G2G và Eldorado hơn: tranh chấp hàng số, giao dịch ngoài nền tảng và reputation cộng đồng.
2. **Sai khi biến evidence thành optional.** Với public allegation ảnh hưởng trực tiếp đến uy tín người bán/GDV, file phải là điều kiện vào moderation. Các marketplace MMO yêu cầu proof theo loại vụ việc, thậm chí video/full-screen khi ảnh dễ bị chỉnh sửa. ([PlayerAuctions](https://support.playerauctions.com/hc/en-us/articles/115013871007-What-Evidence-Can-I-Provide-for-My-Dispute-as-a-Buyer), [G2G](https://support.g2g.com/support/solutions/articles/5000868822-account-delivery-proof-requirement), [EpicNPC](https://www.epicnpc.com/threads/dispute-rules-terms.90442/))
3. **Sai khi bỏ public narrative.** Redaction không đồng nghĩa với moderator viết lại. Đúng ra phải public lời reporter, gắn rõ nguồn, rồi tách riêng phần Avin đã đối chiếu. EpicNPC dùng public testimony có proof để cảnh báo cộng đồng; G2G không cho support tự ý sửa rating sau thời hạn. ([EpicNPC](https://www.epicnpc.com/threads/dispute-rules-terms.90442/), [G2G ratings](https://support.g2g.com/support/solutions/articles/5000880105-managing-user-ratings))
4. **Sai khi bỏ hẳn category account-back.** “Acc bị back” là một workflow MMO riêng với proof riêng. Cần sửa taxonomy, không hòa nó vào một outcome form chung chung.
5. Lo ngại về PII, vu khống và fabricated evidence là đúng; giải pháp trước đó sai. Giải pháp phù hợp là evidence bundle, redaction có dấu vết, scoped verification, subject response và appeal.

## Chắt lọc CheckScam và ChongScam

### Giữ

- CheckScam đúng khi dành flow riêng cho STK, website và account bị back; account-back không thể dùng form chuyển khoản chung.
- ChongScam đúng khi tách bill chuyển khoản khỏi evidence liên quan và cho nhiều loại định danh.
- Cả hai đúng khi narrative và proof là phần trung tâm, không phải metadata phụ.

### Bỏ

- Tiêu đề do reporter hoặc moderator tự viết; Avin sinh tự động.
- “Tên file bill/bằng chứng”, Zalo người xác thực và GDV free-text ở cột bổ sung.
- Một ô “định danh chính” rồi dồn phone/STK/link vào các ô rời rạc; chúng phải là các identifier có vai trò rõ.
- Checkbox trách nhiệm mang tính đe dọa, số nạn nhân tự khai và mức “khẩn cấp” tự chấm.
- Layout một trang dài hai cột; trên mobile MMO nó thành một chuỗi field khó kiểm tra và dễ mất dữ liệu.

## Taxonomy P0: hỏi “giao dịch gì” và “vấn đề gì” riêng

### Loại giao dịch/vụ việc chính

1. `ACCOUNT_TRADE`: mua/bán tài khoản game, social, page, channel.
2. `DIGITAL_GOODS_SERVICE`: item, currency, top-up, boosting/cày thuê, quảng cáo hoặc dịch vụ số.
3. `PAYMENT_MIDDLEMAN`: chuyển khoản trực tiếp, ví/crypto, chargeback, GDV/trung gian.
4. `IMPERSONATION_WEBSITE_APP`: shop/profile/admin/GDV giả, website/app phishing hoặc malware.
5. `OTHER_MMO`: escape hatch có mô tả bắt buộc; moderator recategorize.

### Hành vi xảy ra

Hiển thị checklist theo loại: không giao hàng; giao thiếu; không đúng mô tả; account bị back/reclaim; recovery chưa bàn giao; account bị ban/lock; dịch vụ không hoàn thành/làm hỏng account; thu tiền rồi chặn; chargeback sau khi nhận hàng; mạo danh seller/GDV/admin; website/app giả; phishing/malware; từ chối warranty/refund đã cam kết; khác.

STK, phone, website hay username là **identifier**, không phải incident type. Một report có một flow chính và nhiều hành vi/identifier liên quan.

## Flow P0 gồm bốn bước

### 1. Giao dịch và vai trò

Required:

- Loại giao dịch/vụ việc chính và hành vi xảy ra.
- Vai trò reporter: người mua, người bán, GDV/trung gian trực tiếp tham gia, đại diện được phép, hoặc người trực tiếp phát hiện website/profile giả.
- Kênh giao dịch: Avin Order, marketplace khác, trực tiếp, qua GDV/trung gian.
- Ngày bắt đầu giao dịch và ngày phát hiện sự cố; cho phép giờ gần đúng.
- Vụ việc còn tiếp diễn hay đã dừng.

Nếu là Avin Order, route trước vào Commerce Dispute hiện có; dữ liệu order/chat/payment được hệ thống liên kết thay vì bắt upload lại. Một dispute được xác minh có thể được promote thành Public Risk Report bằng action riêng.

### 2. Đối tượng, sản phẩm và dòng tiền

Required common:

- Nền tảng/game/service.
- Tên sản phẩm, account hoặc dịch vụ như lúc giao dịch.
- Ít nhất một **Risk Subject Identifier**.
- Ít nhất một transaction row nếu có thanh toán: ngày/giờ, số tiền, tiền tệ, phương thức, nơi nhận, mã giao dịch/hash nếu có.

Identifier là repeatable row gồm `role`, `type`, `namespace`, `value`, optional `displayName`:

- `ACCUSED_COUNTERPARTY`: seller/buyer bị report.
- `PAYMENT_DESTINATION`: STK, ví hoặc crypto address nhận tiền.
- `MIDDLEMAN`: GDV/trung gian thực sự tham gia.
- `CONTACT_CHANNEL`: phone, Zalo, Telegram, Discord, Facebook/profile URL/UID.
- `LISTING_OR_STORE`: post, shop, group hoặc listing URL.
- `REPORTED_ASSET`: account/UID/channel của nạn nhân; **không được coi là định danh scam**.
- `IMPERSONATED_IDENTITY`: Provider/admin/GDV bị giả mạo; **không được coi là định danh scam**.

Chỉ identifier được moderator xác nhận là `RISK_SUBJECT` mới đi vào public lookup. Đây là điểm P0 critical: code hiện nhóm mọi identifier của report vào cảnh báo, có thể gắn cờ nhầm account nạn nhân hoặc GDV bị mạo danh.

Conditional account trade:

- Game/platform, UID/username, server/region.
- Reporter là buyer hay seller; seller có tự nhận original owner không.
- Ngày bàn giao và ngày mất quyền truy cập.
- Warranty/recovery đã cam kết.
- Buyer đã đổi email/password/2FA/recovery hay chưa.
- Có thông báo chính thức của publisher không; lý do ban/reclaim ghi gì.

Conditional service/goods:

- Scope đã hứa, deadline, trạng thái giao thực tế.
- Listing/thỏa thuận gốc và ảnh hưởng lên account nếu boosting/cày thuê.

Conditional impersonation/site:

- Exact URL/domain/package/profile UID, thời điểm còn truy cập được.
- Mạo danh ai, hành vi quan sát được, đã nhập credential hoặc chuyển tiền chưa.

### 3. Tường trình và bằng chứng

- `publicNarrative` required, 50–10.000 ký tự: reporter kể theo chronology “mua gì, thỏa thuận gì, trả tiền/giao hàng thế nào, sự cố xuất hiện ra sao, đã liên hệ giải quyết thế nào”. UI nói rõ nội dung này sẽ được công khai nếu report được duyệt.
- `privateNote` optional cho email, recovery data, thông tin nạn nhân khác hoặc chi tiết Avin cần nhưng không được public.
- File evidence bắt buộc. Mỗi file có kind, mô tả ngắn “tệp này chứng minh gì”, timestamp/upload status, preview, remove/retry; không dùng một kind chung cho cả batch.
- Bản gốc immutable, hash SHA-256, private và quarantined. Allowlist không được ghi `CLEAN`; phải có malware scan thật trước khi moderator mở hoặc tạo derivative.

### 4. Review và submit

- Preview đúng trang public tương lai: title tự sinh, narrative, identifier sẽ hiển thị/mask, claimed/verified loss, evidence nào có thể làm public copy.
- Phân tách rõ “Công khai sau duyệt” và “Chỉ Avin xem”.
- Reporter xác nhận thông tin đúng theo hiểu biết, có quyền cung cấp evidence và đồng ý public narrative/approved derivatives.
- Submit idempotent vào cùng draft; success page có report ID, trạng thái, workspace và deadline review thực tế.

## Evidence bundle bắt buộc theo loại

| Loại | Đủ để submit | Đủ để publish |
| --- | --- | --- |
| Chuyển tiền/thu tiền rồi chặn | Bill/payment proof **và** chat/listing/thỏa thuận | Đối chiếu được recipient với counterparty/offer và chronology khớp |
| Account back/reclaim | Proof mua/bàn giao/quyền kiểm soát **và** proof mất access/recovery/publisher notice | Liên kết được account, seller/upstream nếu biết và nguyên nhân; không gọi seller “reclaimer” khi chỉ chứng minh account bị mất |
| Hàng số/dịch vụ không giao | Listing/thỏa thuận **và** payment/delivery-progress proof | Chứng minh scope/deadline và non-delivery/material mismatch, không chỉ dissatisfaction |
| Chargeback sau giao hàng | Delivery proof **và** payment reversal/chargeback notice | Buyer identity/order/payment phải khớp |
| Fake GDV/impersonation | Profile/UID/chat capture; có loss thì thêm bill | So sánh được identity thật–giả và liên kết solicitation/payment |
| Website/app/profile giả | Screenshot hoặc video **và** exact locator | Moderator live-check hoặc preserved capture xác nhận hành vi |

“Ít nhất một file bất kỳ” là chưa đủ. PlayerAuctions yêu cầu agreement, listing, delivery/status và giải thích từng evidence theo chronology; G2G yêu cầu full-screen identity/time/login evidence và video trong tình huống khó xác minh. ([PlayerAuctions evidence](https://support.playerauctions.com/hc/en-us/articles/115013871007-What-Evidence-Can-I-Provide-for-My-Dispute-as-a-Buyer), [G2G delivery proof](https://support.g2g.com/support/solutions/articles/5000868822-account-delivery-proof-requirement))

Account bị ban/thu hồi không tự động chứng minh seller scam: Steam không công nhận transfer account/subscription ngoài hệ thống và nhiều publisher cấm bán account. Form phải thu publisher notice, warranty, thay đổi recovery và timeline để Avin chỉ kết luận điều evidence thực sự chứng minh. ([Steam Subscriber Agreement](https://store.steampowered.com/subscriber_agreement/))

## Public/private model

| Public sau publication | Luôn private |
| --- | --- |
| Title tự sinh | Reporter name, email, phone, Zalo, account/IP/device risk |
| “Tường trình do người tố cáo cung cấp”, nguyên văn sau redaction có marker | Original narrative và private note |
| Vai trò trong giao dịch, type/issues, platform/product, incident day | Exact private timestamps, victim/recovery credentials |
| Identifier theo policy từng loại; exact-search có banner match | Identifier không phải risk subject và unredacted values |
| Claimed loss và Verified Loss tách nhãn | Payment source của victim và full bill |
| Ít nhất một Public Evidence Copy an toàn; ngoại lệ phải có dual approval | Toàn bộ original evidence và malware-analysis data |
| Block “Dữ kiện Avin đã đối chiếu” theo từng claim | Moderator notes, confidence/risk signals, duplicate graph |
| Subject response, outcome, correction/removal history | Contact/ownership proof của subject |

Moderator chỉ được redact bằng placeholder như `[đã ẩn SĐT]`, không được viết lại narrative. Nếu bỏ đoạn làm thay đổi ý nghĩa, trả `CHANGES_REQUESTED` cho reporter sửa version mới; bản cũ vẫn giữ trong audit.

## Verification, publication và moderation

1. `DRAFT → SUBMITTED_PROCESSING → UNDER_REVIEW → CHANGES_REQUESTED/REJECTED/PUBLICATION_READY`.
2. Evidence phải scan sạch; reviewer xác minh chuỗi `giao dịch/thỏa thuận → đúng counterparty/identifier → delivery/outcome/loss`.
3. Reviewer tạo verification findings có evidence IDs hỗ trợ, ví dụ `PAYMENT_TO_IDENTIFIER_VERIFIED`, `ACCOUNT_ACCESS_LOST_VERIFIED`; không dùng badge mơ hồ “Avin xác nhận scam”.
4. Reviewer redact narrative và tạo Public Evidence Copies; publisher thứ hai duyệt toàn bộ public packet. P0 chấp nhận chi phí two-person approval vì reputation là core.
5. Chỉ sau bước hai người mới `PUBLISHED`. Không public `UNDER_VERIFICATION` dựa trên urgency hay số nạn nhân tự khai.
6. Mỗi published report vẫn hiển thị riêng trên trang identifier. Nhiều incident độc lập được aggregate thành “N báo cáo đã xác minh”; retry/cùng incident không tăng số.

Để giảm workload: form sinh checklist theo type; per-file description và chronology; auto mask/metadata extraction chỉ là trợ lý, không là kết luận; moderator không viết title/summary; change request dùng template theo evidence còn thiếu.

## Quyền phản hồi, correction và anti-abuse

- Subject có flow claim identifier bằng proof, gửi public response và counter-evidence. Response được redact và đặt cùng trang, không giấu sau tab khó thấy.
- Avin-linked subject/Provider được pre-publication notice và response window theo policy; trường hợp ongoing risk muốn publish sớm cần publisher thứ hai override.
- Appeal do moderator khác reviewer ban đầu xử lý khi có thể. Credible counter-evidence chuyển report sang `REVIEW_REOPENED`; không xóa im lặng.
- Refund/replacement/resolution không xóa lịch sử thật; thêm outcome `REFUNDED`, `REPLACED`, `RESOLVED`, `PARTIALLY_RESOLVED`. Eldorado cũng giữ negative feedback phản ánh trải nghiệm dù đã xử lý. ([Eldorado feedback](https://support.eldorado.gg/en/articles/9759638-user-feedback))
- Account/IP/device rate limit, exact-submit idempotency, reused-file hash detection, linked-account/brigading signals và sanction cho fake evidence/extortion.
- Không có public comment, vote hoặc report-count chưa xác minh. EpicNPC yêu cầu proof, cấm người không liên quan chen vào dispute và sanction false information; PlayerAuctions cấm tạo giao dịch giả và feedback extortion. ([EpicNPC](https://www.epicnpc.com/threads/dispute-rules-terms.90442/), [PlayerAuctions rules](https://support.playerauctions.com/hc/en-us/articles/42133959692441-Community-Rules-and-Guidelines))

## Giữ, bỏ và bổ sung so với hiện tại

**Giữ:** authenticated Buyer/Seller; một report = một incident; evidence mandatory; original private + public derivative; title tự sinh; draft/resume/idempotency; no cross-user duplicate warning; bốn bước; public narrative do reporter viết; correction history.

**Bỏ:** `BANK_WALLET_PHONE` làm incident type; `urgency`; required `affectedVictimCount`; Provider-relationship question/code; một identifier duy nhất; moderator `publicSummary`; public `UNDER_VERIFICATION`; manual file name/GDV/Zalo verifier.

**Bổ sung:** MMO taxonomy hai trục; trade role/channel; identifier role và namespace; repeatable transactions; account warranty/recovery/publisher fields; service scope/deadline; per-file description; narrative revision/redaction audit; verification findings; subject response/claim; resolution outcomes; second publisher approval.

## P0 blockers trong code/schema hiện tại

1. [`risk-report.ts`](../../packages/api/src/protection/risk-report.ts) vẫn dùng ba type theo locator và Provider relationship cũ; native identifier chỉ có `type/value`, không có namespace/role.
2. [`risk-report-page.tsx`](../../apps/web/src/features/protection/pages/risk-report-page.tsx) chỉ gửi một identifier, một loss tổng, không có incident dates, transaction rows, MMO contract/account fields hoặc public preview thực.
3. [`risk-lookup.ts`](../../packages/api/src/protection/risk-lookup.ts) group mọi identifier gắn vào report. Khi thêm account nạn nhân hay identity bị mạo danh, hệ thống có thể tạo false risk association.
4. [`risk-report-service.ts`](../../packages/api/src/protection/risk-report-service.ts) ghi `CLEAN` ngay sau allowlist validation và publication yêu cầu moderator-authored `publicSummary`.
5. [`protection.ts`](../../packages/db/src/schema/protection.ts) thiếu identifier role/namespace, transaction, incident time, public narrative version, verification finding, subject response và resolution outcome.
6. Approve correction hiện chỉ đổi trạng thái request; nó chưa atomically cập nhật public report/content/history.

## Acceptance criteria P0

- Không report nào submit nếu thiếu evidence bundle tối thiểu theo type.
- Account-back form chứng minh được acquisition/control/loss và không quy kết nguyên nhân vượt quá evidence.
- Reporter thấy chính xác narrative/evidence nào có thể public trước khi xác nhận.
- Public page giữ lời reporter sau redaction có dấu, tách khỏi dữ kiện Avin đã xác minh và subject response.
- Chỉ risk-subject identifiers đi vào lookup; victim asset và impersonated identity không bị gắn cờ.
- Mỗi public packet qua reviewer và publisher khác nhau; `UNDER_VERIFICATION` không public.
- Fake/reused evidence, brigading, duplicate retry và feedback extortion không làm tăng reputation impact.
- Correction/appeal/resolution luôn tạo lịch sử công khai, không sửa hoặc xóa âm thầm.

## Bottom line

CheckScam giữ được ngôn ngữ MMO nhưng quy trình cũ; ChongScam có UI mới hơn nhưng vẫn chỉ là form tổng hợp field. Lợi thế của Avin phải nằm ở **proof graph**: ai giao dịch với ai, qua kênh nào, định danh nào nhận tiền/giao account, bằng chứng nào chứng minh từng mắt xích, lời người dùng nói gì, Avin xác minh được phần nào và bên bị tố cáo phản hồi ra sao. Đó mới là nền uy tín cao, không phải form ngắn hơn hay narrative do moderator viết lại.
