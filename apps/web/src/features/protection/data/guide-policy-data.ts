export interface PolicySubItem {
  description?: string;
  id: string;
  points?: string[];
  title: string;
}

export interface PolicyClauseItem {
  category: "box" | "security" | "finance" | "workflow" | "legal";
  date: string;
  description: string;
  id: string;
  keyPoints: string[];
  number: number;
  tags: string[];
  title: string;
}

export interface PolicySection {
  badge: string;
  clauses?: PolicyClauseItem[];
  description: string;
  id: string;
  items?: PolicySubItem[];
  shortTitle: string;
  summaryCard?: {
    content: string;
    title: string;
    type: "info" | "warning" | "danger" | "success";
  };
  title: string;
}

export const GUIDE_POLICY_DATA: PolicySection[] = [
  {
    badge: "Pháp lý & Nền tảng",
    description:
      "Quy định chung về phạm vi, bản chất dịch vụ, vai trò và giới hạn trách nhiệm của Avin Check đối với người dùng truy cập và tra cứu thông tin.",
    id: "terms-of-service",
    items: [
      {
        id: "terms-intro",
        points: [
          "Avin Check là nền tảng cho phép người dùng đăng tải, tra cứu và chia sẻ thông tin liên quan đến các cá nhân, tổ chức, tài khoản và giao dịch trên môi trường số nhằm nâng cao an toàn giao dịch trực tuyến.",
          "Mọi cá nhân, tổ chức khi truy cập, sử dụng tính năng tra cứu hoặc gửi dữ liệu lên Avin Check đều mặc nhiên đồng ý và tuân thủ toàn bộ các điều khoản này.",
        ],
        title: "1. Giới thiệu",
      },
      {
        description:
          "Avin Check là nền tảng công nghệ cung cấp thông tin và dữ liệu tham khảo dựa trên bằng chứng do cộng đồng và đối tác đóng góp.",
        id: "terms-nature",
        points: [
          "KHÔNG PHẢI cơ quan pháp luật hoặc cơ quan điều tra nhà nước.",
          "KHÔNG PHẢI tổ chức xác minh danh tính pháp lý độc lập tuyệt đối.",
          "KHÔNG PHẢI đơn vị bảo hiểm tài chính hoặc công ty bảo lãnh bồi thường tự động.",
          "KHÔNG PHẢI bên trung gian thanh toán, ví điện tử hay bên trực tiếp thu hộ/giữ tiền trong các giao dịch ngoài nền tảng.",
        ],
        title: "2. Bản chất dịch vụ",
      },
      {
        id: "terms-role",
        points: [
          "Không tham gia vào quan hệ giao dịch thương mại giữa các bên mua và bán bên ngoài.",
          "Không chịu trách nhiệm xác thực độc lập toàn bộ các thông tin do người dùng tự nguyện đăng tải.",
          "Không đại diện, bảo hộ hay ủy quyền cho bất kỳ cá nhân hoặc tổ chức nào khi họ thực hiện giao dịch riêng.",
        ],
        title: "3. Vai trò của nền tảng",
      },
      {
        id: "terms-user-obligations",
        points: [
          "Cung cấp thông tin trung thực, khách quan và có bằng chứng xác thực (ảnh chụp màn hình, video giao dịch, sao kê ngân hàng hợp lệ).",
          "Nghiêm cấm đăng tải nội dung vu khống, bịa đặt, bôi nhọ danh dự, cạnh tranh không lành mạnh hoặc thông tin sai sự thật.",
          "Không xâm phạm bí mật đời tư cá nhân, không chia sẻ các dữ liệu nhạy cảm trái quy định pháp luật.",
          "Tự chịu trách nhiệm với mọi quyết định tài chính và kiểm tra đối chiếu kỹ lưỡng trước khi chuyển tiền.",
        ],
        title: "4. Nghĩa vụ người dùng",
      },
      {
        id: "terms-platform-rights",
        points: [
          "Toàn quyền kiểm duyệt, chỉnh sửa hoặc gỡ bỏ các nội dung vi phạm tiêu chuẩn cộng đồng hoặc có dấu hiệu vu khống mà không cần báo trước.",
          "Tạm khóa hoặc vô hiệu hóa quyền truy cập, gửi báo cáo của các tài khoản có hành vi gian lận hoặc spam.",
          "Từ chối cung cấp dịch vụ tra cứu hoặc hỗ trợ đối với các trường hợp vi phạm quy chế.",
        ],
        title: "5. Quyền của nền tảng",
      },
      {
        id: "terms-liability-limitation",
        points: [
          "Avin Check không chịu trách nhiệm đối với bất kỳ thiệt hại tài chính, mất mát dữ liệu hoặc rủi ro phát sinh từ các thỏa thuận riêng ngoài nền tảng.",
          "Không chịu trách nhiệm đối với quyết định giao dịch của người dùng khi chưa kiểm tra đối chiếu kỹ thông tin xác minh chính thức.",
          "Không chịu trách nhiệm về nội dung, hình ảnh, tài liệu do bên thứ ba cung cấp hoặc đăng tải lên hệ thống.",
        ],
        title: "6. Giới hạn trách nhiệm",
      },
    ],
    shortTitle: "Điều khoản sử dụng",
    summaryCard: {
      content:
        "Avin Check là nền tảng số cung cấp dữ liệu tra cứu và cảnh báo rủi ro cộng đồng. Avin Check không phải là cơ quan điều tra, đơn vị bảo hiểm tài chính hay bên trung gian nhận tiền cho các giao dịch bên ngoài.",
      title: "Bản chất dịch vụ thông tin độc lập",
      type: "info",
    },
    title: "1. Điều Khoản Sử Dụng Nền Tảng",
  },
  {
    badge: "Quy tắc an toàn",
    description:
      "Quy chuẩn bắt buộc khi giao dịch qua Đối tác xác minh, cơ chế giải quyết tranh chấp, hạn mức bồi thường bảo lãnh và cẩm nang nhận diện các thủ đoạn lừa đảo tinh vi.",
    id: "transaction-rules",
    items: [
      {
        id: "rules-mandatory",
        points: [
          "Nghiêm cấm mọi giao dịch vi phạm pháp luật (rửa tiền, tài khoản đánh bạc, lừa đảo chiếm đoạt tài sản).",
          "Kênh hỗ trợ chính thức: Hệ thống chỉ tiếp nhận xử lý khi giao dịch diễn ra trên Facebook, Zalo chính chủ được niêm yết trên hồ sơ xác minh.",
          "Quy định quay Video màn hình Zalo/FB: Để tránh giao dịch với đối tượng giả mạo (Fake) rồi ăn vạ, người dùng bắt buộc phải quay Video màn hình kiểm tra số điện thoại, tin nhắn và thông tin đối tác trước khi chuyển tiền.",
          "Không tự ý chuyển tiền khi Đối tác chưa xác nhận nhận box và chưa xác nhận nhận tiền.",
          "Chỉ chuyển khoản vào đúng số tài khoản và thông tin có trong link hồ sơ xác minh, ghi đúng cú pháp nội dung yêu cầu.",
          "Nếu bị kích khỏi nhóm trong quá trình giao dịch, lập tức liên hệ ngay với Đối tác qua Zalo/FB chính thức gắn trên hồ sơ xác minh.",
          "Danh mục từ chối xử lý: Không xử lý các website gạch thẻ cào, tăng like/sub ảo, vay nợ lãi, giao dịch bắc cầu, giao dịch viên tự cọc.",
          "Quy chuẩn bảo vệ Box chat: Nghiêm cấm thêm người thứ 4, tự ý out box, kích thành viên, đổi tên nhóm, sửa tin nhắn, tạo nhiều box trùng lặp.",
          "Thẩm quyền phân xử: Khi phát sinh tranh chấp giữa Người mua & Người bán, Ban quản lý Avin Check là đơn vị phân xử và có 100% quyền quyết định cuối cùng.",
        ],
        title: "Quy tắc giao dịch bắt buộc",
      },
      {
        description:
          "Trường hợp phát sinh giao dịch có dấu hiệu vi phạm từ Đối tác, hạn mức bảo lãnh ghi nhận trên hồ sơ uy tín sẽ được phân bổ theo quy định sau:",
        id: "rules-compensation-policy",
        points: [
          "Mức hỗ trợ xem xét tối đa lên đến 100% giá trị thiệt hại thực tế của giao dịch, với điều kiện không vượt quá hạn mức bảo đảm công bố trên hồ sơ uy tín của Đối tác đó.",
          "Trường hợp có nhiều người cùng bị thiệt hại liên quan đến 1 Đối tác: Hệ thống tổng hợp toàn bộ hồ sơ hợp lệ và phân bổ theo tỷ lệ tương ứng với giá trị thiệt hại thực tế của từng người.",
          "Ví dụ cụ thể: Hạn mức bảo đảm của Đối tác là 10.000.000đ. Trường hợp tổng thiệt hại vượt quá hạn mức (ví dụ A bị 5tr, B bị 10tr, C bị 5tr, tổng thiệt hại 20tr), số tiền phân bổ là: A = (10 : 20) x 5tr = 2.500.000đ; B = (10 : 20) x 10tr = 5.000.000đ; C = (10 : 20) x 5tr = 2.500.000đ. Nếu tổng thiệt hại nhỏ hơn hoặc bằng 10tr, các nạn nhân được bồi thường đủ 100% thiệt hại thực tế.",
          "Trường hợp tổng thiệt hại vượt quá hạn mức: Hệ thống sẽ phân bổ toàn bộ hạn mức bảo đảm theo tỷ lệ % thiệt hại hợp lệ cho các bên.",
        ],
        title:
          "Chính sách xem xét hỗ trợ bồi thường khi phát sinh rủi ro Đối tác",
      },
      {
        description:
          "Hệ thống phân bổ giải quyết từ trên xuống dưới theo thứ tự ưu tiên:",
        id: "rules-priority-order",
        points: [
          "Nhóm 1: Các giao dịch mua bán bị vi phạm bởi chính các dịch vụ có đăng ký công khai trên link hồ sơ uy tín của Đối tác.",
          "Nhóm 2: Tiền bị giữ (hold), thất thoát trên các website do chính Đối tác đó quản lý.",
          "Nhóm 3: Các giao dịch viên cọc tiền bảo hiểm dưới quyền Đối tác đó.",
          "Nhóm 4: Các trường hợp phát sinh tranh chấp khác ngoài phạm vi niêm yết.",
          "Quy tắc phân bổ: Sau khi hoàn tất hỗ trợ đầy đủ cho Nhóm 1, nếu hạn mức vẫn còn dư mới chuyển tiếp sang Nhóm 2, rồi lần lượt sang Nhóm 3 và Nhóm 4.",
        ],
        title: "Thứ tự ưu tiên xử lý bồi hoàn hồ sơ uy tín",
      },
      {
        id: "rules-scam-tactics",
        points: [
          "Giả mạo tên miền (Typosquatting): Kẻ gian đăng ký tên miền gần giống tên miền chính thức (Ví dụ: thêm bớt ký tự 's', 'c', 'r', thay dấu chấm bằng dấu gạch ngang '-', đổi vị trí ký tự).",
          "Ký tự đánh lừa thị giác: Dấu chấm (.) vs gạch (-), chữ I hoa vs l thường, số 0 vs chữ O, số 8 vs chữ B, chữ rn vs chữ m.",
          "Tích xanh Facebook ảo: Tích xanh hiện có thể mua với giá rẻ trên mạng, không đồng nghĩa với việc tài khoản đó uy tín hoặc là chính chủ.",
          "Báo sai nội dung để ép nạp thêm: Tuyệt đối không nạp thêm tiền khi đối tượng báo sai cú pháp hoặc yêu cầu đóng phí mở khóa. Đây 100% là kịch bản lừa đảo liên hoàn.",
          "Server Discord Fake & Bot Fake: Kẻ lừa đảo tạo server ít thành viên, bot clone để gửi thông báo biến động giả mạo.",
          "Chiêu trò tráo Tag trong nhóm: Gửi link Facebook chính chủ nhưng khi add nhóm lại tag tài khoản giả mạo, hoặc sau đó kích tài khoản thật ra rồi spam tin nhắn làm trôi.",
          "Nhận tiền bằng mã QR lạ hoặc STK dạng chữ + số: Cảnh giác với STK có tiền tố ảo như '99zp...', '99MM...' dùng để ẩn danh tài khoản thụ hưởng thực tế.",
          "Lừa Live màn hình / Trộm mã OTP: Kẻ gian yêu cầu chia sẻ màn hình để đọc mã OTP hoặc gửi link độc chiếm quyền điều khiển Facebook/Zalo rồi vào nhóm tự xưng hoàn tất.",
          "Tráo STK bằng cách sửa tin nhắn: Kẻ gian copy tin nhắn STK của Admin trung gian, sửa lại 1-2 số tài khoản rồi spam tin nhắn và gửi lại để người mua chuyển nhầm.",
          "Lợi dụng Bill chuyển khoản nhặt được: Nhặt bill gửi lên nhóm chat riêng để giả vờ báo hoàn tất nhằm gài bẫy người trung gian.",
        ],
        title: "Nhận diện các chiêu trò Lừa đảo (Scam) tinh vi cần cảnh giác",
      },
      {
        id: "rules-scam-response-steps",
        points: [
          "Bước 1 - Khóa chiều chuyển tiền tại Ngân hàng: Gọi ngay Hotline tổng đài ngân hàng của bạn, thông báo vừa bị lừa chuyển tiền vào STK đối tượng, cung cấp bằng chứng để yêu cầu hỗ trợ phong tỏa hoặc đánh dấu tài khoản gian lận.",
          "Bước 2 - Gửi đơn kiến nghị lên Cổng VNeID: Chụp lại toàn bộ lịch sử trò chuyện, sao kê giao dịch ngân hàng. Mở ứng dụng VNeID -> Tìm kiếm 'Kiến nghị, phản ánh về ANTT' -> 'Tạo mới yêu cầu' -> Điền thông tin và đính kèm bằng chứng.",
          "Bước 3 - Gửi báo cáo tố cáo lên Avin Check: Truy cập chuyên mục 'Gửi báo cáo rủi ro' trên Avin Check, đăng tải thông tin tài khoản lừa đảo để hệ thống kiểm duyệt, lưu trữ vết vi phạm và cảnh báo cho toàn bộ cộng đồng.",
        ],
        title: "Quy trình 3 bước xử lý khẩn cấp khi bạn phát hiện bị lừa đảo",
      },
    ],
    shortTitle: "Nội quy giao dịch & Chống Scam",
    summaryCard: {
      content:
        "Chỉ giao dịch với đúng thông tin, số tài khoản niêm yết trên hồ sơ chính thức của Đối tác. Tuyệt đối không giao dịch với tài khoản mạo danh, không chuyển tiền khi chưa xác nhận video kiểm tra.",
      title: "Nguyên tắc cốt lõi: Tiền trao - Dịch vụ chuẩn",
      type: "warning",
    },
    title: "2. Nội Quy Giao Dịch & Phòng Chống Scam",
  },
  {
    badge: "Quy chuẩn nghiệp vụ",
    clauses: [
      {
        category: "workflow",
        date: "15/07/2026",
        description:
          "Quy trình 3 bước xác nhận lời mời an toàn nhằm ngăn chặn thủ đoạn cài cắm tài khoản giả mạo vào nhóm chat.",
        id: "dieu-27",
        keyPoints: [
          "Bước 1: Kiểm tra chính xác số điện thoại Zalo của Đối tác trước khi bắt đầu.",
          "Bước 2: Tạo nhóm chat và gửi lời mời tài khoản Zalo chính chủ của Đối tác vào nhóm.",
          "Bước 3: Chỉ giao dịch khi Đối tác đã phản hồi xác nhận trực tiếp trong nhóm: 'Đã nhận lời mời vào nhóm'.",
          "Cảnh báo: Đối tượng lừa đảo thường tranh thủ mời tài khoản Fake vào trước trong lúc bạn đang chờ. Nếu Đối tác chưa xác nhận lời mời mà bạn đã chuyển tiền, hệ thống sẽ không thể hỗ trợ xử lý đền bù.",
        ],
        number: 27,
        tags: ["Zalo", "Quy trình", "Bắt buộc"],
        title: "Điều 27: Lưu ý an toàn khi Giao Dịch Trung Gian qua Zalo",
      },
      {
        category: "security",
        date: "09/06/2026",
        description:
          "Giải pháp kỹ thuật tạo tài khoản phụ (Clone ẩn danh) ngồi sẵn trong nhóm giao dịch để không bao giờ bị gián đoạn dữ liệu.",
        id: "dieu-26",
        keyPoints: [
          "Tạo tài khoản FB phụ chỉ kết bạn duy nhất với FB chính của Đối tác.",
          "Khóa toàn bộ trang cá nhân, không đăng bài, chặn tin nhắn từ người lạ, vô hiệu hóa trang cá nhân (chỉ giữ Messenger).",
          "Mỗi khi tạo nhóm giao dịch trên FB chính, lập tức add thêm tài khoản FB phụ này vào nhóm.",
          "Khi tài khoản chính gặp sự cố khóa tạm thời, tài khoản phụ vẫn kiểm soát 100% dữ liệu và xử lý tranh chấp bình thường.",
        ],
        number: 26,
        tags: ["Facebook", "Backup", "Nghiệp vụ"],
        title:
          "Điều 26: Phương án dự phòng chống mất dữ liệu khi Facebook bị khóa",
      },
      {
        category: "legal",
        date: "27/05/2026",
        description:
          "Nghiệp vụ bắt buộc quay video 15 giây tóm tắt giao dịch để bảo vệ Đối tác trước các rủi ro pháp luật và rửa tiền.",
        id: "dieu-25",
        keyPoints: [
          "Cài đặt quy định cấm thu hồi tin nhắn trong toàn bộ các nhóm giao dịch.",
          "Sau khi hoàn tất giao dịch, quay video màn hình 15 giây gồm: Link FB/Zalo 2 bên, biến động số dư chuyển đến, STK chuyển đi.",
          "Lưu trữ video theo thư mục ngày/tháng để làm bằng chứng cung cấp cho cơ quan chức năng khi cần thiết.",
        ],
        number: 25,
        tags: ["Pháp lý", "Lưu trữ", "Video"],
        title:
          "Điều 25: Lưu trữ thông tin giao dịch & Video 15 giây phòng ngừa liên đới",
      },
      {
        category: "legal",
        date: "18/05/2026",
        description:
          "Bảo vệ môi trường cạnh tranh lành mạnh trong nội bộ cộng đồng Đối tác Avin Check.",
        id: "dieu-24",
        keyPoints: [
          "Nghiêm cấm hành vi tự tay hoặc thuê bên thứ ba dame, report tài khoản Facebook/Zalo của các Đối tác khác.",
          "Mọi trường hợp bị phát hiện cạnh tranh bẩn sẽ bị hủy hồ sơ bảo lãnh vĩnh viễn và không hoàn trả quỹ đảm bảo.",
        ],
        number: 24,
        tags: ["Cạnh tranh bẩn", "Nghiêm cấm", "Hủy hồ sơ"],
        title:
          "Điều 24: Nghiêm cấm hành vi Dame, tấn công tài khoản của Đối tác lẫn nhau",
      },
      {
        category: "workflow",
        date: "19/04/2025",
        description:
          "Cơ chế chấm điểm tự động phản ánh chất lượng phục vụ và trách nhiệm của từng Đối tác trên hồ sơ công khai.",
        id: "dieu-23",
        keyPoints: [
          "Thang điểm tối đa 100 điểm, tự động cộng +5 điểm vào đầu mỗi tháng.",
          "Bị khiếu nại do quá 48h không phản hồi: Trừ -2 điểm.",
          "Xử lý tranh chấp tắc trách dẫn đến khiếu nại: Trừ -5 điểm.",
          "Hành vi lùa khách, ép giá vô căn cứ: Trừ -8 điểm.",
        ],
        number: 23,
        tags: ["Điểm tín nhiệm", "Đánh giá"],
        title: "Điều 23: Vận hành hệ thống Thang Điểm Tín Nhiệm Đối tác",
      },
      {
        category: "finance",
        date: "05/12/2025",
        description:
          "Dịch vụ miễn phí thường đi kèm với sự thiếu trách nhiệm; cấm phá giá thị trường trung gian.",
        id: "dieu-22",
        keyPoints: [
          "Giao dịch dưới 20.000đ: Thu phí dưới 5.000đ.",
          "Giao dịch trên 20.000đ: Mức phí tối thiểu bắt buộc là 5.000đ.",
          "Đối tác có thể tổ chức mini-game, sự kiện để tri ân thay vì trung gian miễn phí.",
        ],
        number: 22,
        tags: ["Phí dịch vụ", "Nghiêm cấm", "Trách nhiệm"],
        title: "Điều 22: Nghiêm cấm Giao Dịch Trung Gian Miễn Phí (GDTG Free)",
      },
      {
        category: "security",
        date: "29/10/2025",
        description:
          "Các bước phối hợp đưa các đường link tài khoản giả mạo vào cơ sở dữ liệu cảnh báo tự động.",
        id: "dieu-21",
        keyPoints: [
          "Tìm kiếm và sao chép toàn bộ đường link (UID) của các tài khoản Facebook mạo danh tên tuổi Đối tác.",
          "Gửi danh sách UID về Ban quản trị Avin Check để đưa vào Bot cảnh báo tự động trên Telegram và Discord.",
        ],
        number: 21,
        tags: ["Fake tài khoản", "Bảo vệ thương hiệu"],
        title:
          "Điều 21: Quy trình xử lý khi Đối tác bị kẻ xấu tạo tài khoản giả mạo",
      },
      {
        category: "security",
        date: "16/10/2025",
        description:
          "Phòng chống nguy cơ bị cài cắm mã độc Botnet chiếm đoạt dữ liệu qua các file kiểm tra giả mạo.",
        id: "dieu-20",
        keyPoints: [
          "Tuyệt đối không tải về, không mở và không click vào bất kỳ file hoặc đường link lạ nào do người mua/bán gửi.",
          "Nguyên tắc sống còn: Không nhận - Không mở - Không click link lạ trong bất kỳ giao dịch nào.",
        ],
        number: 20,
        tags: ["Mã độc", "Botnet", "Cảnh báo"],
        title:
          "Điều 20: Tuyệt đối không nhận trung gian mua bán Tệp Tin (File lạ)",
      },
      {
        category: "finance",
        date: "07/10/2025",
        description:
          "Kẻ gian thường làm giả thông báo số dư nổi trên màn hình khóa để đánh lừa đối tác bàn giao tài sản.",
        id: "dieu-19",
        keyPoints: [
          "Luôn mở trực tiếp ứng dụng ngân hàng và kiểm tra lịch sử biến động số dư thực tế.",
          "Không bao giờ hoàn tất giao dịch chỉ dựa trên hình ảnh chụp biên lai hoặc thông báo nổi trên điện thoại.",
        ],
        number: 19,
        tags: ["Số dư", "Kiểm tra ngân hàng"],
        title:
          "Điều 19: Cảnh giác với chiêu trò Fake tin nhắn thông báo nhận tiền",
      },
      {
        category: "workflow",
        date: "23/08/2025",
        description:
          "Khuyến nghị chuẩn hóa toàn bộ sổ sách mua bán, thông tin đơn hàng trên nền tảng đám mây.",
        id: "dieu-18",
        keyPoints: [
          "Sử dụng Google Sheets phân chia theo từng trang tính dự án để theo dõi ngày giờ, đối tác, số tiền và trạng thái.",
          "Tránh ghi chép tạm bợ vào ghi chú điện thoại hoặc tin nhắn Facebook dễ bị mất sạch khi gặp sự cố.",
        ],
        number: 18,
        tags: ["Google Sheets", "Quản lý dữ liệu"],
        title:
          "Điều 18: Quản trị dữ liệu giao dịch chuyên nghiệp bằng Bảng tính Google Sheets",
      },
      {
        category: "legal",
        date: "22/08/2025",
        description:
          "Ngăn chặn nguy cơ Đối tác bị lợi dụng làm cổng nạp tiền cho các trang web cờ bạc, vi phạm pháp luật.",
        id: "dieu-17",
        keyPoints: [
          "Kiểm tra kỹ nội dung quét mã QR; nếu phát hiện mã nạp tiền game bài, cờ bạc thì tuyệt đối từ chối chuyển.",
          "Yêu cầu khách hàng cung cấp số tài khoản ngân hàng chính chủ thay thế hoặc tạm giữ giao dịch để xác minh.",
        ],
        number: 17,
        tags: ["QR Game bài", "Rủi ro pháp luật"],
        title:
          "Điều 17: Lưu ý khi khách yêu cầu chuyển tiền qua mã QR hoặc nội dung bất thường",
      },
      {
        category: "box",
        date: "21/08/2025",
        description:
          "Mỗi box trung gian chỉ được phép có đúng 3 thành viên: Người Mua, Người Bán và Đối Tác Trung Gian.",
        id: "dieu-16",
        keyPoints: [
          "Xuất hiện người thứ 4: Yêu cầu tự rời nhóm hoặc lập tức hủy/treo giao dịch.",
          "Xuất hiện box thứ 2 trùng lặp: Ngay lập tức hủy giao dịch và khóa tài khoản có dấu hiệu khả nghi.",
          "Cảnh giác cao độ với các hành vi spam icon, thoát ra vào lại liên tục nhằm làm Đối tác nhầm lẫn.",
        ],
        number: 16,
        tags: ["Nguyên tắc 3:1", "An toàn box"],
        title:
          "Điều 16: Tuân thủ nghiêm ngặt Nguyên Tắc 3:1 trong Box trung gian",
      },
      {
        category: "security",
        date: "20/08/2025",
        description:
          "Quy trình xác minh chính chủ khi tài khoản mạng xã hội của khách hàng bị kẻ gian xâm nhập.",
        id: "dieu-15",
        keyPoints: [
          "Tạm giữ tiền và đóng băng box giao dịch.",
          "Yêu cầu người nộp tiền quay 2 video: Video 1 quay mặt cầm CCCD sau khi đăng xuất các thiết bị; Video 2 vào ứng dụng ngân hàng đối chiếu đúng STK chuyển tiền.",
          "Sau khi xác minh hợp lệ, thực hiện hoàn trả tiền về đúng số tài khoản nguồn ban đầu.",
        ],
        number: 15,
        tags: ["Chiếm quyền FB", "Xử lý tranh chấp"],
        title:
          "Điều 15: Xử lý trường hợp tài khoản người mua bị kẻ gian chiếm quyền vào báo hoàn tất",
      },
      {
        category: "security",
        date: "19/08/2025",
        description:
          "Kẻ gian copy tin nhắn STK của Đối tác, sửa đổi 1 vài chữ số rồi gửi lại vào nhóm chat để đánh lừa khách hàng.",
        id: "dieu-14",
        keyPoints: [
          "Đối tác cần thường xuyên nhắc nhở khách hàng chỉ sao chép đúng tin nhắn do chính nick Đối tác gửi.",
          "Kiểm tra kỹ tên chủ tài khoản thụ hưởng trước khi xác nhận đã nhận được tiền.",
        ],
        number: 14,
        tags: ["Tráo STK", "Cảnh giác"],
        title:
          "Điều 14: Cảnh báo thủ đoạn tráo số tài khoản giả mạo trong nhóm chat",
      },
      {
        category: "workflow",
        date: "18/08/2025",
        description:
          "Kẻ gian lợi dụng Đối tác mới chưa có nhiều kinh nghiệm để tạo nhiều nhóm chat giả mạo dùng chung 1 biên lai chuyển tiền.",
        id: "dieu-13",
        keyPoints: [
          "Khi phát hiện 2 box chat xuất hiện cùng thời điểm với nội dung tương tự: Lập tức hủy giao dịch và đối chiếu kỹ lưỡng.",
          "Không vội vàng chuyển tiền khi chưa kiểm tra chính xác từng mã giao dịch tương ứng với từng nhóm chat.",
        ],
        number: 13,
        tags: ["Đối tác mới", "Phòng chống gian lận"],
        title:
          "Điều 13: Cảnh báo chiêu trò gây loạn nhóm nhằm đánh lừa Đối tác mới",
      },
      {
        category: "finance",
        date: "15/08/2025",
        description:
          "Các số tài khoản có định dạng kết hợp cả chữ và số (ví dụ: 99zp..., 99MM...) là tài khoản tạm thời thường dùng để tẩu tán tiền lừa đảo.",
        id: "dieu-12",
        keyPoints: [
          "Từ chối mọi giao dịch yêu cầu chuyển tiền đến các số tài khoản định dạng này.",
          "Yêu cầu đối tác giao dịch cung cấp số tài khoản ngân hàng chính thống để kiểm tra.",
        ],
        number: 12,
        tags: ["STK ảo", "zp", "mm"],
        title:
          "Điều 12: Ngưng giao dịch ngay lập tức nếu gặp số tài khoản tiền tố ảo",
      },
      {
        category: "finance",
        date: "09/08/2025",
        description:
          "Quy chuẩn giải quyết đối với khách hàng đổi tiền nhưng ghi sai cú pháp nội dung chuyển khoản.",
        id: "dieu-11",
        keyPoints: [
          "Khách hàng cần cung cấp Video quay rõ mặt cầm CCCD và Video màn hình vào app ngân hàng xác nhận đúng giao dịch.",
          "Sau khi nhận đủ video hợp lệ, Đối tác hoàn lại 80% số tiền về đúng STK nguồn với nội dung: 'Hoàn tiền GD sai nội dung'.",
          "Nếu chưa có video: Tiếp tục tạm giữ và đổi tên box thành: 'Sai nội dung - Chờ xác minh'.",
        ],
        number: 11,
        tags: ["Sai nội dung", "Đổi tiền", "Hoàn 80%"],
        title:
          "Điều 11: Quy trình xử lý trường hợp đổi tiền chuyển sai nội dung",
      },
      {
        category: "legal",
        date: "01/08/2025",
        description:
          "Quy trình xử lý nghiêm khắc khi phát hiện giao dịch trong nhóm có yếu tố phạm pháp hoặc rửa tiền.",
        id: "dieu-10",
        keyPoints: [
          "Yêu cầu người gửi cung cấp 2 video xác minh danh tính và kiểm tra giao dịch tài khoản.",
          "Thực hiện hoàn trả 80% số tiền về tài khoản nguồn, giữ lại 20% phí vi phạm.",
          "Trường hợp yêu cầu chuyển vào Quỹ từ thiện: Đối tác quay video chuyển khoản công khai với cú pháp: '[Tên bạn] - Cộng đồng Avin Check ủng hộ...'.",
        ],
        number: 10,
        tags: ["Vi phạm pháp luật", "Quỹ từ thiện", "Phí 20%"],
        title:
          "Điều 10: Xử lý giao dịch trung gian vi phạm pháp luật & Quỹ từ thiện",
      },
      {
        category: "workflow",
        date: "29/07/2025",
        description:
          "Hỗ trợ người dùng và Đối tác kết nối lại nhanh chóng khi tài khoản mạng xã hội gặp sự cố khóa tạm thời.",
        id: "dieu-9",
        keyPoints: [
          "Người dùng có thể tra cứu thông tin Đối tác qua SĐT hoặc Zalo trực tiếp trên các kênh Bot của Avin Check.",
        ],
        number: 9,
        tags: ["Bot tra cứu", "Tự động"],
        title:
          "Điều 9: Cập nhật công cụ BOT tự động tra cứu Số điện thoại & Zalo",
      },
      {
        category: "legal",
        date: "06/07/2025",
        description:
          "Hoạt động mua bán tài khoản Zalo mang lại rủi ro lừa đảo rất cao và tiếp tay cho các hành vi vi phạm pháp luật.",
        id: "dieu-8",
        keyPoints: [
          "Cấm hoàn toàn Đối tác mua bán hoặc nhận trung gian mua bán tài khoản Zalo.",
          "Đối tác cố tình vi phạm sẽ bị hủy hồ sơ uy tín ngay lập tức mà không hoàn trả quỹ đảm bảo.",
        ],
        number: 8,
        tags: ["Cấm bán Zalo", "Nghiêm cấm", "Hủy hồ sơ"],
        title: "Điều 8: Nghiêm cấm hoàn toàn hoạt động mua bán tài khoản Zalo",
      },
      {
        category: "finance",
        date: "02/07/2025",
        description:
          "Điều kiện bắt buộc khi Đối tác tuyển cộng tác viên / giao dịch viên dưới quyền để bảo vệ người dùng.",
        id: "dieu-7",
        keyPoints: [
          "GDV cấp dưới phải đặt cọc tối thiểu 1.000.000đ kèm video xác minh danh tính qua VNeID.",
          "Thời gian hoàn cọc tối thiểu 7 - 15 ngày sau khi đăng bài công khai trên mạng xã hội.",
          "Số tiền bảo đảm của Đối tác tại Avin Check luôn phải chiếm tối thiểu 35% - 50% tổng số tiền nhận cọc từ các GDV.",
          "Avin Check không bảo lãnh bắc cầu; khách hàng làm việc với GDV của Đối tác nào sẽ chịu sự quản lý của Đối tác đó.",
        ],
        number: 7,
        tags: ["Cọc GDV", "Web check GDV", "Quỹ đảm bảo"],
        title:
          "Điều 7: Quy định dành cho Đối tác khi nhận cọc Giao Dịch Viên (GDV)",
      },
      {
        category: "legal",
        date: "15/07/2024",
        description:
          "Tuyệt đối không tiếp tay tiêu thụ tài sản do các đối tượng giả mạo Đối tác đi lừa đảo cung cấp.",
        id: "dieu-5",
        keyPoints: [
          "Mọi hành vi cố tình thu mua tài sản từ nguồn lừa đảo sẽ bị hủy hồ sơ bảo lãnh vĩnh viễn.",
        ],
        number: 5,
        tags: ["Nguồn scam", "Nghiêm cấm", "Hủy hồ sơ"],
        title:
          "Điều 5: Nghiêm cấm thu mua tài khoản từ nguồn lừa đảo, giả mạo Đối tác",
      },
      {
        category: "finance",
        date: "21/03/2024",
        description:
          "Quy định hoàn trả đối với các giao dịch mua bán trung gian chuyển sai cú pháp yêu cầu.",
        id: "dieu-4",
        keyPoints: [
          "Khách hàng cung cấp video quay app ngân hàng đối chiếu đúng số tài khoản và biên lai.",
          "Sau khi xác minh hợp lệ, Đối tác hoàn lại 100% số tiền về đúng tài khoản đã chuyển với cú pháp: 'Hoàn tiền GD sai nội dung'.",
        ],
        number: 4,
        tags: ["Sai nội dung", "Hoàn 100%"],
        title:
          "Điều 4: Quy trình xử lý giao dịch trung gian chuyển sai nội dung",
      },
      {
        category: "workflow",
        date: "20/02/2024",
        description:
          "Bảo đảm chất lượng dịch vụ và tính kịp thời khi tiếp nhận thông tin từ người dùng.",
        id: "dieu-3",
        keyPoints: [
          "Đối tác bắt buộc phải phản hồi các yêu cầu kiểm tra từ Ban quản lý trong vòng 24 giờ.",
          "Quá 48 giờ không phản hồi hoặc không xử lý nhóm chat, hệ thống sẽ tạm treo hồ sơ uy tín.",
        ],
        number: 3,
        tags: ["Thời gian 24h", "Hỗ trợ"],
        title: "Điều 3: Quy định thời gian phản hồi và hỗ trợ khách hàng",
      },
      {
        category: "finance",
        date: "06/01/2024",
        description:
          "Bắt buộc ghi rõ nội dung giao dịch để tránh việc tài khoản bị lợi dụng phục vụ mục đích xấu.",
        id: "dieu-2",
        keyPoints: [
          "Khách hàng bắt buộc phải ghi rõ nội dung '... đổi tiền' hoặc '... giữ tiền hộ'.",
          "Trường hợp cố tình không ghi hoặc ghi sai: Đối tác có quyền trừ 5% - 10% phí xử lý trước khi hoàn trả tài khoản nguồn.",
        ],
        number: 2,
        tags: ["Cú pháp nội dung", "Trừ phí"],
        title:
          "Điều 2: Quy định cú pháp nội dung chuyển tiền khi đổi tiền, giữ tiền hộ",
      },
      {
        category: "legal",
        date: "11/11/2023",
        description:
          "Nguyên tắc xử lý khi phát hiện và tạm giữ tiền của đối tượng lừa đảo trong giao dịch trung gian.",
        id: "dieu-1",
        keyPoints: [
          "Đối tác chỉ được phép giữ tiền khi nạn nhân có yêu cầu chính thức kèm đầy đủ bằng chứng xác thực.",
          "Sau khi trừ phí xử lý, số tiền còn lại được hoàn trả cho nạn nhân; phần dôi dư chuyển vào Quỹ từ thiện công khai.",
          "Lưu trữ toàn bộ video và sao kê giao dịch để bảo đảm tính minh bạch tuyệt đối.",
        ],
        number: 1,
        tags: ["Xích scam", "Quỹ từ thiện", "Quy trình"],
        title:
          "Điều 1: Quy định trường hợp 'Xích Scam' hợp lệ và chuyển Quỹ từ thiện",
      },
    ],
    description:
      "Tiêu chuẩn đăng ký, mức quỹ đảm bảo, thang điểm tín nhiệm, các hành vi nghiêm cấm và trọn bộ 27 điều khoản nghiệp vụ thực chiến dành cho Đối tác Avin Check.",
    id: "partner-policy-clauses",
    items: [
      {
        id: "partner-registration",
        points: [
          "Thời gian tiếp nhận: Hệ thống mở cổng tiếp nhận đăng ký hồ sơ Đối tác liên tục quanh năm.",
          "Tiêu chuẩn tài khoản: Facebook chính chủ có tương tác thật, minh bạch danh tính (chiếm 20% tỷ trọng kiểm duyệt).",
          "Độ tuổi & Thâm niên: Từ 18 tuổi trở lên, có kinh nghiệm hoạt động kinh doanh trực tuyến từ 1 năm trở lên.",
          "Năng lực & Hệ thống: Đang sở hữu hoặc vận hành cộng đồng, nhóm, kênh truyền thông, dự án có dẫn chứng liên kết cụ thể (chiếm 80% tỷ trọng kiểm duyệt).",
          "Thời gian xét duyệt: Từ 6 đến 15 ngày làm việc kể từ thời điểm gửi hồ sơ hợp lệ.",
        ],
        title: "I. Hướng dẫn & Tiêu chuẩn đăng ký Đối tác",
      },
      {
        id: "partner-financial-rules",
        points: [
          "Mức quỹ đảm bảo khởi điểm: Tối thiểu từ 1.000.000đ (linh hoạt theo nhu cầu bảo lãnh giao dịch của Đối tác).",
          "Phí khởi tạo hồ sơ: 0đ (Miễn phí hoàn toàn phí tạo hồ sơ ban đầu và không thu thêm bất kỳ khoản phí định kỳ hàng tháng nào).",
          "Nâng hạng hồ sơ: Đối tác có thể đăng ký nâng hạn mức bảo đảm bất cứ lúc nào theo nhu cầu.",
          "Chỉnh sửa thông tin hồ sơ: Miễn phí (0đ/lần cập nhật).",
          "Quy định rút hồ sơ & rút tiền: Chỉ được rút tiền sau 1 năm tham gia. Sau 1 năm, Đối tác được hoàn trả 100% giá trị hạn mức đã ghi nhận sau 30 ngày kể từ khi hoàn tất bài đăng thông báo công khai trên trang cá nhân. Hồ sơ uy tín sẽ bị tạm treo nếu đang có khiếu nại chưa giải quyết.",
        ],
        title: "II. Quy định tài chính & Quản lý hồ sơ",
      },
      {
        id: "partner-obligations-credit",
        points: [
          "Nghĩa vụ trực box: Bắt buộc phải kiểm tra và phản hồi tin nhắn trong box giao dịch tối thiểu 01 lần trong vòng 24 giờ.",
          "Thời hạn giải trình: Phải phản hồi, phối hợp với Ban quản trị Avin Check trong vòng 24 giờ. Quá 48 giờ không xử lý, hồ sơ sẽ bị tạm gỡ bỏ khỏi danh bạ.",
          "Cơ chế thang điểm tín nhiệm: Mỗi Đối tác có hạn mức tối đa 100 điểm tín nhiệm.",
          "Điểm thưởng định kỳ: Mặc định đầu mỗi tháng tự động cộng +5 điểm cho Đối tác hoạt động chuẩn mực.",
          "Phản hồi chậm: Quá 48h không phản hồi hỗ trợ để khách khiếu nại bị trừ -2 điểm.",
          "Xử lý tranh chấp kém: Để xảy ra tranh chấp do xử lý nghiệp vụ kém bị khiếu nại bị trừ -5 điểm.",
          "Phục vụ thiếu trách nhiệm: Có hành vi ép giá, lùa khách hoặc phục vụ thiếu trách nhiệm bị trừ -8 điểm.",
          "Phân loại xếp hạng: 95 - 100 điểm (Xuất sắc), 85 - 94 điểm (Tốt), Dưới 84 điểm (Trung bình / Cảnh báo).",
        ],
        title: "III. Nghĩa vụ & Hệ thống Điểm tín nhiệm (Thang điểm 100)",
      },
      {
        id: "partner-rights-prohibitions",
        points: [
          "Quyền lợi: Được niêm yết công khai trên Danh bạ Đối tác Avin Check, tiếp cận lưu lượng người dùng lớn, cấp huy hiệu tín nhiệm, hỗ trợ quảng bá tự động và tham gia mạng lưới chuyên môn.",
          "NGHIÊM CẤM: Sử dụng hồ sơ uy tín để quảng cáo các dịch vụ vi phạm pháp luật.",
          "NGHIÊM CẤM: Lập trình, buôn bán hoặc hỗ trợ triển khai các giao diện mạo danh Avin Check.",
          "NGHIÊM CẤM: Mua bán hoặc nhận trung gian mua bán tài khoản Zalo dưới mọi hình thức.",
          "NGHIÊM CẤM: Tiêu thụ hoặc thu mua tài khoản, tài sản từ nguồn lừa đảo, giả mạo Đối tác.",
          "NGHIÊM CẤM: Tấn công, dame hoặc thuê người vô hiệu hóa tài khoản Facebook/Zalo của các Đối tác khác.",
          "NGHIÊM CẤM: Lập website có giao diện hoặc tên miền gây nhầm lẫn để thu cọc trái phép.",
        ],
        title: "IV. Quyền lợi & Những điều nghiêm cấm tuyệt đối",
      },
    ],
    shortTitle: "Quy chế Đối tác & 27 Điều khoản",
    summaryCard: {
      content:
        "Mọi Đối tác xác minh trên Avin Check có nghĩa vụ phản hồi hỗ trợ trong 24h, duy trì điểm tín nhiệm và tuân thủ nghiêm ngặt 27 điều khoản nghiệp vụ. Mọi hành vi vi phạm đều bị hủy hồ sơ và xử lý theo quy định.",
      title: "Kỷ luật và Trách nhiệm là nền tảng sống còn",
      type: "danger",
    },
    title: "3. Quy Chế Đối Tác & 27 Điều Khoản Nghiệp Vụ",
  },
];
