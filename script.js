//=======================================
// ===== KHAI BÁO BIẾN VÀ CONSTANTS =====
//=======================================
// Cấu hình Supabase
const SUPABASE_URL = "https://vhkmvvcofaedqfassffz.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoa212dmNvZmFlZHFmYXNzZmZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MzA1MTAsImV4cCI6MjA2OTQwNjUxMH0.b7FcKfPHuv8zwVRTMHAoNmzd2YwxPqn_S_L2-idJt88";

// Cấu hình AI API
const OPENROUTER_API_KEY =
  "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";
const API_BASE_URL = "https://openrouter.ai/api/v1";
const AI_MODEL = "openai/gpt-4o-mini";

// Biến toàn cục
let supabase;
let isLoggedIn = false;
let currentUser = null;
let isChatVisible = false;

// Biến cho Chat
let conversationHistory = [];
let currentChatSessionId = null;
let currentChatFileContent = "";
let currentChatFileName = "";

// Biến cho Quiz
let currentQuestions = [];
let currentContent = "";
let currentQuizSessionId = null;

// Biến cho tiến độ học tập
const userProgress = {
  totalLessons: 0,
  completedLessons: 0,
  totalQuizzes: 0,
  completedQuizzes: 0,
  totalTopics: 0,
  completedTopics: 0,
  studyTime: 0,
  currentStreak: 0,
  longestStreak: 0,
  achievements: [],
  activityHistory: [],
};
// ====================================================
// ================= KHỞI TẠO SUPABASE ================
//=====================================================
// Khởi tạo Supabase client
function initializeSupabase() {
  if (typeof window !== "undefined" && window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase đã được khởi tạo thành công");
    return true;
  } else {
    console.error("Thư viện Supabase chưa được tải");
    return false;
  }
}
// Kiểm tra kết nối với database
async function checkSupabaseConnection() {
  try {
    const { data, error } = await Promise.race([
      supabase.from("profiles").select("count").limit(1),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Hết thời gian kết nối")), 10000)
      ),
    ]);

    if (error) {
      console.error("Lỗi kết nối database:", error);
      return false;
    }
    console.log("Kết nối database thành công");
    return true;
  } catch (error) {
    console.error("Kiểm tra kết nối thất bại:", error);
    return false;
  }
}
//=====================================================
// =============== QUẢN LÝ MODAL ======================
//=====================================================
function showModal(modalId) {
  const modal = document.getElementById(modalId + "-modal");
  if (modal) {
    modal.classList.remove("hidden");
  }
}

// Ẩn modal
function hideModal(modalId) {
  const modal = document.getElementById(modalId + "-modal");
  if (modal) {
    modal.classList.add("hidden");
  }
}

// Chuyển đổi giữa các modal
function switchModal(modalId) {
  document.querySelectorAll('[id$="-modal"]').forEach((modal) => {
    modal.classList.add("hidden");
  });
  showModal(modalId);
}
//=====================================================
// ============ HỆ THỐNG THÔNG BÁO ====================
//=====================================================
function showNotification(message, type = "info") {
  // Xóa thông báo cũ nếu có
  const existingNotification = document.getElementById("notification");
  if (existingNotification) {
    existingNotification.remove();
  }
  // Tạo thông báo mới
  const notification = document.createElement("div");
  notification.id = "notification";
  notification.className = `notification ${type}`;

  const icons = {
    success: "fa-check-circle",
    error: "fa-exclamation-circle",
    info: "fa-info-circle",
    warning: "fa-exclamation-triangle",
  };

  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas ${icons[type]}"></i>
      <span>${message}</span>
      <button onclick="hideNotification()" class="notification-close">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.classList.add("show");
  }, 100);
  setTimeout(() => {
    hideNotification();
  }, 5000);
}
// Ẩn thông báo
function hideNotification() {
  const notification = document.getElementById("notification");
  if (notification) {
    notification.classList.remove("show");
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300);
  }
}
//=====================================================
// =========== QUẢN LÝ SECTION VÀ NAVIGATION ==========
//=====================================================
// Lấy tên hiển thị của section
function getSectionDisplayName(sectionId) {
  const names = {
    chat: "AI Chat",
    quiz: "Tạo Quiz",
    summary: "Tóm tắt",
    progress: "Sơ đồ thời gian truy cập",
    profile: "Thông tin cá nhân",
    settings: "Cài đặt",
    resources: "Tài liệu",
    courses: "Khóa học",
    "my-quizzes": "Quiz của tôi",
    "course-detail": "Chi tiết khóa học",
  };
  return names[sectionId] || sectionId;
}

// Ẩn tất cả sections
function hideAllSections() {
  const sections = document.querySelectorAll(".section");
  sections.forEach((section) => {
    section.classList.remove("active");
  });
}

// Cập nhật trạng thái button AI Chat
function updateChatButtonState(isActive) {
  const chatButtons = document.querySelectorAll(".nav-btn");
  chatButtons.forEach((button) => {
    if (button.textContent.trim().includes("AI Chat")) {
      if (isActive) {
        button.style.background = "rgba(255, 255, 255, 0.3)";
        button.style.transform = "scale(0.95)";
        button.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.1)";
      } else {
        button.style.background = "rgba(255, 255, 255, 0.1)";
        button.style.transform = "scale(1)";
        button.style.boxShadow = "none";
      }
    }
  });
}

// Toggle chat section
function toggleChat() {
  const chatSection = document.getElementById("chat");
  const homeSection = document.getElementById("home");

  if (!chatSection || !homeSection) {
    console.error("Không tìm thấy chat section hoặc home section");
    return;
  }
  if (!requireAuth(null, getSectionDisplayName("chat"))) {
    return;
  }
  if (isChatVisible) {
    chatSection.classList.remove("active");
    homeSection.classList.add("active");
    isChatVisible = false;
    updateChatButtonState(false);
  } else {
    hideAllSections();
    chatSection.classList.add("active");
    isChatVisible = true;
    updateChatButtonState(true);
    initializeChatContent();
    setTimeout(() => {
      const chatInput = document.getElementById("user-input");
      if (chatInput) {
        chatInput.focus();
      }
    }, 100);
  }
  closeUserDropdown();
}

// Hiển thị section
function showSection(id) {
  const protectedSections = [
    "chat",
    "quiz",
    "summary",
    "progress",
    "profile",
    "settings",
    "resources",
    "courses",
    "course-detail",
  ];
  if (id === "chat") {
    toggleChat();
    return;
  }
  // Kiểm tra quyền truy cập
  if (protectedSections.includes(id)) {
    if (!requireAuth(null, getSectionDisplayName(id))) {
      return;
    }
  }
  // Ẩn chat nếu đang hiển thị
  if (isChatVisible) {
    isChatVisible = false;
    updateChatButtonState(false);
  }
  // Hiển thị section được chọn
  hideAllSections();
  const targetSection = document.getElementById(id);
  if (targetSection) {
    targetSection.classList.add("active");
  }
  closeUserDropdown();
  if (id === "quiz") {
    // Reset quiz
    clearContent();
    document.getElementById("file-input").value = "";
    document.getElementById("file-info").classList.add("hidden");
    document.getElementById("quiz-display").classList.add("hidden");
    document.getElementById("quiz-results").classList.add("hidden");
    showContentMethod("file");
  } else if (id === "summary") {
    // Reset summary
    const summaryInput = document.getElementById("summary-input");
    const summaryResult = document.getElementById("summary-result");
    if (summaryInput) summaryInput.value = "";
    if (summaryResult) summaryResult.classList.add("hidden");
  } else if (id === "courses") {
    setTimeout(() => loadCourses(), 100);
  } else if (id === "progress") {
    setTimeout(() => loadTimelineData(), 100);
  }
}
// Khởi tạo trạng thái chat ban đầu
function initializeChatState() {
  const chatSection = document.getElementById("chat");
  const homeSection = document.getElementById("home");

  if (chatSection && homeSection) {
    chatSection.classList.remove("active");
    homeSection.classList.add("active");
    isChatVisible = false;
    updateChatButtonState(false);
  }
}

function closeUserDropdown() {
  const dropdown = document.querySelector(".user-dropdown");
  if (dropdown) {
    dropdown.classList.remove("show");
  }
}
// Kiểm tra quyền truy cập
function requireAuth(callback, feature = "tính năng này") {
  if (!isLoggedIn) {
    showNotification(`Bạn cần đăng nhập để sử dụng ${feature}!`, "warning");
    showModal("login");
    return false;
  }
  if (callback) callback();
  return true;
}
//=====================================================
// ================ XÁC THỰC NGƯỜI DÙNG ===============
//=====================================================
async function register(name, email, password, confirmPassword) {
  if (!name || !email || !password || !confirmPassword) {
    showNotification("Vui lòng điền đầy đủ thông tin", "error");
    return null;
  }
  if (password !== confirmPassword) {
    showNotification("Mật khẩu xác nhận không khớp", "error");
    return null;
  }
  if (password.length < 6) {
    showNotification("Mật khẩu phải có ít nhất 6 ký tự", "error");
    return null;
  }
  if (!supabase) {
    showNotification("Lỗi kết nối cơ sở dữ liệu", "error");
    return null;
  }
  try {
    const { data: existingProfile, error: checkError } = await supabase
      .from("profiles")
      .select("email")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();
    if (existingProfile) {
      showNotification("Email này đã được đăng ký", "error");
      return null;
    }
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password: password,
      options: {
        data: { name: name.trim() },
        emailRedirectTo: undefined,
      },
    });
    if (authError) {
      console.error("Lỗi xác thực:", authError);
      if (authError.message.includes("already registered")) {
        showNotification("Email này đã được đăng ký", "error");
      } else {
        showNotification(`Lỗi đăng ký: ${authError.message}`, "error");
      }
      return null;
    }
    if (!authData.user) {
      showNotification("Đăng ký không thành công", "error");
      return null;
    }
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=667eea&color=fff&size=128`;
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const profileData = {
      id: authData.user.id,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      avatar: avatarUrl,
      created_at: new Date().toISOString(),
    };
    const { data: insertedProfile, error: profileError } = await supabase
      .from("profiles")
      .insert([profileData])
      .select()
      .single();
    if (profileError) {
      console.error("Lỗi tạo profile:", profileError);
      if (profileError.code === "23505") {
        showNotification("Email này đã được sử dụng", "error");
      } else {
        showNotification(
          `Lỗi tạo thông tin cá nhân: ${profileError.message}`,
          "error"
        );
      }
      return null;
    }

    currentUser = insertedProfile;
    isLoggedIn = true;
    await initializeUserTimeline();
    updateAuthUI();
    return {
      id: authData.user.id,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      avatar: avatarUrl,
    };
  } catch (error) {
    console.error("Lỗi đăng ký:", error);
    showNotification("Có lỗi xảy ra khi đăng ký", "error");
    return null;
  }
}
// Xử lý form đăng ký
async function handleRegister(event) {
  event.preventDefault();
  const form = event.target;
  const name = form.querySelector('input[type="text"]').value.trim();
  const email = form.querySelector('input[type="email"]').value.trim();
  const passwords = form.querySelectorAll('input[type="password"]');
  const password = passwords[0].value;
  const confirmPassword = passwords[1].value;
  const submitBtn = form.querySelector('button[type="submit"]');
  if (!submitBtn) return;
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML =
    '<i class="fas fa-spinner fa-spin"></i> Đang đăng ký...';
  submitBtn.disabled = true;
  try {
    const user = await register(name, email, password, confirmPassword);
    if (user) {
      hideModal("register");
      form.reset();
      showNotification("Đăng ký thành công! Bạn đã được đăng nhập.", "success");
    }
  } catch (error) {
    console.error("Lỗi xử lý đăng ký:", error);
    showNotification("Có lỗi xảy ra khi đăng ký", "error");
  } finally {
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
}
// ĐĂNG NHẬP
async function login(email, password) {
  if (!email || !password) {
    showNotification("Email và mật khẩu không được để trống", "error");
    return null;
  }
  if (!supabase) {
    showNotification("Lỗi kết nối cơ sở dữ liệu", "error");
    return null;
  }
  try {
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: password,
      });
    if (authError) {
      console.error("Lỗi đăng nhập:", authError);
      if (authError.message.includes("Invalid login credentials")) {
        showNotification("Email hoặc mật khẩu không đúng", "error");
      } else {
        showNotification(`Lỗi đăng nhập: ${authError.message}`, "error");
      }
      return null;
    }
    if (!authData.user) {
      showNotification("Đăng nhập không thành công", "error");
      return null;
    }
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .single();
    if (profileError) {
      console.error("Lỗi lấy profile:", profileError);
      const defaultName = authData.user.email.split("@")[0];
      const defaultProfile = {
        id: authData.user.id,
        name: defaultName,
        email: authData.user.email,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          defaultName
        )}&background=667eea&color=fff&size=128`,
        created_at: new Date().toISOString(),
      };
      const { data: newProfile, error: insertError } = await supabase
        .from("profiles")
        .insert([defaultProfile])
        .select()
        .single();
      if (insertError) {
        console.error("Lỗi tạo profile:", insertError);
        showNotification("Lỗi tạo thông tin cá nhân", "error");
        return null;
      }
      currentUser = newProfile;
    } else {
      currentUser = profileData;
    }
    isLoggedIn = true;
    await loadUserTimeline();
    updateAuthUI();
    return currentUser;
  } catch (error) {
    console.error("Lỗi quá trình đăng nhập:", error);
    showNotification("Có lỗi xảy ra khi đăng nhập", "error");
    return null;
  }
}
// Xử lý form đăng nhập
async function handleLogin(event) {
  event.preventDefault();
  const form = event.target;
  const email = form.querySelector('input[type="email"]').value.trim();
  const password = form.querySelector('input[type="password"]').value;
  const submitBtn = form.querySelector('button[type="submit"]');

  if (!submitBtn) return;
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML =
    '<i class="fas fa-spinner fa-spin"></i> Đang đăng nhập...';
  submitBtn.disabled = true;
  try {
    const user = await login(email, password);
    if (user) {
      hideModal("login");
      showNotification(`Chào mừng ${user.name}!`, "success");
      form.reset();
    }
  } catch (error) {
    console.error("Lỗi xử lý đăng nhập:", error);
    showNotification("Có lỗi xảy ra khi đăng nhập", "error");
  } finally {
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
}

// ĐĂNG XUẤT
async function logout() {
  try {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Lỗi đăng xuất:", error);
      }
    }
  } catch (error) {
    console.error("Lỗi quá trình đăng xuất:", error);
  }

  // Reset
  isLoggedIn = false;
  currentUser = null;
  conversationHistory = [];
  currentChatSessionId = null;
  currentQuestions = [];
  currentContent = "";
  currentQuizSessionId = null;
  currentChatFileContent = "";
  currentChatFileName = "";

  // Reset tiến độ người dùng
  userTimeline = {
    totalVisits: 0,
    totalTime: 0,
    uniquePages: new Set(),
    activeDays: new Set(),
    accessHistory: [],
  };
  // Ẩn chat nếu đang hiển thị
  if (isChatVisible) {
    isChatVisible = false;
    updateChatButtonState(false);
  }
  updateAuthUI();
  showNotification("Đăng xuất thành công!", "success");
  showSection("home");
  loadChatHistorySidebar();
}

// Cập nhật giao diện theo trạng thái đăng nhập
function updateAuthUI() {
  const authButtons = document.querySelector(".auth-button");
  let userMenu = document.getElementById("user-menu");
  if (isLoggedIn && currentUser) {
    if (authButtons) {
      authButtons.style.display = "none";
    }
    if (!userMenu) {
      const headerContent = document.querySelector(".header-content");
      if (headerContent) {
        userMenu = document.createElement("div");
        userMenu.id = "user-menu";
        userMenu.className = "user-menu";
        userMenu.style.cssText = `
          display: flex;
          align-items: center;
          gap: 12px;
          color: white;
        `;
        headerContent.appendChild(userMenu);
      }
    }

    if (userMenu) {
      userMenu.innerHTML = `
        <img src="${currentUser.avatar}" alt="Avatar" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
        <div>
          <p style="font-weight: 500; margin: 0;">${currentUser.name}</p>
          <p style="font-size: 12px; opacity: 0.8; margin: 0;">${currentUser.email}</p>
        </div>
        <button onclick="logout()" style="padding: 6px 12px; background: rgba(255,255,255,0.2); border: none; color: white; border-radius: 8px; cursor: pointer; margin-left: 12px; transition: background 0.3s;">
          <i class="fas fa-sign-out-alt"></i> Đăng xuất
        </button>
      `;
    }
  } else {
    if (authButtons) {
      authButtons.style.display = "flex";
    }
    if (userMenu) {
      userMenu.remove();
    }
  }
}

// Kiểm tra trạng thái đăng nhập
async function checkAuthStatus() {
  if (!supabase) {
    console.error("Supabase chưa được khởi tạo");
    return;
  }
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) {
      console.error("Lỗi kiểm tra session:", error);
      return;
    }
    if (session && session.user) {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (!profileError && profileData) {
        currentUser = profileData;
        isLoggedIn = true;
        await loadUserTimeline();
        updateAuthUI();
        await loadChatHistorySidebar();
      }
    }
  } catch (error) {
    console.error("Lỗi kiểm tra trạng thái xác thực:", error);
  }
}

// Lắng nghe thay đổi trạng thái xác thực
function setupAuthListener() {
  if (!supabase) return;

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_OUT") {
      isLoggedIn = false;
      currentUser = null;
      if (isChatVisible) {
        isChatVisible = false;
        updateChatButtonState(false);
      }
      updateAuthUI();
    } else if (event === "SIGNED_IN" && session) {
      await checkAuthStatus();
    }
  });
}
//=====================================================
// ========= CHỨC NĂNG CHAT FILE UPLOAD ===============
//=====================================================
// Xử lý upload file trong chat
async function handleChatFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  console.log("Chat file uploaded:", file.name, file.type);
  const chatFileName = document.getElementById("chat-file-name");
  const chatFileSize = document.getElementById("chat-file-size");
  const chatFileInfo = document.getElementById("chat-file-info");

  if (chatFileName) chatFileName.textContent = file.name;
  if (chatFileSize) chatFileSize.textContent = formatFileSize(file.size);
  if (chatFileInfo) chatFileInfo.classList.remove("hidden");
  const fileType = file.name.split(".").pop().toLowerCase();
  let textContent = "";
  try {
    if (fileType === "txt") {
      textContent = await file.text();
    } else if (fileType === "pdf") {
      if (typeof pdfjsLib === "undefined") {
        throw new Error("PDF.js chưa được tải. Vui lòng thử định dạng khác.");
      }
      textContent = await extractTextFromPDF(file);
    } else if (fileType === "docx") {
      if (typeof mammoth === "undefined") {
        throw new Error(
          "Mammoth.js chưa được tải. Vui lòng thử định dạng khác."
        );
      }
      textContent = await extractTextFromDOCX(file);
    } else {
      throw new Error(
        `Không hỗ trợ định dạng: ${fileType}. Chỉ hỗ trợ .txt, .pdf, .docx`
      );
    }

    // Gán nội dung file
    currentChatFileContent = textContent;
    currentChatFileName = file.name;

    console.log("Chat file content extracted, length:", textContent.length);
    showNotification("Đã đính kèm file thành công!", "success");

    // Cập nhật placeholder cho input - KHÔNG tự động tóm tắt
    const userInput = document.getElementById("user-input");
    if (userInput) {
      userInput.placeholder = `Hỏi về file "${file.name}" hoặc nhập câu hỏi khác...`;
    }
  } catch (err) {
    console.error("Lỗi đọc file chat:", err);
    showNotification(`Lỗi khi đọc file: ${err.message}`, "error");
    clearChatFile();
  }
}

// Xóa file
function clearChatFile() {
  const chatFileInput = document.getElementById("chat-file-input");
  const chatFileInfo = document.getElementById("chat-file-info");
  const userInput = document.getElementById("user-input");

  if (chatFileInput) chatFileInput.value = "";
  if (chatFileInfo) chatFileInfo.classList.add("hidden");
  if (userInput)
    userInput.placeholder = "Hỏi tôi bất cứ điều gì hoặc đính kèm file...";

  currentChatFileContent = "";
  currentChatFileName = "";
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (
    Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  );
}
//=====================================================
// ================= CHỨC NĂNG CHAT ===================
//=====================================================
// Cuộn xuống cuối chat
function scrollToBottom(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    setTimeout(() => {
      element.scrollTop = element.scrollHeight;
    }, 100);
  }
}

// Thêm tin nhắn vào chat
function addMessageToChat(message, sender, isTemporary = false) {
  const chatMessages = document.querySelector(".chat-messages");
  if (!chatMessages) {
    console.error("Không tìm thấy .chat-messages container");
    return;
  }
  const messageDiv = document.createElement("div");
  messageDiv.className = "message-group";
  const bubbleDiv = document.createElement("div");
  bubbleDiv.className = `chat-bubble ${sender}-msg`;
  let displayHTML = "";
  if (message.includes("📎") && sender === "user") {
    const lines = message.split("\n");
    const fileLine = lines[0];
    const textContent = lines.slice(1).join("\n");
    displayHTML = `
      <div class="file-attachment">
        <i class="fas fa-paperclip"></i>
        <span class="file-name">${fileLine.replace("📎 ", "")}</span>
      </div>
      ${textContent ? `<p>${textContent.replace(/\n/g, "<br>")}</p>` : ""}
    `;
  } else {
    displayHTML = `<p>${message.replace(/\n/g, "<br>")}</p>`;
  }
  bubbleDiv.innerHTML = displayHTML;
  if (isTemporary) {
    bubbleDiv.id = "temp-ai-message";
  }
  messageDiv.appendChild(bubbleDiv);
  chatMessages.appendChild(messageDiv);
  scrollToBottom("chat-container");
}

// Khởi tạo nội dung chat
function initializeChatContent() {
  const chatMessages = document.querySelector(".chat-messages");
  if (chatMessages) {
    chatMessages.innerHTML = "";
  }
  conversationHistory = [
    {
      role: "assistant",
      content:
        "Xin chào! Tôi là trợ lý AI của bạn. Hôm nay bạn muốn học gì? Bạn có thể hỏi về bất kỳ môn học nào hoặc đính kèm file để tôi giúp bạn phân tích!",
    },
  ];
  currentChatSessionId = null;
  addMessageToChat(conversationHistory[0].content, "ai");
}

// Gửi tin nhắn
async function sendMessage() {
  const input = document.getElementById("user-input");
  if (!input) {
    console.error("Không tìm thấy input element");
    return;
  }
  const userMessage = input.value.trim();
  if (!userMessage && !currentChatFileContent) {
    showNotification("Vui lòng nhập tin nhắn hoặc đính kèm file!", "warning");
    return;
  }
  if (!requireAuth(null, "AI Chat")) {
    return;
  }
  let displayMessage = "";
  let fullMessage = userMessage;
  if (currentChatFileContent) {
    if (userMessage) {
      // Có cả file và câu hỏi
      displayMessage = `📎 ${currentChatFileName}\n${userMessage}`;
      fullMessage = `Câu hỏi về file "${currentChatFileName}": ${userMessage}\n\nNội dung file:\n${currentChatFileContent}`;
    } else {
      // Chỉ có file, không có câu hỏi
      showNotification("Vui lòng nhập câu hỏi về file đã đính kèm!", "warning");
      return;
    }
  } else {
    displayMessage = userMessage;
    fullMessage = userMessage;
  }
  // lưu trò chuyện
  conversationHistory.push({ role: "user", content: fullMessage });
  addMessageToChat(displayMessage, "user");
  input.value = "";
  // Xóa file sau khi gửi
  if (currentChatFileContent) {
    clearChatFile();
  }
  addMessageToChat("AI đang trả lời...", "ai", true);
  try {
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "Learn With AI App",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: conversationHistory,
        stream: false,
      }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Lỗi API: ${response.status} - ${
          errorData.message || response.statusText
        }`
      );
    }
    const data = await response.json();
    const aiResponseContent =
      data.choices?.[0]?.message?.content ||
      "Xin lỗi, tôi không thể tạo phản hồi lúc này.";

    const tempMessage = document.getElementById("temp-ai-message");
    if (tempMessage && tempMessage.parentNode) {
      tempMessage.parentNode.remove();
    }

    conversationHistory.push({ role: "assistant", content: aiResponseContent });
    addMessageToChat(aiResponseContent, "ai");

    await trackWebAccess("chat_message", { messageLength: userMessage.length });
    await saveChatHistory();
  } catch (error) {
    console.error("Lỗi gửi tin nhắn tới AI:", error);

    const tempMessage = document.getElementById("temp-ai-message");
    if (tempMessage && tempMessage.parentNode) {
      tempMessage.parentNode.remove();
    }
    addMessageToChat(
      "Đã xảy ra lỗi khi kết nối với AI. Vui lòng thử lại sau.",
      "ai"
    );
    showNotification("Đã xảy ra lỗi khi kết nối với AI.", "error");
  }
}

// Lưu lịch sử chat
async function saveChatHistory() {
  if (!isLoggedIn || !currentUser || conversationHistory.length === 0) {
    return;
  }
  const messagesToSave = conversationHistory.filter(
    (msg) => msg.role !== "temporary"
  );
  try {
    if (currentChatSessionId) {
      const { data, error } = await supabase
        .from("chat_history")
        .update({ messages: messagesToSave })
        .eq("id", currentChatSessionId)
        .eq("user_id", currentUser.id);
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from("chat_history")
        .insert({ user_id: currentUser.id, messages: messagesToSave })
        .select()
        .single();

      if (error) throw error;
      currentChatSessionId = data.id;
      showNotification("Đã lưu đoạn chat mới!", "success");
      loadChatHistorySidebar();
    }
  } catch (error) {
    console.error("Lỗi lưu lịch sử trò chuyện:", error);
    showNotification("Lỗi lưu lịch sử trò chuyện.", "error");
  }
}

// Load lịch sử chat sidebar
async function loadChatHistorySidebar() {
  const chatHistoryDiv = document.querySelector(".chat-history");
  if (!chatHistoryDiv || !isLoggedIn || !currentUser) {
    if (chatHistoryDiv)
      chatHistoryDiv.innerHTML = "<p>Đăng nhập để xem lịch sử.</p>";
    return;
  }
  chatHistoryDiv.innerHTML =
    '<p><i class="fas fa-spinner fa-spin"></i> Đang tải lịch sử...</p>';
  try {
    const { data, error } = await supabase
      .from("chat_history")
      .select("id, messages, created_at")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    chatHistoryDiv.innerHTML = "";

    if (data.length === 0) {
      chatHistoryDiv.innerHTML = "<p>Chưa có lịch sử trò chuyện nào.</p>";
      return;
    }

    data.forEach((session) => {
      const firstMessage =
        session.messages.find((msg) => msg.role === "user")?.content ||
        "Đoạn chat mới";
      const date = new Date(session.created_at).toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const chatItem = document.createElement("button");
      chatItem.className = "chat-history-item";
      chatItem.innerHTML = `
        <div class="chat-history-item-content">
          <p class="chat-history-title">${firstMessage.substring(0, 30)}${
        firstMessage.length > 30 ? "..." : ""
      }</p>
          <span class="chat-history-date">${date}</span>
        </div>
        <button class="delete-chat-btn" data-id="${
          session.id
        }"><i class="fas fa-trash"></i></button>
      `;
      chatItem.onclick = () => loadChatSession(session.id);
      chatHistoryDiv.appendChild(chatItem);
    });
    // Thêm event listener cho nút xóa
    chatHistoryDiv.querySelectorAll(".delete-chat-btn").forEach((button) => {
      button.onclick = (e) => {
        e.stopPropagation();
        deleteChatSession(button.dataset.id);
      };
    });
  } catch (error) {
    console.error("Lỗi tải lịch sử chat sidebar:", error);
    chatHistoryDiv.innerHTML = "<p>Lỗi tải lịch sử trò chuyện.</p>";
  }
}

async function loadChatSession(sessionId) {
  if (!isLoggedIn || !currentUser) {
    showNotification("Bạn cần đăng nhập để xem lịch sử trò chuyện.", "warning");
    return;
  }
  try {
    const { data, error } = await supabase
      .from("chat_history")
      .select("messages")
      .eq("id", sessionId)
      .eq("user_id", currentUser.id)
      .single();
    if (error) throw error;
    if (data && data.messages) {
      conversationHistory = data.messages;
      currentChatSessionId = sessionId;

      const chatMessages = document.querySelector(".chat-messages");
      if (chatMessages) {
        chatMessages.innerHTML = "";
      }
      conversationHistory.forEach((msg) => {
        addMessageToChat(msg.content, msg.role);
      });
      showNotification("Đã tải lịch sử trò chuyện!", "info");
      scrollToBottom("chat-container");
    } else {
      showNotification("Không tìm thấy đoạn chat này.", "error");
    }
  } catch (error) {
    console.error("Lỗi tải phiên chat:", error);
    showNotification("Lỗi tải đoạn chat.", "error");
  }
}

async function deleteChatSession(sessionId) {
  if (!confirm("Bạn có chắc chắn muốn xóa đoạn chat này?")) {
    return;
  }
  try {
    const { error } = await supabase
      .from("chat_history")
      .delete()
      .eq("id", sessionId)
      .eq("user_id", currentUser.id);

    if (error) throw error;
    showNotification("Đã xóa đoạn chat!", "success");
    loadChatHistorySidebar();
    if (currentChatSessionId === sessionId) {
      startNewChat();
    }
  } catch (error) {
    console.error("Lỗi xóa phiên chat:", error);
    showNotification("Lỗi xóa đoạn chat.", "error");
  }
}

// Tạo chat mới
async function startNewChat() {
  // Lưu chat hiện tại
  if (currentChatSessionId && conversationHistory.length > 1) {
    await saveChatHistory();
  }
  clearChatFile();
  initializeChatContent();
  await saveChatHistory();
  showNotification("Đã tạo đoạn chat mới!", "info");
  loadChatHistorySidebar();
}
//=====================================================
// ================= CHỨC NĂNG QUIZ ===================
//=====================================================
// Hiển thị phương thức nhập nội dung
function showContentMethod(method) {
  if (!requireAuth(null, "tạo Quiz")) return;
  document.querySelectorAll(".method-tab").forEach((tab) => {
    tab.classList.remove("active");
  });
  document.getElementById(method + "-tab").classList.add("active");
  // Hiển thị method được chọn
  document
    .querySelectorAll(".content-method")
    .forEach((el) => el.classList.add("hidden"));
  document.getElementById(method + "-method").classList.remove("hidden");
  // Hiển thị/ẩn controls tạo quiz
  const quizCreationControls = document.getElementById(
    "quiz-creation-controls"
  );
  if (method === "file" || method === "text") {
    quizCreationControls.classList.remove("hidden");
    clearContent();
  } else {
    quizCreationControls.classList.add("hidden");
  }
  // Xử lý đặc biệt cho tab "Quiz của tôi"
  if (method === "my-quizzes") {
    loadUserQuizzes();
    document.getElementById("quiz-display")?.classList.add("hidden");
    document.getElementById("quiz-results")?.classList.add("hidden");
  } else {
    document.getElementById("quiz-display")?.classList.add("hidden");
    document.getElementById("quiz-results")?.classList.add("hidden");
  }
  updateGenerateButton();
}

async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  for (let i = 0; i < pdf.numPages; i++) {
    const page = await pdf.getPage(i + 1);
    const content = await page.getTextContent();
    const text = content.items.map((item) => item.str).join(" ");
    fullText += text + "\n";
  }
  return fullText;
}

async function extractTextFromDOCX(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

// Xử lý upload file
async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  console.log("File uploaded:", file.name, file.type);
  const fileName = document.getElementById("file-name");
  const fileInfo = document.getElementById("file-info");
  fileInfo?.classList.remove("hidden");
  if (fileName) fileName.textContent = file.name;
  const fileType = file.name.split(".").pop().toLowerCase();
  let textContent = "";
  try {
    if (fileType === "txt") {
      textContent = await file.text();
    } else if (fileType === "pdf") {
      // Kiểm tra xem PDF.js có được load không
      if (typeof pdfjsLib === "undefined") {
        throw new Error("PDF.js chưa được tải. Vui lòng thử định dạng khác.");
      }
      textContent = await extractTextFromPDF(file);
    } else if (fileType === "docx") {
      // Kiểm tra xem mammoth có được load không
      if (typeof mammoth === "undefined") {
        throw new Error(
          "Mammoth.js chưa được tải. Vui lòng thử định dạng khác."
        );
      }
      textContent = await extractTextFromDOCX(file);
    } else {
      throw new Error(
        `Không hỗ trợ định dạng: ${fileType}. Chỉ hỗ trợ .txt, .pdf, .docx`
      );
    }
    // Gán nội dung cho Quiz
    currentContent = textContent;
    console.log("File content extracted, length:", textContent.length);

    showNotification("Tải và đọc nội dung thành công!", "success");
    updateGenerateButton();
  } catch (err) {
    console.error("Lỗi đọc file:", err);
    showNotification(`Lỗi khi đọc file: ${err.message}`, "error");
    currentContent = "";
    updateGenerateButton();
  }
}
function clearFile() {
  document.getElementById("file-input").value = "";
  document.getElementById("file-info").classList.add("hidden");
  currentContent = "";
}

// Xử lý nhập nội dung text
function handleContentInput(e) {
  if (!isLoggedIn) {
    e.target.value = "";
    requireAuth(null, "nhập nội dung");
    return;
  }
  const text = e.target.value;
  document.getElementById("char-count").textContent = `${text.length}/5000`;
  currentContent = text;
  console.log("Content updated, length:", text.length);
  updateGenerateButton();
}

// Xóa nội dung
function clearContent() {
  currentContent = "";
  const contentInput = document.getElementById("content-input");
  const charCount = document.getElementById("char-count");
  if (contentInput) contentInput.value = "";
  if (charCount) charCount.textContent = "0/5000";
  updateGenerateButton();
}

function updateGenerateButton() {
  const btn = document.getElementById("generate-btn");
  if (!btn) {
    console.error("Không tìm thấy nút generate-btn");
    return;
  }
  const fileMethodActive = !document
    .getElementById("file-method")
    ?.classList.contains("hidden");
  const textMethodActive = !document
    .getElementById("text-method")
    ?.classList.contains("hidden");
  const questionCount = Number.parseInt(
    document.getElementById("question-count")?.value || "5"
  );
  console.log("File method active:", fileMethodActive);
  console.log("Text method active:", textMethodActive);
  console.log("Current content length:", currentContent?.length || 0);
  console.log("Is logged in:", isLoggedIn);
  console.log("Question count:", questionCount);

  if (!isLoggedIn) {
    btn.disabled = true;
    btn.className = "generate-btn disabled";
    btn.innerHTML = "🔒 Đăng nhập để tạo Quiz";
    return;
  }
  if (
    (fileMethodActive || textMethodActive) &&
    currentContent &&
    currentContent.trim().length > 0
  ) {
    btn.disabled = false;
    btn.className = "generate-btn";
    btn.innerHTML = `🚀 Tạo ${questionCount} câu hỏi từ nội dung`;
    console.log("Button enabled");
  } else {
    btn.disabled = true;
    btn.className = "generate-btn disabled";
    btn.innerHTML = "🤖 Vui lòng thêm nội dung trước";
    console.log("Button disabled - no content");
  }
}

// Tạo quiz bằng AI
async function generateQuiz() {
  console.log("generateQuiz called");
  if (!requireAuth(null, "tạo Quiz")) {
    console.log("Auth required - user not logged in");
    return;
  }
  if (!currentContent || !currentContent.trim()) {
    console.log("No content available:", currentContent);
    showNotification("Vui lòng thêm nội dung hoặc tải file trước!", "warning");
    return;
  }
  console.log(
    "Starting quiz generation with content length:",
    currentContent.length
  );
  const difficulty =
    document.getElementById("quiz-difficulty")?.value || "medium";
  const count = Number.parseInt(
    document.getElementById("question-count")?.value || "5"
  );
  if (count < 1 || count > 50) {
    showNotification("Số câu hỏi phải từ 1 đến 50!", "warning");
    return;
  }
  console.log("Quiz settings:", { difficulty, count });
  const btn = document.getElementById("generate-btn");
  if (btn) {
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Đang tạo ${count} câu hỏi...`;
    btn.disabled = true;
  }
  try {
    if (!API_BASE_URL || !OPENROUTER_API_KEY || !AI_MODEL) {
      throw new Error("Thiếu cấu hình API");
    }

    const prompt = `Bạn là một chuyên gia tạo câu hỏi trắc nghiệm. Hãy tạo CHÍNH XÁC ${count} câu hỏi trắc nghiệm với độ khó "${difficulty}" dựa trên nội dung sau.

YÊU CẦU BẮT BUỘC:
- Tạo ĐÚNG ${count} câu hỏi, không nhiều hơn, không ít hơn
- Mỗi câu hỏi phải có 4 lựa chọn (A, B, C, D)
- Chỉ có 1 đáp án đúng cho mỗi câu hỏi
- Câu hỏi phải liên quan trực tiếp đến nội dung được cung cấp

ĐỊNH DẠNG JSON BẮT BUỘC:
[
  {
    "question": "Câu hỏi 1?",
    "options": ["Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D"],
    "correct_answer_index": 0
  },
  {
    "question": "Câu hỏi 2?", 
    "options": ["Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D"],
    "correct_answer_index": 1
  }
]

NỘI DUNG HỌC LIỆU:
${currentContent.substring(0, 4000)}

Hãy tạo CHÍNH XÁC ${count} câu hỏi và trả về JSON array hợp lệ:`;

    console.log("Sending request to AI API...");
    const messages = [{ role: "user", content: prompt }];
    // Gọi API AI
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "Learn With AI App - Quiz",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: messages,
        stream: false,
        max_tokens: Math.min(4000, count * 200),
        temperature: 0.3,
      }),
    });

    console.log("API Response status:", response.status);
    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: "Unknown error" }));
      throw new Error(
        `Lỗi API: ${response.status} - ${
          errorData.message || response.statusText
        }`
      );
    }
    const data = await response.json();
    console.log("API Response data:", data);
    const aiResponseContent = data.choices?.[0]?.message?.content || "[]";
    console.log("AI Response content:", aiResponseContent);
    try {
      let questions = [];
      let jsonString = aiResponseContent.trim();
      const jsonMatch = jsonString.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      }
      jsonString = jsonString
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .replace(/^\s*[\r\n]/gm, "")
        .trim();
      console.log("Cleaned JSON string:", jsonString);
      const parsedQuestions = JSON.parse(jsonString);
      // Kiểm tra tính hợp lệ
      if (!Array.isArray(parsedQuestions)) {
        throw new Error("AI không trả về mảng câu hỏi hợp lệ");
      }
      // Lọc và validate câu hỏi nghiêm ngặt hơn
      questions = parsedQuestions
        .filter((q, index) => {
          const isValid =
            q &&
            typeof q.question === "string" &&
            q.question.trim().length > 0 &&
            Array.isArray(q.options) &&
            q.options.length === 4 &&
            q.options.every(
              (opt) => typeof opt === "string" && opt.trim().length > 0
            ) &&
            typeof q.correct_answer_index === "number" &&
            q.correct_answer_index >= 0 &&
            q.correct_answer_index < 4;

          if (!isValid) {
            console.warn(`Question ${index + 1} is invalid:`, q);
          }
          return isValid;
        })
        .slice(0, count);
      console.log(
        `Generated ${questions.length} valid questions out of ${count} requested`
      );
      if (questions.length === 0) {
        throw new Error("AI không tạo được câu hỏi hợp lệ từ nội dung này");
      }
      if (questions.length < count) {
        console.warn(`Chỉ tạo được ${questions.length}/${count} câu hỏi`);
        showNotification(
          `Chỉ tạo được ${questions.length}/${count} câu hỏi từ nội dung này. Hãy thử với nội dung dài hơn hoặc giảm số câu hỏi.`,
          "warning"
        );
      }
      currentQuestions = questions;
      // Lưu vào database
      if (supabase && currentUser) {
        try {
          const { data: quizData, error: quizError } = await supabase
            .from("user_quizzes")
            .insert({
              user_id: currentUser.id,
              original_content: currentContent,
              difficulty: difficulty,
              question_count: count,
              questions: currentQuestions,
              score: null,
              total_questions: currentQuestions.length,
            })
            .select()
            .single();
          if (quizError) {
            console.error("Supabase error:", quizError);
          } else {
            currentQuizSessionId = quizData.id;
            console.log("Quiz saved to database with ID:", quizData.id);
          }
        } catch (dbError) {
          console.error("Database save error:", dbError);
        }
      }

      displayQuiz();
      showNotification(
        `Quiz đã được tạo thành công với ${currentQuestions.length} câu hỏi!`,
        "success"
      );

      if (typeof trackWebAccess === "function") {
        await trackWebAccess("quiz_created", {
          difficulty,
          requestedCount: count,
          actualCount: currentQuestions.length,
        });
      }
    } catch (parseError) {
      console.error("Lỗi xử lý phản hồi AI:", parseError);
      console.log("Raw AI response:", aiResponseContent);
      showNotification(
        "Lỗi xử lý phản hồi AI. Vui lòng thử lại với nội dung khác.",
        "error"
      );

      // Reset quiz
      currentQuestions = [];
      document.getElementById("quiz-display")?.classList.add("hidden");
      document.getElementById("quiz-results")?.classList.add("hidden");
    }
  } catch (error) {
    console.error("Lỗi tạo quiz với AI:", error);
    showNotification(`Đã xảy ra lỗi khi tạo Quiz: ${error.message}`, "error");

    // Reset quiz
    currentQuestions = [];
    document.getElementById("quiz-display")?.classList.add("hidden");
    document.getElementById("quiz-results")?.classList.add("hidden");
  } finally {
    // Khôi phục trạng thái button
    if (btn) {
      btn.innerHTML = "🚀 Tạo Quiz từ nội dung";
      btn.disabled = false;
      updateGenerateButton();
    }
  }
}

// Hiển thị quiz
function displayQuiz() {
  const container = document.getElementById("quiz-content");
  if (!container) return;
  container.innerHTML = "";

  currentQuestions.forEach((q, i) => {
    const div = document.createElement("div");
    div.className = "quiz-question";
    div.innerHTML = `
      <h3 class="question-title">${i + 1}. ${q.question}</h3>
      <div class="question-options">
        ${q.options
          .map(
            (opt, j) => `
          <label class="option-label">
            <input type="radio" name="q${i}" value="${j}" class="option-input">
            <span class="option-text">${opt}</span>
          </label>
        `
          )
          .join("")}
      </div>
    `;
    container.appendChild(div);
  });

  document.getElementById("quiz-display")?.classList.remove("hidden");
  document.getElementById("quiz-results")?.classList.add("hidden");
}

// Nộp bài quiz
async function submitQuiz() {
  if (!requireAuth(null, "nộp bài Quiz")) return;
  if (!currentQuizSessionId || currentQuestions.length === 0) {
    showNotification("Không có quiz nào để nộp.", "warning");
    return;
  }

  let score = 0;
  const userAnswers = [];

  // Tính điểm
  currentQuestions.forEach((q, i) => {
    const selected = document.querySelector(`input[name="q${i}"]:checked`);
    const selectedOptionIndex = selected ? Number.parseInt(selected.value) : -1;

    userAnswers.push({
      question_index: i,
      selected_option_index: selectedOptionIndex,
    });

    if (selectedOptionIndex === q.correct_answer_index) {
      score++;
    }
  });

  // Hiển thị kết quả
  const scoreElement = document.getElementById("score");
  const totalElement = document.getElementById("total");
  const feedbackElement = document.getElementById("feedback");

  if (scoreElement) scoreElement.textContent = score;
  if (totalElement) totalElement.textContent = currentQuestions.length;

  const percentage = (score / currentQuestions.length) * 100;

  // Feedback dựa trên điểm số
  if (feedbackElement) {
    if (percentage >= 80) {
      feedbackElement.textContent =
        "🎉 Xuất sắc! Bạn đã hiểu rất tốt nội dung!";
    } else if (percentage >= 60) {
      feedbackElement.textContent =
        "👍 Tốt lắm! Bạn nắm được phần lớn kiến thức!";
    } else {
      feedbackElement.textContent = "💪 Hãy đọc lại tài liệu và thử lần nữa!";
    }
  }

  // Chuyển sang màn hình kết quả
  document.getElementById("quiz-display")?.classList.add("hidden");
  document.getElementById("quiz-results")?.classList.remove("hidden");

  try {
    const { data, error } = await supabase
      .from("user_quizzes")
      .update({
        user_answers: userAnswers,
        score: score,
        total_questions: currentQuestions.length,
      })
      .eq("id", currentQuizSessionId)
      .eq("user_id", currentUser.id);

    if (error) throw error;
    showNotification("Kết quả Quiz đã được lưu!", "success");
    await trackWebAccess("quiz_completed", {
      score,
      total: currentQuestions.length,
      percentage,
    });
  } catch (error) {
    console.error("Lỗi lưu kết quả quiz:", error);
    showNotification("Lỗi lưu kết quả Quiz.", "error");
  }
}

// Load danh sách quiz của người dùng
async function loadUserQuizzes() {
  const quizHistoryList = document.querySelector(
    "#my-quizzes-method .my-quizzes-list"
  );
  if (!quizHistoryList || !isLoggedIn || !currentUser) {
    if (quizHistoryList)
      quizHistoryList.innerHTML = "<p>Đăng nhập để xem Quiz của bạn.</p>";
    return;
  }

  quizHistoryList.innerHTML =
    '<p class="loading-message"><i class="fas fa-spinner fa-spin"></i> Đang tải Quiz của bạn...</p>';

  try {
    const { data, error } = await supabase
      .from("user_quizzes")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    quizHistoryList.innerHTML = "";

    if (data.length === 0) {
      quizHistoryList.innerHTML = "<p>Bạn chưa tạo Quiz nào.</p>";
      return;
    }

    // Hiển thị danh sách quiz
    data.forEach((quiz) => {
      const quizItem = document.createElement("div");
      quizItem.className = "my-quiz-item";

      const quizTitle = quiz.original_content
        ? quiz.original_content.substring(0, 100) + "..."
        : "Quiz không tiêu đề";
      const quizDate = new Date(quiz.created_at).toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const scoreDisplay =
        quiz.score !== null
          ? `<span style="color: #10b981; font-weight: bold;">${quiz.score}/${quiz.total_questions}</span>`
          : `<span style="color: #f59e0b;">Chưa nộp bài</span>`;

      quizItem.innerHTML = `
        <div class="my-quiz-item-header">
          <h3 class="my-quiz-title">${quizTitle}</h3>
          <span class="my-quiz-date">${quizDate}</span>
        </div>
        <div class="my-quiz-details">
          <div class="my-quiz-detail-item">Độ khó: <span>${quiz.difficulty}</span></div>
          <div class="my-quiz-detail-item">Số câu hỏi: <span>${quiz.question_count}</span></div>
          <div class="my-quiz-detail-item">Điểm: ${scoreDisplay}</div>
        </div>
        <div class="my-quiz-actions">
          <button class="review-quiz-btn" data-id="${quiz.id}">
            <i class="fas fa-eye"></i> Xem lại
          </button>
          <button class="delete-quiz-btn" data-id="${quiz.id}">
            <i class="fas fa-trash"></i> Xóa
          </button>
        </div>
      `;
      quizHistoryList.appendChild(quizItem);
    });

    // Thêm event listeners
    quizHistoryList.querySelectorAll(".review-quiz-btn").forEach((button) => {
      button.onclick = () => showQuizReview(button.dataset.id);
    });
    quizHistoryList.querySelectorAll(".delete-quiz-btn").forEach((button) => {
      button.onclick = (e) => {
        e.stopPropagation();
        deleteUserQuiz(button.dataset.id);
      };
    });
  } catch (error) {
    console.error("Lỗi tải quiz của người dùng:", error);
    quizHistoryList.innerHTML = "<p>Lỗi tải Quiz của bạn.</p>";
    showNotification("Lỗi tải Quiz của bạn.", "error");
  }
}

// Hiển thị xem lại quiz
async function showQuizReview(quizId) {
  if (!requireAuth(null, "xem lại Quiz")) return;

  try {
    const { data: quiz, error } = await supabase
      .from("user_quizzes")
      .select("*")
      .eq("id", quizId)
      .eq("user_id", currentUser.id)
      .single();

    if (error) throw error;

    if (!quiz || !quiz.questions) {
      showNotification("Không tìm thấy Quiz để xem lại.", "error");
      return;
    }

    const reviewContainer = document.getElementById("quiz-review-questions");
    if (!reviewContainer) return;

    reviewContainer.innerHTML = "";

    // Hiển thị từng câu hỏi với đáp án
    quiz.questions.forEach((q, i) => {
      const userSelectedOptionIndex = quiz.user_answers
        ? quiz.user_answers.find((a) => a.question_index === i)
            ?.selected_option_index
        : -1;

      const div = document.createElement("div");
      div.className = "quiz-question";
      div.innerHTML = `
        <div class="question-header-review">
          <span class="question-number-review">Câu hỏi ${i + 1}</span>
          <h3 class="question-title-review">${q.question}</h3>
        </div>
        <div class="question-options-review">
          ${q.options
            .map((opt, j) => {
              let optionClass = "option-label-review";
              let iconHtml = "";

              // Đáp án đúng
              if (j === q.correct_answer_index) {
                optionClass += " correct-review";
                iconHtml =
                  '<i class="fas fa-check-circle correct-icon-review"></i>';
              }

              // Đáp án người dùng chọn sai
              if (
                j === userSelectedOptionIndex &&
                j !== q.correct_answer_index
              ) {
                optionClass += " selected-incorrect-review";
                iconHtml =
                  '<i class="fas fa-times-circle incorrect-icon-review"></i>';
              }

              return `
                <label class="${optionClass}">
                  <span class="option-prefix">${String.fromCharCode(
                    65 + j
                  )}.</span>
                  <span class="option-text-review">${opt}</span>
                  ${iconHtml}
                </label>
              `;
            })
            .join("")}
        </div>
        <div class="correct-answer-info">
          <p><strong>Đáp án đúng:</strong> <span class="correct-answer-text-display">${String.fromCharCode(
            65 + q.correct_answer_index
          )}. ${q.options[q.correct_answer_index]}</span></p>
        </div>
      `;
      reviewContainer.appendChild(div);
    });

    showModal("quiz-review");
  } catch (error) {
    console.error("Lỗi hiển thị xem lại quiz:", error);
    showNotification("Lỗi khi xem lại Quiz.", "error");
  }
}

// Xóa quiz của người dùng
async function deleteUserQuiz(quizId) {
  if (!confirm("Bạn có chắc chắn muốn xóa Quiz này?")) {
    return;
  }

  try {
    const { error } = await supabase
      .from("user_quizzes")
      .delete()
      .eq("id", quizId)
      .eq("user_id", currentUser.id);

    if (error) throw error;

    showNotification("Quiz đã được xóa thành công!", "success");
    loadUserQuizzes(); // Refresh danh sách
  } catch (error) {
    console.error("Lỗi xóa quiz:", error);
    showNotification("Lỗi khi xóa Quiz.", "error");
  }
}
//=====================================================
// ================ CHỨC NĂNG TÓM TẮT =================
//=====================================================
// Tạo tóm tắt bằng AI
async function generateSummary() {
  if (!requireAuth(null, "tóm tắt bài học")) return;

  const summaryInput = document.getElementById("summary-input");
  const summaryContentDiv = document.getElementById("summary-content");
  const summaryResultDiv = document.getElementById("summary-result");
  const summaryBtn = document.querySelector(".summary-btn");
  const shortSummaryCheckbox = document.getElementById(
    "summary-short-checkbox"
  );

  const originalText = summaryInput.value.trim();
  const isShortSummary = shortSummaryCheckbox.checked;

  if (!originalText) {
    showNotification("Vui lòng nhập nội dung cần tóm tắt!", "warning");
    return;
  }

  // Hiển thị trạng thái loading
  if (summaryBtn) {
    summaryBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Đang tạo tóm tắt...';
    summaryBtn.disabled = true;
  }
  summaryResultDiv.classList.add("hidden");

  const startTime = Date.now();

  try {
    // Tạo prompt cho AI
    let prompt = `Bạn là một trợ lý tóm tắt bài học. Hãy tóm tắt nội dung sau đây.`;
    if (isShortSummary) {
      prompt += ` Tóm tắt phải ngắn gọn, chỉ khoảng 2-3 câu hoặc các gạch đầu dòng chính.`;
    } else {
      prompt += ` Tóm tắt nên chi tiết hơn, bao gồm các ý chính và thông tin quan trọng.`;
    }
    prompt += `\n\nNội dung:\n${originalText}`;

    const messages = [{ role: "user", content: prompt }];

    // Gọi API AI
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "Learn With AI App - Summary",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Lỗi API: ${response.status} - ${
          errorData.message || response.statusText
        }`
      );
    }

    const data = await response.json();
    const aiSummaryContent =
      data.choices[0]?.message?.content ||
      "Xin lỗi, tôi không thể tạo tóm tắt lúc này.";

    // Hiển thị kết quả
    summaryContentDiv.innerHTML = aiSummaryContent.replace(/\n/g, "<br>");
    summaryResultDiv.classList.remove("hidden");

    // Lưu tóm tắt vào database
    const { data: summaryData, error: supabaseError } = await supabase
      .from("user_summaries")
      .insert({
        user_id: currentUser.id,
        original_content: originalText,
        summary_content: aiSummaryContent,
        is_short_summary: isShortSummary,
      })
      .select()
      .single();

    if (supabaseError) throw supabaseError;

    console.log("Tóm tắt đã được lưu vào Supabase:", summaryData);
    showNotification("Tóm tắt đã được tạo và lưu thành công!", "success");

    // Theo dõi hoạt động
    const timeSpent = Math.round((Date.now() - startTime) / 1000 / 60);
    await trackWebAccess("summary_created", {
      isShortSummary: isShortSummary,
      originalLength: originalText.length,
      timeSpent: timeSpent,
    });
  } catch (error) {
    console.error("Lỗi tạo hoặc lưu tóm tắt:", error);
    showNotification(
      "Đã xảy ra lỗi khi tạo hoặc lưu tóm tắt. Vui lòng thử lại.",
      "error"
    );
    summaryResultDiv.classList.add("hidden");
  } finally {
    // Khôi phục trạng thái button
    if (summaryBtn) {
      summaryBtn.innerHTML = '<i class="fas fa-magic"></i> Tạo tóm tắt';
      summaryBtn.disabled = false;
    }
  }
}

// Sao chép tóm tắt
function copySummary() {
  const summaryContentDiv = document.getElementById("summary-content");
  if (summaryContentDiv) {
    const textToCopy = summaryContentDiv.innerText;
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        showNotification("Đã sao chép tóm tắt!", "info");
      })
      .catch((err) => {
        console.error("Không thể sao chép văn bản: ", err);
        showNotification("Không thể sao chép tóm tắt.", "error");
      });
  }
}

// Tải xuống tóm tắt
function downloadSummary() {
  const summaryContentDiv = document.getElementById("summary-content");
  if (summaryContentDiv) {
    const textToDownload = summaryContentDiv.innerText;
    const blob = new Blob([textToDownload], {
      type: "text/plain;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "tom_tat_bai_hoc.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    showNotification("Đã tải xuống tóm tắt!", "info");
  }
}
//=====================================================
// =========== QUẢN LÝ SƠ ĐỒ TIẾN ĐỘ HỌC TẬP===========
//=====================================================
// Biến lưu trữ dữ liệu timeline người dùng
let userTimeline = {
  totalVisits: 0,
  totalTime: 0,
  uniquePages: new Set(),
  activeDays: new Set(),
  accessHistory: [],
};

// Khởi tạo timeline cho người dùng mới
async function initializeUserTimeline() {
  if (!isLoggedIn || !currentUser) return;

  try {
    // Kiểm tra xem đã có timeline chưa
    const { data: existingTimeline, error: checkError } = await supabase
      .from("user_timeline")
      .select("*")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Lỗi kiểm tra timeline:", checkError);
      return;
    }

    // Nếu chưa có timeline, tạo mới
    if (!existingTimeline) {
      const { data, error } = await supabase
        .from("user_timeline")
        .insert({
          user_id: currentUser.id,
          total_visits: 0,
          total_time: 0,
          unique_pages: [],
          active_days: [],
          access_history: [],
        })
        .select()
        .single();

      if (error) {
        console.error("Lỗi tạo timeline:", error);
        return;
      }

      userTimeline = {
        totalVisits: data.total_visits,
        totalTime: data.total_time,
        uniquePages: new Set(data.unique_pages || []),
        activeDays: new Set(data.active_days || []),
        accessHistory: data.access_history || [],
      };

      console.log("Đã khởi tạo timeline cho người dùng mới");
    } else {
      // Nếu đã có, load timeline hiện tại
      await loadUserTimeline();
    }
  } catch (error) {
    console.error("Lỗi khởi tạo timeline:", error);
  }
}

// Load timeline người dùng từ database
async function loadUserTimeline() {
  if (!isLoggedIn || !currentUser) return;

  try {
    const { data, error } = await supabase
      .from("user_timeline")
      .select("*")
      .eq("user_id", currentUser.id)
      .single();

    if (error) {
      console.error("Lỗi load timeline:", error);
      // Nếu không tìm thấy, tạo mới
      if (error.code === "PGRST116") {
        await initializeUserTimeline();
      }
      return;
    }

    if (data) {
      userTimeline = {
        totalVisits: data.total_visits,
        totalTime: data.total_time,
        uniquePages: new Set(data.unique_pages || []),
        activeDays: new Set(data.active_days || []),
        accessHistory: data.access_history || [],
      };
      console.log("Đã load timeline người dùng");
    }
  } catch (error) {
    console.error("Lỗi load timeline:", error);
  }
}

// Cập nhật timeline lên database
// Cập nhật timeline lên database
async function updateUserTimeline() {
  if (!isLoggedIn || !currentUser) return;

  try {
    const { data, error } = await supabase.from("user_timeline").upsert(
      {
        user_id: currentUser.id,
        total_visits: userTimeline.totalVisits,
        total_time: userTimeline.totalTime,
        unique_pages: Array.from(userTimeline.uniquePages),
        active_days: Array.from(userTimeline.activeDays),
        access_history: userTimeline.accessHistory,
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      }
    );

    if (error) {
      console.error("Lỗi cập nhật timeline:", error);
      return false;
    }

    console.log("Đã cập nhật timeline thành công");
    return true;
  } catch (error) {
    console.error("Lỗi cập nhật timeline:", error);
    return false;
  }
}

// Theo dõi truy cập web
async function trackWebAccess(activityType, details = {}) {
  if (!isLoggedIn || !currentUser) return;

  try {
    // Tạo bản ghi truy cập
    const accessRecord = {
      type: activityType,
      timestamp: new Date().toISOString(),
      page: getCurrentPageName(),
      action: getActionName(activityType),
      duration: details.timeSpent || getEstimatedDuration(activityType),
      details: details,
    };

    // Thêm vào lịch sử truy cập
    userTimeline.accessHistory.unshift(accessRecord);

    // Giữ tối đa 200 bản ghi gần nhất
    if (userTimeline.accessHistory.length > 200) {
      userTimeline.accessHistory = userTimeline.accessHistory.slice(0, 200);
    }

    // Cập nhật các thống kê
    userTimeline.totalVisits += 1;
    userTimeline.totalTime += accessRecord.duration;
    userTimeline.uniquePages.add(accessRecord.page);

    // Thêm ngày hiện tại vào danh sách ngày hoạt động
    const today = new Date().toDateString();
    userTimeline.activeDays.add(today);

    // Cập nhật lên database
    await updateUserTimeline();

    console.log("Đã theo dõi truy cập web:", activityType, details);
  } catch (error) {
    console.error("Lỗi theo dõi truy cập web:", error);
  }
}

// Lấy tên trang hiện tại
function getCurrentPageName() {
  const activeSection = document.querySelector(".section.active");
  if (activeSection) {
    const sectionId = activeSection.id;
    const pageNames = {
      home: "Trang chủ",
      chat: "AI Chat",
      quiz: "Tạo Quiz",
      summary: "Tóm tắt",
      progress: "Sơ đồ thời gian",
      courses: "Khóa học",
      resources: "Tài liệu",
    };
    return pageNames[sectionId] || sectionId;
  }
  return "Trang chủ";
}

// Lấy tên hành động
function getActionName(activityType) {
  const actionNames = {
    chat_message: "Trò chuyện với AI",
    quiz_created: "Tạo Quiz",
    quiz_completed: "Hoàn thành Quiz",
    summary_created: "Tạo tóm tắt",
    course_accessed: "Truy cập khóa học",
    resource_downloaded: "Tải tài liệu",
    page_visit: "Xem trang",
  };
  return actionNames[activityType] || activityType;
}

// Ước tính thời gian dựa trên loại hoạt động
function getEstimatedDuration(activityType) {
  const durations = {
    chat_message: 2,
    quiz_created: 5,
    quiz_completed: 10,
    summary_created: 3,
    course_accessed: 15,
    resource_downloaded: 1,
    page_visit: 1,
  };
  return durations[activityType] || 1;
}

// Load và hiển thị dữ liệu timeline
async function loadTimelineData() {
  if (!isLoggedIn || !currentUser) {
    document.querySelector(".timeline-container").innerHTML = `
      <div class="auth-required">
        <h3>Cần đăng nhập</h3>
        <p>Vui lòng đăng nhập để xem sơ đồ thời gian truy cập</p>
        <button onclick="showModal('login')" class="btn-primary">Đăng nhập</button>
      </div>
    `;
    return;
  }

  // Load dữ liệu mới nhất
  await loadUserTimeline();

  // Cập nhật giao diện
  updateTimelineUI();
}

// Cập nhật giao diện timeline
function updateTimelineUI() {
  try {
    // Cập nhật số liệu thống kê
    document.getElementById("total-visits").textContent =
      userTimeline.totalVisits;
    document.getElementById(
      "total-time"
    ).textContent = `${userTimeline.totalTime} phút`;
    document.getElementById("unique-pages").textContent =
      userTimeline.uniquePages.size;
    document.getElementById("active-days").textContent =
      userTimeline.activeDays.size;

    // Cập nhật timeline visualization
    updateTimelineVisualization();

    // Cập nhật bảng chi tiết
    updateTimelineTable();
  } catch (error) {
    console.error("Lỗi cập nhật giao diện timeline:", error);
  }
}

// Cập nhật visualization timeline
function updateTimelineVisualization() {
  const timelineEvents = document.getElementById("timeline-events");
  if (!timelineEvents) return;

  timelineEvents.innerHTML = "";

  // Lấy 10 hoạt động gần nhất
  const recentActivities = userTimeline.accessHistory.slice(0, 10);

  if (recentActivities.length === 0) {
    timelineEvents.innerHTML = `
      <div class="timeline-placeholder">
        <i class="fas fa-history"></i>
        <p>Chưa có hoạt động nào được ghi nhận</p>
      </div>
    `;
    return;
  }

  recentActivities.forEach((activity, index) => {
    const eventDiv = document.createElement("div");
    eventDiv.className = "timeline-event";

    const activityDate = new Date(activity.timestamp);
    const timeString = activityDate.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const dateString = activityDate.toLocaleDateString("vi-VN");

    eventDiv.innerHTML = `
      <div class="timeline-event-content">
        <div class="timeline-event-time">${timeString} - ${dateString}</div>
        <div class="timeline-event-title">${activity.action}</div>
        <div class="timeline-event-description">Trang: ${activity.page}</div>
        <div class="timeline-event-duration">Thời lượng: ${activity.duration} phút</div>
      </div>
      <div class="timeline-event-dot"></div>
    `;

    timelineEvents.appendChild(eventDiv);
  });
}

// Cập nhật bảng chi tiết timeline
function updateTimelineTable() {
  // This function can be implemented if needed for detailed table view
  console.log("Timeline table update - placeholder function");
}

// Lọc timeline theo thời gian
function filterTimeline(period) {
  const now = new Date();
  let filteredHistory = [];

  switch (period) {
    case "today":
      const today = now.toDateString();
      filteredHistory = userTimeline.accessHistory.filter(
        (activity) => new Date(activity.timestamp).toDateString() === today
      );
      break;
    case "week":
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredHistory = userTimeline.accessHistory.filter(
        (activity) => new Date(activity.timestamp) >= weekAgo
      );
      break;
    case "month":
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filteredHistory = userTimeline.accessHistory.filter(
        (activity) => new Date(activity.timestamp) >= monthAgo
      );
      break;
    default:
      filteredHistory = userTimeline.accessHistory;
  }

  // Cập nhật giao diện với dữ liệu đã lọc
  updateFilteredTimelineUI(filteredHistory);
}

// Cập nhật giao diện với dữ liệu đã lọc
function updateFilteredTimelineUI(filteredHistory) {
  // Cập nhật visualization
  const timelineEvents = document.getElementById("timeline-events");
  if (timelineEvents) {
    timelineEvents.innerHTML = "";

    const recentActivities = filteredHistory.slice(0, 10);

    if (recentActivities.length === 0) {
      timelineEvents.innerHTML = `
        <div class="timeline-placeholder">
          <i class="fas fa-history"></i>
          <p>Không có hoạt động nào trong khoảng thời gian này</p>
        </div>
      `;
      return;
    }

    recentActivities.forEach((activity) => {
      const eventDiv = document.createElement("div");
      eventDiv.className = "timeline-event";

      const activityDate = new Date(activity.timestamp);
      const timeString = activityDate.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const dateString = activityDate.toLocaleDateString("vi-VN");

      eventDiv.innerHTML = `
        <div class="timeline-event-content">
          <div class="timeline-event-time">${timeString} - ${dateString}</div>
          <div class="timeline-event-title">${activity.action}</div>
          <div class="timeline-event-description">Trang: ${activity.page}</div>
          <div class="timeline-event-duration">Thời lượng: ${activity.duration} phút</div>
        </div>
        <div class="timeline-event-dot"></div>
      `;

      timelineEvents.appendChild(eventDiv);
    });
  }
}

// Xóa lịch sử timeline
async function clearTimelineHistory() {
  if (!confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử truy cập?")) {
    return;
  }

  try {
    userTimeline = {
      totalVisits: 0,
      totalTime: 0,
      uniquePages: new Set(),
      activeDays: new Set(),
      accessHistory: [],
    };

    await updateUserTimeline();
    updateTimelineUI();
    showNotification("Đã xóa lịch sử truy cập!", "success");
  } catch (error) {
    console.error("Lỗi xóa lịch sử timeline:", error);
    showNotification("Lỗi khi xóa lịch sử truy cập.", "error");
  }
}

// Thêm event listener cho filter dropdown
document.addEventListener("DOMContentLoaded", () => {
  const timelineFilter = document.getElementById("timeline-filter");
  if (timelineFilter) {
    timelineFilter.addEventListener("change", (e) => {
      filterTimeline(e.target.value);
    });
  }
});
//=====================================================
// ============== QUẢN LÝ KHÓA HỌC ====================
//=====================================================
// Dữ liệu khóa học
const coursesData = [
  {
    title: "Python",
    description:
      "Ngôn ngữ lập trình Python từ cơ bản đến nâng cao, phù hợp cho người mới bắt đầu",
    rating: 4.8,
    isFree: true,
    price: "Miễn phí",
    iconClass: "fab fa-python",
    learningUrl: "https://www.codecademy.com/catalog/language/python",
  },
  {
    title: "Java",
    description:
      "Lập trình Java hướng đối tượng, xây dựng ứng dụng desktop và web",
    rating: 4.7,
    isFree: false,
    price: "299.000₫",
    iconClass: "fab fa-java",
    learningUrl: "https://www.codecademy.com/catalog/language/java",
  },
  {
    title: "C++",
    description:
      "Ngôn ngữ lập trình C++ mạnh mẽ cho phát triển hệ thống và game",
    rating: 4.6,
    isFree: false,
    price: "399.000₫",
    iconClass: "fas fa-code",
    learningUrl: "https://www.codecademy.com/catalog/language/c-plus-plus",
  },
  {
    title: "C#",
    description:
      "Lập trình C# với .NET Framework, phát triển ứng dụng Windows và web",
    rating: 4.5,
    isFree: false,
    price: "349.000₫",
    iconClass: "fas fa-hashtag",
    learningUrl: "https://www.codecademy.com/catalog/language/c-sharp",
  },
  {
    title: "HTML & CSS",
    description:
      "Xây dựng giao diện web đẹp mắt với HTML5 và CSS3, responsive design",
    rating: 4.9,
    isFree: true,
    price: "Miễn phí",
    iconClass: "fab fa-html5",
    learningUrl: "https://www.codecademy.com/catalog/language/html-css",
  },
  {
    title: "JavaScript",
    description:
      "Lập trình JavaScript hiện đại, tương tác web và phát triển ứng dụng",
    rating: 4.8,
    isFree: false,
    price: "249.000₫",
    iconClass: "fab fa-js-square",
    learningUrl: "https://www.codecademy.com/catalog/language/javascript",
  },
];

// Load danh sách khóa học
function loadCourses() {
  const coursesGrid = document.querySelector(".courses-grid");
  if (!coursesGrid) return;

  // Xóa nội dung cũ
  coursesGrid.innerHTML = "";

  coursesData.forEach((course) => {
    const courseCard = document.createElement("div");
    courseCard.className = "course-card";

    // Xác định class preview dựa trên icon
    let previewClass = "";
    if (course.iconClass.includes("python")) previewClass = "blue-purple";
    else if (course.iconClass.includes("java")) previewClass = "red-orange";
    else if (course.iconClass.includes("fa-code"))
      previewClass = "purple-pink"; // C++
    else if (course.iconClass.includes("hashtag"))
      previewClass = "green-blue"; // C#
    else if (course.iconClass.includes("html5")) previewClass = "green-teal";
    else if (course.iconClass.includes("js-square"))
      previewClass = "yellow-orange"; // JavaScript
    else previewClass = "blue-purple"; // Default fallback

    courseCard.innerHTML = `
      <div class="course-preview ${previewClass}">
        <i class="${course.iconClass}"></i>
      </div>
      <div class="course-info">
        <h3>${course.title}</h3>
        <div class="course-rating">
          ${Array(Math.floor(course.rating))
            .fill('<i class="fas fa-star"></i>')
            .join("")}
          ${
            course.rating % 1 !== 0
              ? '<i class="fas fa-star-half-alt"></i>'
              : ""
          }
          <span>(${course.rating.toFixed(1)})</span>
        </div>
        <p>${course.description}</p>
        <div class="course-footer">
          <span class="course-price ${course.isFree ? "free" : "paid"} ${
      course.isFree ? "" : previewClass.split("-")[0]
    }">${course.price}</span>
          <button onclick="handleDirectLearning('${course.learningUrl}', '${
      course.title
    }')" class="course-btn ${
      course.isFree ? "blue" : previewClass.split("-")[0]
    }">
            <i class="${
              course.isFree ? "fas fa-book-open" : "fas fa-cart-plus"
            }"></i>${course.isFree ? "Học ngay" : "Đăng ký"}
          </button>
        </div>
      </div>
    `;
    coursesGrid.appendChild(courseCard);
  });
}

// Xử lý học trực tiếp
function handleDirectLearning(url, courseName) {
  if (!requireAuth(null, `học ${courseName}`)) {
    return;
  }

  if (url) {
    // Theo dõi hoạt động truy cập khóa học
    trackWebAccess("course_accessed", {
      courseName: courseName,
      courseType: "external",
    });

    window.open(url, "_blank");
    showNotification(`Đang chuyển đến trang học ${courseName}...`, "info");
    console.log(`Người dùng được chuyển hướng đến: ${url}`);
  } else {
    showNotification("Liên kết học tập không khả dụng.", "error");
  }
}

//=====================================================
// =========== CHỨC NĂNG TÀI LIỆU THAM KHẢO  ==========
//=====================================================

const programmingDocuments = {
  python: {
    title: "Python Programming",
    titleVi: "Lập trình Python",
    url: "https://greenteapress.com/thinkpython/thinkpython.pdf",
    filename: "think_python.pdf",
    description: "Think Python - Cách tư duy như một nhà khoa học máy tính",
    icon: "fab fa-python",
    color: "#3776ab",
    size: "2.1MB",
    type: "PDF",
    source: "Green Tea Press",
  },
  java: {
    title: "Java Programming",
    titleVi: "Lập trình Java",
    url: "https://cdn.bookey.app/files/pdf/book/en/java-the-complete-reference.pdf",
    filename: "java_notes.pdf",
    description: "Giới thiệu lập trình với Java từ cơ bản đến nâng cao",
    icon: "fab fa-java",
    color: "#f89820",
    size: "3.2MB",
    type: "PDF",
    source: "Hobart and William ",
  },
  javascript: {
    title: "JavaScript Programming",
    titleVi: "Lập trình JavaScript",
    url: "https://eloquentjavascript.net/Eloquent_JavaScript.pdf",
    filename: "eloquent_javascript.pdf",
    description: "JavaScript hiện đại - Hướng dẫn toàn diện và thực tế",
    icon: "fab fa-js-square",
    color: "#f7df1e",
    size: "1.8MB",
    type: "PDF",
    source: "Eloquent JavaScript",
  },
  csharp: {
    title: "C# Programming",
    titleVi: "Lập trình C#",
    url: "https://www.robmiles.com/s/CSharp-Book-2019-Refresh.pdf",
    filename: "csharp_yellow_book.pdf",
    description: "C# Yellow Book - Hướng dẫn lập trình C# toàn diện",
    icon: "fas fa-hashtag",
    color: "#239120",
    size: "2.8MB",
    type: "PDF",
    source: "Rob Miles",
  },
  cpp: {
    title: "C++ Programming",
    titleVi: "Lập trình C++",
    url: "https://cplusplus.com/files/tutorial.pdf",
    filename: "cpp_tutorial.html",
    description: "Học C++ từ cơ bản - Hướng dẫn miễn phí và chi tiết",
    icon: "fas fa-code",
    color: "#00599c",
    size: "Online",
    type: "WEB",
    source: "LearnCpp.com",
  },
  htmlcss: {
    title: "HTML & CSS",
    titleVi: "HTML & CSS",
    url: "https://assets.digitalocean.com/books/how-to-build-a-website-with-html-and-css.pdf",
    filename: "html_css_guide.html",
    description: "Hướng dẫn HTML & CSS từ cơ bản đến nâng cao",
    icon: "fab fa-html5",
    color: "#e34f26",
    size: "Online",
    type: "WEB",
    source: "Learn to Code HTML & CSS",
  },
};

// Convert programming documents to resources format
const resourcesData = Object.keys(programmingDocuments).map((key, index) => {
  const doc = programmingDocuments[key];
  return {
    id: index + 1,
    title: doc.titleVi,
    description: doc.description,
    category: "programming",
    type: doc.type,
    size: doc.size,
    pages: doc.type === "PDF" ? "200+" : "N/A",
    author: doc.source,
    source: doc.source,
    viewUrl: doc.url,
    previewClass: getPreviewClass(key),
    icon: doc.icon,
    tags: [key, "programming", "tutorial"],
    rating: 4.5 + Math.random() * 0.5, // Random rating between 4.5-5.0
    views: Math.floor(Math.random() * 1000) + 500, // Random views 500-1500
    color: doc.color,
    filename: doc.filename,
  };
});

// Function to get preview class based on language
function getPreviewClass(language) {
  const classMap = {
    python: "blue-purple",
    java: "red-orange",
    javascript: "yellow-orange", // Đổi từ "yellow-amber"
    csharp: "purple-pink",
    cpp: "green-teal",
    htmlcss: "red-orange",
  };
  return classMap[language] || "blue-purple";
}

// Simplified function to load and display resources
function loadResources() {
  const resourcesGrid = document.getElementById("resources-grid");
  if (!resourcesGrid) return;

  // Show loading state without spinning animation
  resourcesGrid.innerHTML = `
    <div class="loading-placeholder">
      <i class="fas fa-book"></i>
      <p>Đang tải tài liệu...</p>
    </div>
  `;

  // Giảm thời gian loading
  setTimeout(() => {
    displayResources(resourcesData);
  }, 500); // Giảm từ 800ms xuống 500ms
}

// Function to display resources
function displayResources(resources) {
  const resourcesGrid = document.getElementById("resources-grid");
  if (!resourcesGrid) return;

  if (resources.length === 0) {
    resourcesGrid.innerHTML = `
      <div class="loading-placeholder">
        <i class="fas fa-folder-open"></i>
        <p>Không có tài liệu nào</p>
      </div>
    `;
    return;
  }

  resourcesGrid.innerHTML = "";

  resources.forEach((resource, index) => {
    const resourceItem = document.createElement("div");
    resourceItem.className = "resource-item";
    resourceItem.style.animationDelay = `${index * 0.1}s`;

    resourceItem.innerHTML = `
      <div class="resource-preview ${resource.previewClass}">
        <i class="${resource.icon}"></i>
      </div>
      <div class="resource-info">
        <h3>${resource.title}</h3>
        <div class="resource-meta">
          <div class="meta-item">
            <i class="fas fa-file"></i>
            <span>${resource.type}</span>
          </div>
          <div class="meta-item">
            <i class="fas fa-weight-hanging"></i>
            <span>${resource.size}</span>
          </div>
          <div class="meta-item">
            <i class="fas fa-star"></i>
            <span>${resource.rating.toFixed(1)}</span>
          </div>
          <div class="meta-item">
            <i class="fas fa-eye"></i>
            <span>${resource.views}</span>
          </div>
        </div>
        <p>${resource.description}</p>
        <div class="resource-tags">
          ${resource.tags
            .map((tag) => `<span class="tag">#${tag}</span>`)
            .join("")}
        </div>
        <div class="resource-footer">
          <span class="resource-source">${resource.source}</span>
          <div class="resource-actions">
            <button class="resource-view ${getViewButtonClass(
              resource.category
            )}" 
                    onclick="viewResource(${resource.id})">
              <i class="fas fa-eye"></i>
              Xem tài liệu
            </button>
          </div>
        </div>
      </div>
    `;
    resourcesGrid.appendChild(resourceItem);
  });
}

// Function to get view button class based on category
function getViewButtonClass(category) {
  const classMap = {
    programming: "blue",
    design: "purple",
    database: "green",
    ai: "red",
    security: "red",
    devops: "green",
  };
  return classMap[category] || "blue";
}

// Function to view resource with real URLs
function viewResource(resourceId) {
  const requireAuth = (user, action) => {
    return true;
  };

  const showNotification = (message, type) => {
    if (window.showNotification) {
      window.showNotification(message, type);
    } else {
      console.log(`${type}: ${message}`);
    }
  };

  if (!requireAuth(null, "xem tài liệu")) return;

  const resource = resourcesData.find((r) => r.id === resourceId);
  if (!resource) {
    showNotification("Không tìm thấy tài liệu!", "error");
    return;
  }

  try {
    // Show viewing notification
    showNotification(`Đang mở "${resource.title}"...`, "info");

    // Open the actual document URL in new tab
    window.open(resource.viewUrl, "_blank");

    // Update view count
    resource.views += 1;

    // Update the display
    setTimeout(() => {
      const viewCountElement = document
        .querySelector(`[onclick="viewResource(${resourceId})"]`)
        ?.closest(".resource-item")
        ?.querySelector(".meta-item:last-child span");

      if (viewCountElement) {
        viewCountElement.textContent = resource.views;
      }

      showNotification(`Đã mở "${resource.title}" thành công!`, "success");
    }, 1000);

    // Log view activity
    console.log(`User viewed: ${resource.title} at ${resource.viewUrl}`);

    // Track resource view activity
    trackActivity("resource_viewed", {
      resourceName: resource.title,
      resourceType: resource.type,
      resourceSize: resource.size,
    });

    // Save view history to database
    saveViewHistory(resource);
  } catch (error) {
    console.error("View error:", error);
    showNotification("Lỗi khi mở tài liệu!", "error");
  }
}

// Function to save view history (placeholder)
async function saveViewHistory(resource) {
  // In real app, save to Supabase or your database
  try {
    console.log("Saving view history:", {
      resource_id: resource.id,
      resource_title: resource.title,
      resource_url: resource.viewUrl,
      viewed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error saving view history:", error);
  }
}

// Function to track activity (placeholder)
async function trackActivity(action, data) {
  try {
    console.log(`Activity: ${action}`, data);
    // In real app, send to analytics or database
  } catch (error) {
    console.error("Error tracking activity:", error);
  }
}

// Enhanced initialization for resources section
function initializeResourcesSection() {
  // Load resources when section is shown
  const resourcesSection = document.getElementById("resources");
  if (resourcesSection) {
    // Use MutationObserver to detect when section becomes active
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          if (resourcesSection.classList.contains("active")) {
            loadResources();
          }
        }
      });
    });

    observer.observe(resourcesSection, { attributes: true });
  }

  // Initial load if section is already active
  if (resourcesSection && resourcesSection.classList.contains("active")) {
    loadResources();
  }
}

// Auto-initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  initializeResourcesSection();
});

// Debug function to show all resources data
window.showResourcesData = () => {
  console.table(resourcesData);
};
//=====================================================
// =========KHỞI TẠO VÀ EVENT LISTENERS ===============
//=====================================================
// Khởi tạo khi DOM được load
document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOM đã được tải, đang khởi tạo...");

  // Khởi tạo trạng thái chat ngay từ đầu
  initializeChatState();

  // Kiểm tra và khởi tạo Supabase
  if (!initializeSupabase()) {
    showNotification("Lỗi khởi tạo cơ sở dữ liệu", "error");
    return;
  }

  // Kiểm tra kết nối
  const connectionOk = await checkSupabaseConnection();
  if (!connectionOk) {
    showNotification("Không thể kết nối tới cơ sở dữ liệu", "error");
    return;
  }

  // Thiết lập auth listener
  setupAuthListener();

  // Kiểm tra trạng thái đăng nhập
  await checkAuthStatus();

  // Cập nhật UI
  updateAuthUI();

  // Thêm event listener cho phím Enter trong chat input
  const userInput = document.getElementById("user-input");
  if (userInput) {
    userInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault(); // Ngăn xuống dòng
        sendMessage();
      }
    });
  }

  // Event listeners cho Quiz section
  const fileInput = document.getElementById("file-input");
  if (fileInput) {
    fileInput.addEventListener("change", handleFileUpload);
  }

  const contentInput = document.getElementById("content-input");
  if (contentInput) {
    contentInput.addEventListener("input", handleContentInput);
  }

  const generateBtn = document.getElementById("generate-btn");
  if (generateBtn) {
    generateBtn.addEventListener("click", generateQuiz);
  }

  const submitQuizBtn = document.querySelector(".quiz-submit-btn");
  if (submitQuizBtn) {
    submitQuizBtn.addEventListener("click", submitQuiz);
  }

  const newQuizBtn = document.querySelector(".new-quiz-btn");
  if (newQuizBtn) {
    newQuizBtn.addEventListener("click", () => {
      showSection("quiz"); // Quay lại tạo quiz
    });
  }

  // Thêm validation cho input số câu hỏi
  const questionCountInput = document.getElementById("question-count");
  if (questionCountInput) {
    questionCountInput.addEventListener("input", function () {
      const value = Number.parseInt(this.value);

      if (isNaN(value) || value < 1) {
        this.value = 1;
      } else if (value > 50) {
        this.value = 50;
      }

      updateGenerateButton();
    });
  }

  // Event listeners cho Summary section
  const summaryBtn = document.querySelector(".summary-btn");
  if (summaryBtn) {
    summaryBtn.addEventListener("click", generateSummary);
  }

  const copySummaryBtn = document.querySelector(".summary-action-btn.copy");
  if (copySummaryBtn) {
    copySummaryBtn.addEventListener("click", copySummary);
  }

  const downloadSummaryBtn = document.querySelector(
    ".summary-action-btn.download"
  );
  if (downloadSummaryBtn) {
    downloadSummaryBtn.addEventListener("click", downloadSummary);
  }

  // Cập nhật trạng thái button tạo quiz ban đầu
  updateGenerateButton();

  // Load khóa học cho courses section
  loadCourses();

  console.log("Khởi tạo hoàn tất");
});

// ===== EXPORT CÁC HÀM CHO SỬ DỤNG TOÀN CỤC =====

// Export các hàm modal
window.showModal = showModal;
window.hideModal = hideModal;
window.switchModal = switchModal;

// Export các hàm notification
window.showNotification = showNotification;
window.hideNotification = hideNotification;

// Export các hàm navigation
window.showSection = showSection;
window.toggleChat = toggleChat;

// Export các hàm authentication
window.handleRegister = handleRegister;
window.handleLogin = handleLogin;
window.logout = logout;

// Export các hàm chat
window.sendMessage = sendMessage;
window.initializeChatState = initializeChatState;
window.startNewChat = startNewChat;
window.handleChatFileUpload = handleChatFileUpload;
window.clearChatFile = clearChatFile;

// Export các hàm quiz
window.showContentMethod = showContentMethod;
window.clearFile = clearFile;
window.generateQuiz = generateQuiz;
window.submitQuiz = submitQuiz;
window.loadUserQuizzes = loadUserQuizzes;
window.showQuizReview = showQuizReview;
window.deleteUserQuiz = deleteUserQuiz;
window.updateGenerateButton = updateGenerateButton;
window.handleContentInput = handleContentInput;
window.handleFileUpload = handleFileUpload;

// Export các hàm summary
window.generateSummary = generateSummary;
window.copySummary = copySummary;
window.downloadSummary = downloadSummary;

// Export các hàm courses và resources
window.loadCourses = loadCourses;
window.handleDirectLearning = handleDirectLearning;
window.loadResources = loadResources;
window.viewResource = viewResource;
window.initializeResourcesSection = initializeResourcesSection;
window.resourcesData = resourcesData;

// ===== EXPORT CÁC HÀM TIMELINE =====
window.initializeUserTimeline = initializeUserTimeline;
window.loadUserTimeline = loadUserTimeline;
window.updateUserTimeline = updateUserTimeline;
window.trackWebAccess = trackWebAccess;
window.loadTimelineData = loadTimelineData;
window.clearTimelineHistory = clearTimelineHistory;
window.filterTimeline = filterTimeline;

// Export các hàm utility
window.initializeUserProgress = initializeUserProgress;
window.loadUserProgress = loadUserProgress;
window.updateUserProgress = updateUserProgress;
window.saveDownloadHistory = saveDownloadHistory;

// Export dữ liệu cho debugging
window.resourcesData = resourcesData;
