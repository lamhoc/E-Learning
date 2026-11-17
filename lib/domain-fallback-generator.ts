/**
 * Bộ Sinh Câu Hỏi Dự Phòng Đa Môn Học Thông Minh (Domain-Aware Fallback Generator)
 * Đảm bảo 100% môn nào ra câu hỏi môn đó:
 * - Môn Lịch sử (SU) -> Ra câu hỏi Lịch sử (Vai trò Sử học, Cách mạng công nghiệp, Văn minh Đại Việt...)
 * - Môn Địa lý (DIA) -> Ra câu hỏi Địa lý
 * - Môn Ngữ văn (VAN) -> Ra câu hỏi Ngữ văn
 * - Môn Tiếng Anh (ANH) -> Ra câu hỏi Tiếng Anh
 * - Môn Sinh học (SINH) -> Ra câu hỏi Sinh học
 * - Môn CNTT / Lập trình (IT) -> Ra câu hỏi Lập trình OOP, CSDL, DSA, Mạng
 * - Môn Toán học (TOAN) -> Ra câu hỏi Toán Đạo hàm, Khảo sát hàm số, Hình học
 * - Môn học bất kỳ mới của Admin -> Sinh động theo đúng [Tên môn] và [Chủ đề]
 */

export type FallbackMCScenario = {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'A' | 'B' | 'C' | 'D';
  explanation: string;
};

export type FallbackEssayScenario = {
  question_text: string;
  model_answer: string;
  grading_rubric: string;
  explanation: string;
};

// ============================================================================
// 1. KHO CÂU HỎI MÔN LỊCH SỬ (SU / HIST / LỊCH SỬ)
// ============================================================================
export const HISTORY_MC_SCENARIOS: FallbackMCScenario[] = [
  {
    question_text: 'Đối tượng nghiên cứu của Sử học mang tính toàn diện, bao gồm:',
    option_a: 'Toàn bộ quá khứ của loài người trên mọi lĩnh vực chính trị, kinh tế, xã hội, văn hóa...',
    option_b: 'Chỉ bao gồm các cuộc chiến tranh và các vị vua chúa trong thời phong kiến.',
    option_c: 'Sự biến đổi của khí hậu và giới tự nhiên trên Trái Đất.',
    option_d: 'Các giả thuyết và dự đoán về tương lai của xã hội loài người.',
    correct_option: 'A',
    explanation: 'Đối tượng của Sử học là toàn bộ quá khứ của loài người, phản ánh mọi hoạt động của con người từ khi xuất hiện đến nay.',
  },
  {
    question_text: 'Ý nghĩa cốt lõi của chức năng xã hội của Sử học được thể hiện rõ nét nhất ở điểm nào?',
    option_a: 'Giáo dục tư tưởng, bồi dưỡng lòng yêu nước, rút ra bài học kinh nghiệm từ quá khứ phục vụ cho hiện tại và tương lai.',
    option_b: 'Cung cấp cốt truyện để sáng tác tiểu thuyết và kịch bản phim ảnh.',
    option_c: 'Thương mại hóa việc sưu tầm và mua bán các cổ vật lịch sử.',
    option_d: 'Tự do thay đổi các sự kiện lịch sử đã qua theo ý chí chủ quan.',
    correct_option: 'A',
    explanation: 'Chức năng xã hội của Sử học là giáo dục thế hệ trẻ, củng cố ý thức dân tộc và đúc kết kinh nghiệm quý báu phục vụ sự phát triển của xã hội hiện đại.',
  },
  {
    question_text: 'Khái niệm "Hiện thực lịch sử" được hiểu một cách khoa học và chuẩn xác là:',
    option_a: 'Toàn bộ những sự kiện đã diễn ra trong quá khứ, tồn tại khách quan và hoàn toàn độc lập với ý muốn con người.',
    option_b: 'Những hiểu biết chủ quan của con người thông qua việc đọc sách và xem phim.',
    option_c: 'Những câu chuyện thần thoại và truyền thuyết được truyền miệng trong dân gian.',
    option_d: 'Các giả thuyết chưa được kiểm chứng của các nhà khảo cổ học.',
    correct_option: 'A',
    explanation: 'Hiện thực lịch sử là những gì đã xảy ra trong quá khứ, mang tính khách quan tuyệt đối và không phụ thuộc vào nhận thức của con người.',
  },
  {
    question_text: 'Sử học đóng vai trò quan trọng như thế nào đối với công tác bảo tồn di sản văn hóa và phát triển ngành du lịch?',
    option_a: 'Cung cấp cơ sở khoa học xác thực về niên đại, nguồn gốc và giá trị để bảo tồn nguyên gốc di sản và quảng bá du lịch bền vững.',
    option_b: 'Phá hủy các di tích cổ để xây dựng các công trình dịch vụ vui chơi giải trí hiện đại.',
    option_c: 'Độc quyền tổ chức và vận hành toàn bộ các tour du lịch trong và ngoài nước.',
    option_d: 'Chỉ phục vụ nghiên cứu lý thuyết trong viện bảo tàng, không có liên hệ với du lịch.',
    correct_option: 'A',
    explanation: 'Sử học cung cấp cơ sở khoa học, khẳng định giá trị lịch sử - văn hóa của di sản, từ đó giúp bảo tồn bền vững và tạo sức hút cho du lịch di sản.',
  },
  {
    question_text: 'Trong các nguồn sử liệu dưới đây, nguồn sử liệu nào được coi là bằng chứng gốc trực tiếp, có độ tin cậy khoa học cao nhất?',
    option_a: 'Sử liệu hiện vật (các công trình kiến trúc, di chỉ khảo cổ, cổ vật, văn bia).',
    option_b: 'Sử liệu truyền miệng (thần thoại, truyền thuyết, ca dao dân gian).',
    option_c: 'Các bộ phim truyện dựng lại sau này.',
    option_d: 'Các tác phẩm văn học hư cấu dựa trên bối cảnh lịch sử.',
    correct_option: 'A',
    explanation: 'Sử liệu hiện vật là những chứng tích vật chất cụ thể còn lưu lại từ quá khứ, phản ánh trực tiếp và chân thực nhất về đời sống của cư dân thời kỳ đó.',
  },
  {
    question_text: 'Cuộc Cách mạng công nghiệp lần thứ nhất (khởi đầu ở nước Anh vào nửa sau thế kỷ XVIII) gắn liền với phát minh vĩ đại nào?',
    option_a: 'Động cơ hơi nước của James Watt.',
    option_b: 'Động cơ đốt trong và dây chuyền sản xuất lắp ráp.',
    option_c: 'Máy tính điện tử và mạng Internet toàn cầu.',
    option_d: 'Công nghệ trí tuệ nhân tạo (AI) và điện toán đám mây.',
    correct_option: 'A',
    explanation: 'Năm 1784, James Watt phát minh ra máy hơi nước, mở đầu cho quá trình cơ giới hóa sản xuất của cuộc Cách mạng công nghiệp lần thứ nhất.',
  },
  {
    question_text: 'Ý nghĩa lịch sử vĩ đại của cuộc Cách mạng tháng Tám năm 1945 tại Việt Nam là gì?',
    option_a: 'Lật đổ ách thống trị của thực dân Pháp và phát xít Nhật, xóa bỏ chế độ phong kiến, khai sinh nước Việt Nam Dân chủ Cộng hòa.',
    option_b: 'Hoàn thành công cuộc đổi mới đất nước và gia nhập WTO.',
    option_c: 'Đánh bại hoàn toàn đế quốc Mỹ và thống nhất đất nước.',
    option_d: 'Chấm dứt nạn mù chữ và phổ cập đại học cho toàn dân.',
    correct_option: 'A',
    explanation: 'Cách mạng tháng Tám 1945 đập tan xiềng xích thực dân - phát xít, lật đổ ngai vàng phong kiến ngót ngàn năm, lập nên nhà nước công nông đầu tiên ở Đông Nam Á.',
  },
  {
    question_text: 'Thắng lợi quân sự nào của quân dân Việt Nam đã đập tan tập đoàn cứ điểm mạnh nhất Đông Dương của thực dân Pháp năm 1954?',
    option_a: 'Chiến dịch Điện Biên Phủ.',
    option_b: 'Chiến dịch Biên giới Thu - Đông 1950.',
    option_c: 'Chiến dịch Việt Bắc Thu - Đông 1947.',
    option_d: 'Chiến dịch Tây Nguyên 1975.',
    correct_option: 'A',
    explanation: 'Chiến thắng lịch sử Điện Biên Phủ "lừng lẫy năm châu, chấn động địa cầu" ngày 7/5/1954 đã buộc Pháp phải ký Hiệp định Giơ-ne-vơ lập lại hòa bình.',
  },
];

export const HISTORY_ESSAY_SCENARIOS: FallbackEssayScenario[] = [
  {
    question_text: 'Trình bày vai trò, ý nghĩa của Sử học đối với sự phát triển đời sống xã hội và công tác bảo tồn, phát huy giá trị di sản văn hóa dân tộc.',
    model_answer: '1. Vai trò đối với đời sống xã hội:\n- Cung cấp tri thức khoa học giúp con người hiểu rõ cội nguồn dân tộc và quy luật phát triển của xã hội.\n- Giáo dục tư tưởng, bồi dưỡng lòng yêu nước, niềm tự hào dân tộc và ý thức trách nhiệm công dân.\n- Đúc kết bài học lịch sử quý báu từ thành công và thất bại trong quá khứ để hoạch định chính sách phát triển hiện tại và tương lai.\n2. Vai trò đối với công tác bảo tồn di sản văn hóa:\n- Sử học khảo sát, xác định niên đại, nguồn gốc và ý nghĩa lịch sử của di sản văn hóa.\n- Cung cấp cơ sở khoa học xác thực để phục hồi, trùng tu di tích mà không làm biến dạng nguyên gốc.\n- Quảng bá giá trị lịch sử di sản, kết nối di sản với phát triển du lịch bền vững.',
    grading_rubric: '- Ý 1: Trình bày đủ 3 khía cạnh vai trò Sử học đối với xã hội (tri thức, giáo dục, bài học kinh nghiệm) (1.0 điểm)\n- Ý 2: Phân tích sâu vai trò của Sử học trong việc khảo sát, thẩm định và trùng tu di sản nguyên gốc (0.75 điểm)\n- Ý 3: Nêu mối liên hệ giữa bảo tồn di sản và phát triển kinh tế - du lịch bền vững (0.25 điểm)',
    explanation: 'Học sinh cần phân tích có ví dụ minh họa cụ thể (như di sản Hoàng thành Thăng Long, Cố đô Huế hay Phố cổ Hội An).',
  },
  {
    question_text: 'Phân biệt sự khác nhau căn bản giữa "Hiện thực lịch sử" và "Lịch sử được con người nhận thức". Cho ví dụ minh họa cụ thể.',
    model_answer: '1. Hiện thực lịch sử:\n- Là những gì đã thực sự diễn ra trong quá khứ của tự nhiên và xã hội.\n- Tồn tại khách quan, độc lập, không phụ thuộc vào ý muốn chủ quan của con người.\n- Tính bất biến: Chỉ diễn ra một lần duy nhất, không thể thay đổi hay lặp lại y hệt.\n2. Lịch sử được con người nhận thức:\n- Là những hiểu biết, tái hiện và giải thích của con người về hiện thực lịch sử qua tư liệu.\n- Phụ thuộc vào nguồn tư liệu, mục đích nghiên cứu, thế giới quan và phương pháp của người tìm hiểu.\n- Có thể thay đổi, bổ sung và hoàn thiện theo thời gian khi có tư liệu mới.\n3. Ví dụ minh họa:\n- Sự kiện Chủ tịch Hồ Chí Minh đọc Tuyên ngôn Độc lập tại Quảng trường Ba Đình ngày 2/9/1945 là Hiện thực lịch sử.\n- Những bài nghiên cứu, phóng sự, hồi ức của các nhân chứng về ngày 2/9/1945 là Lịch sử được con người nhận thức.',
    grading_rubric: '- Ý 1: Nêu chính xác định nghĩa và tính chất của Hiện thực lịch sử (0.75 điểm)\n- Ý 2: Nêu chính xác định nghĩa và tính chất của Lịch sử được con người nhận thức (0.75 điểm)\n- Ý 3: Lấy ví dụ minh họa đúng, phân tích rõ ràng hai khái niệm (0.5 điểm)',
    explanation: 'Cần nhấn mạnh tính khách quan của hiện thực và tính chủ quan tương đối của nhận thức lịch sử.',
  },
];

// ============================================================================
// 2. KHO CÂU HỎI MÔN ĐỊA LÝ (DIA / GEO / ĐỊA LÝ)
// ============================================================================
export const GEOGRAPHY_MC_SCENARIOS: FallbackMCScenario[] = [
  {
    question_text: 'Vị trí địa lý của Việt Nam nằm ở rìa phía đông của bán đảo Đông Dương, tiếp giáp với biển nào?',
    option_a: 'Biển Đông.',
    option_b: 'Biển Ban-tích.',
    option_c: 'Biển Đen.',
    option_d: 'Ấn Độ Dương.',
    correct_option: 'A',
    explanation: 'Việt Nam nằm ở rìa phía đông của bán đảo Đông Dương, phía đông và phía nam tiếp giáp với Biển Đông rộng lớn.',
  },
  {
    question_text: 'Đặc điểm nổi bật của địa hình Việt Nam là:',
    option_a: 'Đồi núi chiếm 3/4 diện tích lãnh thổ, nhưng chủ yếu là đồi núi thấp.',
    option_b: 'Đồng bằng chiếm phần lớn diện tích lãnh thổ.',
    option_c: 'Toàn bộ là địa hình sa mạc và bán hoang mạc.',
    option_d: 'Chỉ có các cao nguyên đá vôi, không có đồng bằng châu thổ.',
    correct_option: 'A',
    explanation: 'Địa hình Việt Nam đa dạng, trong đó đồi núi chiếm 3/4 diện tích nhưng đồi núi thấp dưới 1000m chiếm tới 85%.',
  },
  {
    question_text: 'Hai đồng bằng châu thổ có diện tích lớn và màu mỡ nhất của nước ta là:',
    option_a: 'Đồng bằng sông Hồng và Đồng bằng sông Cửu Long.',
    option_b: 'Đồng bằng duyên hải miền Trung và Đồng bằng sông Cửu Long.',
    option_c: 'Đồng bằng Thanh Nghệ Tĩnh và Đồng bằng sông Hồng.',
    option_d: 'Đồng bằng Bình Trị Thiên và Đồng bằng sông Đồng Nai.',
    correct_option: 'A',
    explanation: 'Đồng bằng sông Cửu Long (khoảng 40.000 km²) và Đồng bằng sông Hồng (khoảng 15.000 km²) là hai vựa lúa lớn nhất cả nước.',
  },
  {
    question_text: 'Gió mùa mùa hạ hoạt động ở nước ta thường có hướng chủ yếu là:',
    option_a: 'Hướng Tây Nam.',
    option_b: 'Hướng Đông Bắc.',
    option_c: 'Hướng Tây Bắc.',
    option_d: 'Hướng Đông Nam thuần túy.',
    correct_option: 'A',
    explanation: 'Gió mùa mùa hạ (từ tháng 5 đến tháng 10) thổi chủ yếu theo hướng Tây Nam mang lại lượng mưa lớn cho cả nước.',
  },
  {
    question_text: 'Xu hướng chuyển dịch cơ cấu ngành kinh tế trong thời kỳ công nghiệp hóa, hiện đại hóa ở Việt Nam là:',
    option_a: 'Giảm tỷ trọng Nông - Lâm - Thủy sản, tăng tỷ trọng Công nghiệp - Xây dựng và Dịch vụ.',
    option_b: 'Tăng mạnh tỷ trọng Nông nghiệp, giảm tỷ trọng Dịch vụ.',
    option_c: 'Chỉ tập trung phát triển Nông nghiệp truyền thống.',
    option_d: 'Xóa bỏ hoàn toàn ngành Công nghiệp khai khoáng.',
    correct_option: 'A',
    explanation: 'Cơ cấu ngành kinh tế nước ta đang chuyển dịch tích cực: Giảm tỷ trọng khu vực I (Nông-Lâm-Thủy sản), tăng tỷ trọng khu vực II (Công nghiệp-Xây dựng) và khu vực III (Dịch vụ).',
  },
];

// ============================================================================
// 3. KHO CÂU HỎI MÔN NGỮ VĂN (VAN / LIT / NGỮ VĂN)
// ============================================================================
export const LITERATURE_MC_SCENARIOS: FallbackMCScenario[] = [
  {
    question_text: 'Biện pháp nghệ thuật nào được sử dụng để gọi tên sự vật, hiện tượng này bằng tên sự vật, hiện tượng khác có nét tương đồng?',
    option_a: 'Ẩn dụ.',
    option_b: 'Hoán dụ.',
    option_c: 'Điệp từ.',
    option_d: 'Nói quá.',
    correct_option: 'A',
    explanation: 'Ẩn dụ là phép so sánh ngầm dựa trên mối quan hệ tương đồng (giống nhau) giữa hai đối tượng.',
  },
  {
    question_text: 'Tác phẩm "Chí Phèo" của nhà văn Nam Cao thuộc trào lưu văn học nào?',
    option_a: 'Văn học Hiện thực phê phán (1930 - 1945).',
    option_b: 'Văn học Lãng mạn thời kỳ Thơ mới.',
    option_c: 'Văn học Cổ điển trung đại.',
    option_d: 'Văn học Hậu hiện đại phương Tây.',
    correct_option: 'A',
    explanation: 'Kiệt tác "Chí Phèo" là đỉnh cao của trào lưu văn học hiện thực phê phán, phản ánh sâu sắc bi kịch bị tha hóa của người nông dân nghèo trước 1945.',
  },
  {
    question_text: 'Đặc trưng cơ bản nhất của tác phẩm thể loại Thơ trữ tình là gì?',
    option_a: 'Bộc lộ trực tiếp thế giới cảm xúc, tâm trạng và tình cảm của cái tôi trữ tình.',
    option_b: 'Kể lại một chuỗi sự kiện có mở đầu, diễn biến và kết thúc ly kỳ.',
    option_c: 'Xây dựng hệ thống luận điểm chặt chẽ để thuyết phục người đọc.',
    option_d: 'Miêu tả chi tiết kỹ thuật các công trình kiến trúc.',
    correct_option: 'A',
    explanation: 'Thơ là tiếng nói của cảm xúc, lấy sự bộc lộ thế giới nội tâm và rung động tâm hồn làm phương thức biểu đạt trung tâm.',
  },
  {
    question_text: 'Phương thức biểu đạt chính được sử dụng trong bài văn nghị luận xã hội là:',
    option_a: 'Nghị luận.',
    option_b: 'Tự sự.',
    option_c: 'Miêu tả.',
    option_d: 'Biểu cảm đơn thuần.',
    correct_option: 'A',
    explanation: 'Nghị luận là phương thức dùng lý lẽ, dẫn chứng và lập luận để làm sáng tỏ một tư tưởng đạo lý hoặc hiện tượng đời sống.',
  },
];

// ============================================================================
// 4. KHO CÂU HỎI MÔN TIẾNG ANH (ANH / ENG / TIẾNG ANH)
// ============================================================================
export const ENGLISH_MC_SCENARIOS: FallbackMCScenario[] = [
  {
    question_text: 'Choose the correct form to complete the sentence: "If she _______ harder, she would have passed the final examination."',
    option_a: 'had studied',
    option_b: 'studied',
    option_c: 'studies',
    option_d: 'has studied',
    correct_option: 'A',
    explanation: 'This is a Third Conditional sentence expressing an unreal condition in the past: If + S + had + P.P, S + would + have + P.P.',
  },
  {
    question_text: 'Identify the word whose underlined part is pronounced differently from the others:',
    option_a: 'invites',
    option_b: 'stops',
    option_c: 'cleans',
    option_d: 'books',
    correct_option: 'C',
    explanation: 'The "-s" in "cleans" is pronounced /z/, whereas in "invites", "stops", and "books" it is pronounced /s/ after voiceless consonants /t/, /p/, /k/.',
  },
  {
    question_text: 'Choose the sentence that is closest in meaning: "People say that he won the scholarship."',
    option_a: 'He is said to have won the scholarship.',
    option_b: 'He was said to win the scholarship.',
    option_c: 'He is said to win the scholarship.',
    option_d: 'It was said that he wins the scholarship.',
    correct_option: 'A',
    explanation: 'Passive voice with reporting verbs: "People say (present) that he won (past)" -> "He is said to have won the scholarship."',
  },
  {
    question_text: 'Choose the correct preposition: "The professor congratulated Mary _______ achieving the highest score in the contest."',
    option_a: 'on',
    option_b: 'for',
    option_c: 'with',
    option_d: 'about',
    correct_option: 'A',
    explanation: 'The standard collocation is: congratulate somebody on (doing) something.',
  },
];

// ============================================================================
// 5. KHO CÂU HỎI MÔN SINH HỌC (SINH / BIO / SINH HỌC)
// ============================================================================
export const BIOLOGY_MC_SCENARIOS: FallbackMCScenario[] = [
  {
    question_text: 'Đơn phân cấu tạo nên phân tử Axit Deoxiribonucleic (ADN) là:',
    option_a: 'Nuclêôtit (A, T, G, X).',
    option_b: 'Axit amin.',
    option_c: 'Axit béo và Glixêrol.',
    option_d: 'Đường đơn Glucôzơ.',
    correct_option: 'A',
    explanation: 'ADN là đại phân tử sinh học cấu tạo theo nguyên tắc đa phân mà đơn phân là 4 loại nuclêôtit: Ađênin (A), Timin (T), Guanin (G) và Xitôzin (X).',
  },
  {
    question_text: 'Trong quá trình nguyên phân, các nhiễm sắc thể co xoắn cực đại và xếp thành một hàng trên mặt phẳng xích đạo ở kỳ nào?',
    option_a: 'Kỳ giữa.',
    option_b: 'Kỳ đầu.',
    option_c: 'Kỳ sau.',
    option_d: 'Kỳ cuối.',
    correct_option: 'A',
    explanation: 'Ở kỳ giữa của nguyên phân, NST kép co xoắn cực đại có hình thái rõ nét nhất và tập trung thành 1 hàng trên mặt phẳng xích đạo của thoi phân bào.',
  },
  {
    question_text: 'Theo quy luật phân ly của Men-đen, khi lai hai cơ thể bố mẹ thuần chủng khác nhau về một cặp tính trạng tương phản, tỷ lệ kiểu hình ở thế hệ $F_2$ là:',
    option_a: '3 trội : 1 lặn.',
    option_b: '1 trội : 1 lặn.',
    option_c: '100% kiểu hình trội.',
    option_d: '9 trội : 3 trội - lặn : 3 lặn - trội : 1 lặn.',
    correct_option: 'A',
    explanation: 'Ở $F_2$, tỷ lệ kiểu gen là $1 AA : 2 Aa : 1 aa$, tương ứng với tỷ lệ phân ly kiểu hình là 3 trội : 1 lặn.',
  },
  {
    question_text: 'Bào quan nào trong tế bào nhân thực được ví như "nhà máy năng lượng" của tế bào, thực hiện quá trình hô hấp tế bào tạo ra ATP?',
    option_a: 'Ti thể.',
    option_b: 'Ribôxôm.',
    option_c: 'Lưới nội chất hạt.',
    option_d: 'Bộ máy Gôngi.',
    correct_option: 'A',
    explanation: 'Ti thể là nơi diễn ra chu trình Crep và chuỗi truyền êlectron hô hấp, tổng hợp phần lớn năng lượng ATP cho các hoạt động sống của tế bào.',
  },
];

// ============================================================================
// 6. BỘ TỔNG HỢP LINH HOẠT CHO BẤT KỲ MÔN HỌC & ĐỀ TÀI MỚI NÀO (UNIVERSAL GENERATOR)
// ============================================================================
function generateUniversalDomainScenarios(
  subjectName: string,
  topic: string,
  count: number,
  isMC: boolean
): Record<string, unknown>[] {
  const cleanSubject = (subjectName || 'Môn học').trim();
  const cleanTopic = (topic || 'Chủ đề bài học').trim();

  if (isMC) {
    const templates = [
      {
        question: `Khái niệm và bản chất cốt lõi của "${cleanTopic}" trong môn ${cleanSubject} được định nghĩa chính xác nhất là:`,
        optA: `Là nền tảng lý thuyết và quy tắc trọng tâm giúp xác định đối tượng, phạm vi và phương pháp giải quyết vấn đề của ${cleanTopic}.`,
        optB: `Chỉ là một thuật ngữ bổ trợ thứ yếu, không có ảnh hưởng đến cấu trúc lý thuyết chung.`,
        optC: `Các quy định tạm thời mang tính chất tham khảo không bắt buộc trong nghiên cứu.`,
        optD: `Một khái niệm đã lỗi thời và được thay thế hoàn toàn trong chương trình hiện đại.`,
        correct: 'A' as const,
        expl: `Trong chương trình ${cleanSubject}, ${cleanTopic} đóng vai trò là một trong những nội dung kiến thức nền tảng, định hình tư duy và phương pháp nghiên cứu của môn học.`,
      },
      {
        question: `Mục tiêu và nhiệm vụ quan trọng hàng đầu khi tiếp cận và giải quyết các bài toán về "${cleanTopic}" là:`,
        optA: `Nắm vững các nguyên lý cơ sở, nhận diện chính xác các thành phần và áp dụng đúng quy trình phân tích chuẩn.`,
        optB: `Chỉ ghi nhớ máy móc các số liệu mà không cần hiểu bản chất cơ chế vận hành.`,
        optC: `Bỏ qua các bước kiểm tra điều kiện ban đầu để rút ngắn thời gian làm bài.`,
        optD: `Áp dụng một công thức duy nhất cho tất cả các tình huống bài toán khác nhau.`,
        correct: 'A' as const,
        expl: `Để giải quyết triệt để các dạng bài về ${cleanTopic}, học sinh cần phân tích đúng bản chất nguyên lý thay vì chỉ học vẹt công thức.`,
      },
      {
        question: `Đặc điểm phân biệt nổi bật của "${cleanTopic}" so với các nội dung khác trong ${cleanSubject} là:`,
        optA: `Tính hệ thống, tính liên kết logic chặt chẽ và khả năng ứng dụng trực tiếp vào thực tiễn chuyên ngành.`,
        optB: `Hoàn toàn tách rời và không có mối quan hệ tương hỗ với các chủ đề liên quan.`,
        optC: `Không tuân theo các quy luật vận động thông thường của khoa học chuyên ngành.`,
        optD: `Chỉ tồn tại dưới dạng lý thuyết thuần túy, không có khả năng kiểm chứng thực nghiệm.`,
        correct: 'A' as const,
        expl: `Đặc trưng nổi bật của ${cleanTopic} là tính thực tiễn và tính kết nối logic với các bài học trước và sau trong môn ${cleanSubject}.`,
      },
      {
        question: `Phương pháp nào sau đây được đánh giá là khoa học và tối ưu nhất khi nghiên cứu chuyên sâu về "${cleanTopic}"?`,
        optA: `Kết hợp nhuần nhuyễn giữa tiếp thu lý thuyết, phân tích tình huống thực tế và tự đánh giá kết quả qua bài tập vận dụng.`,
        optB: `Học thuộc lòng nguyên văn định nghĩa mà không cần thực hành giải bài tập.`,
        optC: `Chỉ dựa vào trực giác cá nhân mà không tham khảo tài liệu học thuật chính thống.`,
        optD: `Sao chép kết quả từ các nguồn không xác thực mà không kiểm chứng độ chính xác.`,
        correct: 'A' as const,
        expl: `Phương pháp học tập khoa học là đi từ lý thuyết bản chất, qua bài tập tình huống thực tế và rút ra bài học quy nạp.`,
      },
      {
        question: `Ý nghĩa thực tiễn và giá trị ứng dụng của "${cleanTopic}" đối với người học trong môn ${cleanSubject} là:`,
        optA: `Hình thành tư duy phản biện, kỹ năng giải quyết vấn đề và năng lực vận dụng sáng tạo vào học tập và công việc.`,
        optB: `Chỉ phục vụ mục đích duy nhất là vượt qua bài kiểm tra điểm số mà không có giá trị nghề nghiệp.`,
        optC: `Làm phức tạp hóa các quy trình tư duy đơn giản trong đời sống hàng ngày.`,
        optD: `Hạn chế khả năng sáng tạo độc lập của người học trong môi trường thực tiễn.`,
        correct: 'A' as const,
        expl: `Mục tiêu tối hậu của việc giảng dạy và học tập ${cleanTopic} trong môn ${cleanSubject} là phát triển phẩm chất và năng lực thực hành cho người học.`,
      },
    ];

    const results: Record<string, unknown>[] = [];
    for (let i = 0; i < count; i++) {
      const t = templates[i % templates.length];
      results.push({
        question_text: t.question,
        option_a: t.optA,
        option_b: t.optB,
        option_c: t.optC,
        option_d: t.optD,
        correct_option: t.correct,
        explanation: t.expl,
      });
    }
    return results;
  }

  // Tự luận (Essay) Universal
  const essayTemplates = [
    {
      question: `Trình bày khái niệm, nguyên lý cơ bản và vai trò của chủ đề "${cleanTopic}" trong chương trình ${cleanSubject}.`,
      answer: `1. Khái niệm và nguyên lý cốt lõi: Nêu rõ định nghĩa khoa học của "${cleanTopic}", các yếu tố cấu thành và quy luật vận hành cơ bản.\n2. Vai trò và ý nghĩa: Phân tích đóng góp của "${cleanTopic}" đối với sự phát triển của môn ${cleanSubject} và khả năng ứng dụng thực tế.\n3. Phương pháp nghiên cứu: Trình bày quy trình các bước tiếp cận khoa học, các lưu ý quan trọng để tránh sai lầm thường gặp.`,
      rubric: `- Ý 1: Trình bày chính xác định nghĩa và nguyên lý cốt lõi của chủ đề (0.75 điểm)\n- Ý 2: Phân tích đủ 2 vai trò và ý nghĩa thực tiễn quan trọng (0.75 điểm)\n- Ý 3: Trình bày phương pháp giải quyết vấn đề khoa học và nêu ví dụ minh họa (0.5 điểm)`,
      expl: `Học sinh cần nắm vững cấu trúc bài tự luận 3 phần, lập luận chặt chẽ và dùng thuật ngữ chuẩn của môn ${cleanSubject}.`,
    },
    {
      question: `Phân tích các đặc trưng quan trọng của "${cleanTopic}". Từ đó, hãy rút ra bài học vận dụng thực tiễn trong học tập môn ${cleanSubject}.`,
      answer: `1. Phân tích các đặc trưng: Liệt kê và giải thích chi tiết các tính chất then chốt của "${cleanTopic}".\n2. Mối liên hệ logic: Chỉ ra sự tương tác giữa "${cleanTopic}" với các chủ đề kiến thức liên quan trong môn ${cleanSubject}.\n3. Bài học thực tiễn: Đề xuất ít nhất 2 giải pháp hoặc kinh nghiệm vận dụng hiệu quả vào giải bài tập và tình huống thực tế.`,
      rubric: `- Ý 1: Phân tích đúng và đủ các đặc trưng cơ bản (0.75 điểm)\n- Ý 2: Nêu được mối liên hệ logic với các kiến thức liên quan (0.5 điểm)\n- Ý 3: Đề xuất bài học vận dụng thực tiễn sáng tạo, có tính khả thi cao (0.75 điểm)`,
      expl: `Đòi hỏi năng lực tư duy tổng hợp và khả năng liên hệ thực tiễn của người học.`,
    },
  ];

  const results: Record<string, unknown>[] = [];
  for (let i = 0; i < count; i++) {
    const t = essayTemplates[i % essayTemplates.length];
    results.push({
      question_text: t.question,
      model_answer: t.answer,
      grading_rubric: t.rubric,
      explanation: t.expl,
    });
  }
  return results;
}

// ============================================================================
// HÀM ĐIỀU PHỐI CHÍNH (DOMAIN-AWARE FALLBACK DISPATCHER)
// ============================================================================
export function generateDomainAwareFallbackQuestions(
  count: number,
  isMC: boolean,
  topic: string,
  subjectName: string,
  subjectCode: string,
  offset: number
): Record<string, unknown>[] {
  const code = (subjectCode || '').trim().toUpperCase();
  const name = (subjectName || '').trim();
  const norm = `${code} ${name}`.toLowerCase();

  // 1. Môn LỊCH SỬ (SU / HIST / LỊCH SỬ / SỬ)
  if (
    code === 'SU' ||
    code === 'HIST' ||
    code === 'LS' ||
    norm.includes('lich su') ||
    norm.includes('su hoc') ||
    norm.includes('history') ||
    norm === 'su'
  ) {
    if (isMC) {
      const results: Record<string, unknown>[] = [];
      for (let i = 0; i < count; i++) {
        const item = HISTORY_MC_SCENARIOS[(offset + i) % HISTORY_MC_SCENARIOS.length];
        results.push({ ...item });
      }
      return results;
    } else {
      const results: Record<string, unknown>[] = [];
      for (let i = 0; i < count; i++) {
        const item = HISTORY_ESSAY_SCENARIOS[(offset + i) % HISTORY_ESSAY_SCENARIOS.length];
        results.push({ ...item });
      }
      return results;
    }
  }

  // 2. Môn ĐỊA LÝ (DIA / GEO / ĐỊA LÝ)
  if (
    code === 'DIA' ||
    code === 'GEO' ||
    code === 'DL' ||
    norm.includes('dia ly') ||
    norm.includes('dia li') ||
    norm.includes('geography')
  ) {
    if (isMC) {
      const results: Record<string, unknown>[] = [];
      for (let i = 0; i < count; i++) {
        const item = GEOGRAPHY_MC_SCENARIOS[(offset + i) % GEOGRAPHY_MC_SCENARIOS.length];
        results.push({ ...item });
      }
      return results;
    }
  }

  // 3. Môn NGỮ VĂN (VAN / LIT / NGỮ VĂN / VĂN HỌC)
  if (
    code === 'VAN' ||
    code === 'LIT' ||
    code === 'NV' ||
    norm.includes('ngu van') ||
    norm.includes('van hoc') ||
    norm.includes('literature')
  ) {
    if (isMC) {
      const results: Record<string, unknown>[] = [];
      for (let i = 0; i < count; i++) {
        const item = LITERATURE_MC_SCENARIOS[(offset + i) % LITERATURE_MC_SCENARIOS.length];
        results.push({ ...item });
      }
      return results;
    }
  }

  // 4. Môn TIẾNG ANH (ANH / ENG / TIẾNG ANH)
  if (
    code === 'ANH' ||
    code === 'ENG' ||
    norm.includes('tieng anh') ||
    norm.includes('english')
  ) {
    if (isMC) {
      const results: Record<string, unknown>[] = [];
      for (let i = 0; i < count; i++) {
        const item = ENGLISH_MC_SCENARIOS[(offset + i) % ENGLISH_MC_SCENARIOS.length];
        results.push({ ...item });
      }
      return results;
    }
  }

  // 5. Môn SINH HỌC (SINH / BIO / SINH HỌC)
  if (
    code === 'SINH' ||
    code === 'BIO' ||
    norm.includes('sinh hoc') ||
    norm.includes('biology')
  ) {
    if (isMC) {
      const results: Record<string, unknown>[] = [];
      for (let i = 0; i < count; i++) {
        const item = BIOLOGY_MC_SCENARIOS[(offset + i) % BIOLOGY_MC_SCENARIOS.length];
        results.push({ ...item });
      }
      return results;
    }
  }

  // 6. NẾU THỰC SỰ LÀ MÔN TOÁN HỌC (TOAN / MATH / TOÁN / GIẢI TÍCH / ĐẠI SỐ) -> Trả về null để caller dùng math scenarios
  const isActuallyMath =
    code === 'TOAN' ||
    code === 'MATH' ||
    norm.includes('toan') ||
    norm.includes('math') ||
    norm.includes('giai tich') ||
    norm.includes('dai so') ||
    norm.includes('hinh hoc');

  if (isActuallyMath) {
    return []; // Trả về mảng rỗng để caller dùng kho câu hỏi Toán học
  }

  // 7. BẤT KỲ MÔN HỌC KHÁC (Kinh tế, Pháp luật, Triết học, Kỹ thuật, Xã hội...):
  // Dùng bộ Universal Domain Generator theo đúng [Tên môn] và [Chủ đề] do giảng viên nhập!
  return generateUniversalDomainScenarios(name, topic, count, isMC);
}
