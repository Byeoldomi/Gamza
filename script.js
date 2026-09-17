/* =========================================================
   Gamza Market - Integrated JavaScript Logic with Supabase
   ========================================================= */

// 1. Supabase Initialization
const SUPABASE_URL = "https://brujrbieydeommpopglb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJydWpyYmlleWRlb21tcG9wZ2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyOTAwNDgsImV4cCI6MjEwNDg2NjA0OH0.QELMvzhdYSdyu5v5xQgapRFPV3xLRMCwSo-CYWmOoZY";

const supabaseClient = (window.supabase && window.supabase.createClient)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// 2. Application State
let productsList = [];
let currentCategory = "전체";
let searchQuery = "";
let onlyAvailable = false;
let currentDetailProductId = null;

// Auth State
let currentUser = null;
let currentUserProfile = null;
let currentAuthTab = "login";
let pendingWriteOpen = false;
let isEditMode = false;
let editingProductId = null;

// 3. Status Mapping Helper
const statusMap = {
  available: { text: "판매중", class: "badge-available" },
  reserved: { text: "예약중", class: "badge-reserved" },
  completed: { text: "거래 완료", class: "badge-completed" }
};

// Price Formatter
function formatPrice(price) {
  return Number(price).toLocaleString('ko-KR') + "원";
}

// Relative Time Formatter
function formatTimeAgo(dateString) {
  if (!dateString) return "방금 전";
  const now = new Date();
  const past = new Date(dateString);
  const diffSec = Math.floor((now - past) / 1000);

  if (diffSec < 60) return "방금 전";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}일 전`;
  return `${Math.floor(diffDay / 30)}개월 전`;
}

// 4. DOM Elements
const productGrid = document.getElementById("product-grid");
const productCountEl = document.getElementById("product-count");
const categoryBtns = document.querySelectorAll(".category-btn");
const searchInput = document.getElementById("search-input");
const toggleAvailable = document.getElementById("toggle-available");
const btnLogin = document.getElementById("btn-login");
const btnWrite = document.getElementById("btn-write");

// User Header UI Elements
const userInfoGroup = document.getElementById("user-info-group");
const userNicknameEl = document.getElementById("user-nickname");
const btnLogout = document.getElementById("btn-logout");

// Auth Modal Elements
const authModal = document.getElementById("auth-modal");
const authCloseBtn = document.getElementById("auth-close-btn");
const authForm = document.getElementById("auth-form");
const authTitleEl = document.getElementById("auth-modal-title");
const authSubEl = document.getElementById("auth-modal-sub");
const authSubmitBtn = document.getElementById("auth-submit-btn");
const authErrorMsg = document.getElementById("auth-error-msg");
const tabLoginBtn = document.getElementById("tab-login");
const tabSignupBtn = document.getElementById("tab-signup");
const authEmailInput = document.getElementById("auth-email");
const authPasswordInput = document.getElementById("auth-password");
const authNicknameInput = document.getElementById("auth-nickname");
const groupAuthNickname = document.getElementById("group-auth-nickname");

// Detail Modal Elements
const detailModal = document.getElementById("detail-modal");
const detailCloseBtn = document.getElementById("detail-close-btn");
const detailImg = document.getElementById("detail-img");
const detailBadge = document.getElementById("detail-badge");
const detailCategory = document.getElementById("detail-category");
const detailTitle = document.getElementById("detail-title");
const detailMeta = document.getElementById("detail-meta");
const detailPrice = document.getElementById("detail-price");
const detailDesc = document.getElementById("detail-desc");
const sellerAvatar = document.getElementById("seller-avatar");
const sellerNickname = document.getElementById("seller-nickname");
const sellerLocation = document.getElementById("seller-location");
const btnLike = document.getElementById("btn-like");
const btnChat = document.getElementById("btn-chat");

// Detail Modal Seller Action Elements
const sellerStatusBox = document.getElementById("seller-status-box");
const detailStatusSelect = document.getElementById("detail-status-select");
const buyerFooter = document.getElementById("buyer-footer");
const ownerFooter = document.getElementById("owner-footer");
const btnEditProduct = document.getElementById("btn-edit-product");
const btnDeleteProduct = document.getElementById("btn-delete-product");

// Write Modal Elements
const writeModal = document.getElementById("write-modal");
const writeCloseBtn = document.getElementById("write-close-btn");
const writeForm = document.getElementById("write-form");
const imageUrlInput = document.getElementById("write-image");
const imagePreviewBox = document.getElementById("image-preview-box");
const sampleBtns = document.querySelectorAll(".sample-btn");

// Toast
const toast = document.getElementById("toast");
const toastMsg = document.getElementById("toast-msg");

// Toast Notification Trigger
function showToast(message) {
  toastMsg.textContent = message;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

// 5. Fetch Products from Supabase DB
async function fetchProducts() {
  if (!supabaseClient) {
    console.error("Supabase client is not available.");
    return;
  }

  let query = supabaseClient
    .from('products')
    .select('*, seller:users(id, nickname, avatar_url, location)')
    .order('created_at', { ascending: false });

  if (currentCategory !== "전체") {
    query = query.eq('category', currentCategory);
  }
  if (onlyAvailable) {
    query = query.neq('status', 'completed');
  }
  if (searchQuery.trim() !== "") {
    query = query.ilike('title', `%${searchQuery.trim()}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch products:", error);
    showToast("⚠️ Supabase에서 데이터를 불러오지 못했습니다.");
    return;
  }

  productsList = data.map(item => ({
    id: item.id,
    title: item.title,
    category: item.category,
    location: item.location,
    timeAgo: formatTimeAgo(item.created_at),
    price: item.price,
    status: item.status,
    image: item.image_url,
    description: item.description,
    seller: {
      id: item.seller?.id,
      nickname: item.seller?.nickname || "익명 이웃",
      avatar: item.seller?.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      location: item.seller?.location || item.location
    }
  }));

  renderProductsGrid();
}

// Render Products Grid to DOM
function renderProductsGrid() {
  productCountEl.textContent = productsList.length;

  if (productsList.length === 0) {
    productGrid.innerHTML = `
      <div class="empty-state">
        <span class="icon">🥔</span>
        <p>조건에 부합하는 상품이 없습니다.</p>
      </div>
    `;
    return;
  }

  productGrid.innerHTML = productsList.map(product => {
    const badgeInfo = statusMap[product.status] || { text: product.status, class: "badge-available" };
    const isCompleted = product.status === 'completed';
    return `
      <div class="product-card ${isCompleted ? 'completed' : ''}" data-id="${product.id}">
        <div class="card-img-wrapper">
          <img src="${product.image}" alt="${product.title}" loading="lazy">
        </div>
        <div class="card-content">
          <span class="card-category">${product.category}</span>
          <h4 class="card-title" title="${product.title}">${product.title}</h4>
          <div class="card-meta">
            <span>${product.seller.nickname}</span>
            <span>•</span>
            <span>${product.location}</span>
            <span>•</span>
            <span>${product.timeAgo}</span>
          </div>
          <div class="card-footer">
            <span class="card-price">${formatPrice(product.price)}</span>
            <span class="badge ${badgeInfo.class}">${badgeInfo.text}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach card click events
  document.querySelectorAll(".product-card").forEach(card => {
    card.addEventListener("click", () => {
      const id = Number(card.dataset.id);
      openDetailModal(id);
    });
  });
}

// 6. Screen 2: Open Detail Modal & Seller Action Controls
function openDetailModal(productId) {
  const product = productsList.find(p => p.id === productId);
  if (!product) return;

  currentDetailProductId = productId;
  const badgeInfo = statusMap[product.status] || { text: product.status, class: "badge-available" };

  detailImg.src = product.image;
  detailImg.alt = product.title;
  detailBadge.textContent = badgeInfo.text;
  detailBadge.className = `badge ${badgeInfo.class}`;
  detailCategory.textContent = product.category;
  detailTitle.textContent = product.title;
  detailMeta.textContent = `${product.location} · ${product.timeAgo}`;
  detailPrice.textContent = formatPrice(product.price);
  detailDesc.textContent = product.description || "상세 설명이 없습니다.";

  // Seller info
  const seller = product.seller || { nickname: "감자이웃", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150", location: product.location };
  sellerAvatar.src = seller.avatar;
  sellerNickname.textContent = seller.nickname;
  sellerLocation.textContent = seller.location;

  // 작성자 권한 판별 (currentUser와 seller.id 비교)
  const isOwner = currentUser && seller.id && String(currentUser.id) === String(seller.id);

  if (isOwner) {
    if (sellerStatusBox) sellerStatusBox.style.display = "flex";
    if (detailStatusSelect) detailStatusSelect.value = product.status;
    if (buyerFooter) buyerFooter.style.display = "none";
    if (ownerFooter) ownerFooter.style.display = "flex";
  } else {
    if (sellerStatusBox) sellerStatusBox.style.display = "none";
    if (buyerFooter) buyerFooter.style.display = "flex";
    if (ownerFooter) ownerFooter.style.display = "none";
  }

  detailModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeDetailModal() {
  detailModal.classList.remove("active");
  document.body.style.overflow = "";
  currentDetailProductId = null;
}

// Update Product Status in Supabase DB
async function updateProductStatus(productId, newStatus) {
  if (!supabaseClient) return;

  const { error } = await supabaseClient
    .from('products')
    .update({ status: newStatus })
    .eq('id', productId);

  if (error) {
    console.error("Failed to update status:", error);
    showToast("⚠️ 상태 변경 실패: " + error.message);
    return;
  }

  // Update local product object
  const product = productsList.find(p => p.id === productId);
  if (product) {
    product.status = newStatus;
  }

  const badgeInfo = statusMap[newStatus] || { text: newStatus, class: "badge-available" };
  detailBadge.textContent = badgeInfo.text;
  detailBadge.className = `badge ${badgeInfo.class}`;

  renderProductsGrid();
  showToast(`게시글 상태가 '${badgeInfo.text}'(으)로 변경되었습니다!`);
}

// Delete Product from Supabase DB
async function deleteProduct(productId) {
  if (!confirm("정말로 이 게시글을 삭제하시겠습니까?")) return;

  if (!supabaseClient) return;

  const { error } = await supabaseClient
    .from('products')
    .delete()
    .eq('id', productId);

  if (error) {
    console.error("Failed to delete product:", error);
    showToast("⚠️ 게시글 삭제 실패: " + error.message);
    return;
  }

  closeDetailModal();
  await fetchProducts();
  showToast("🗑️ 게시글이 성공적으로 삭제되었습니다.");
}

// 7. Screen 3: Open/Close Write Modal & Form Logic
function openWriteModal(productToEdit = null) {
  if (productToEdit) {
    isEditMode = true;
    editingProductId = productToEdit.id;

    const titleEl = document.querySelector("#write-modal .modal-header-title span");
    if (titleEl) titleEl.textContent = "게시글 수정";

    const submitBtn = document.getElementById("write-submit-btn");
    if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> 수정 완료';

    document.getElementById("write-title").value = productToEdit.title;
    document.getElementById("write-category").value = productToEdit.category;
    document.getElementById("write-price").value = productToEdit.price;
    document.getElementById("write-location").value = productToEdit.location;
    document.getElementById("write-desc").value = productToEdit.description || "";
    imageUrlInput.value = productToEdit.image || "";
    updateImagePreview(productToEdit.image);

    const radio = document.querySelector(`input[name="write-status"][value="${productToEdit.status}"]`);
    if (radio) radio.checked = true;
  } else {
    isEditMode = false;
    editingProductId = null;
  }

  writeModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeWriteModal() {
  writeModal.classList.remove("active");
  document.body.style.overflow = "";
  resetWriteForm();
}

function resetWriteForm() {
  writeForm.reset();
  isEditMode = false;
  editingProductId = null;

  const titleEl = document.querySelector("#write-modal .modal-header-title span");
  if (titleEl) titleEl.textContent = "내 물건 팔기";

  const submitBtn = document.getElementById("write-submit-btn");
  if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> 작성 완료';

  document.querySelectorAll(".form-group").forEach(group => group.classList.remove("has-error"));
  imagePreviewBox.innerHTML = `<span>이미지 URL을 입력하거나 샘플을 선택하세요</span>`;
}

// Sample Image Buttons click handler
sampleBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const url = btn.dataset.url;
    imageUrlInput.value = url;
    updateImagePreview(url);
  });
});

imageUrlInput.addEventListener("input", (e) => {
  updateImagePreview(e.target.value);
});

function updateImagePreview(url) {
  if (url && url.trim() !== '') {
    const img = new Image();
    img.src = url;
    img.onload = () => {
      imagePreviewBox.innerHTML = `<img src="${url}" alt="미리보기">`;
    };
    img.onerror = () => {
      imagePreviewBox.innerHTML = `<span style="color: #D9534F;">⚠️ 유효하지 않은 이미지 URL입니다.</span>`;
    };
  } else {
    imagePreviewBox.innerHTML = `<span>이미지 URL을 입력하거나 샘플을 선택하세요</span>`;
  }
}

// Write Form Submit Handler -> Insert / Update Supabase DB
writeForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("write-title").value.trim();
  const category = document.getElementById("write-category").value;
  const price = document.getElementById("write-price").value;
  const location = document.getElementById("write-location").value.trim();
  const statusRadio = document.querySelector('input[name="write-status"]:checked');
  const status = statusRadio ? statusRadio.value : "available";
  const description = document.getElementById("write-desc").value.trim();
  let image = imageUrlInput.value.trim();

  // Simple validation
  let hasError = false;
  
  if (!title || title.length < 2) {
    document.getElementById("group-title").classList.add("has-error");
    hasError = true;
  } else {
    document.getElementById("group-title").classList.remove("has-error");
  }

  if (!category) {
    document.getElementById("group-category").classList.add("has-error");
    hasError = true;
  } else {
    document.getElementById("group-category").classList.remove("has-error");
  }

  if (!price || Number(price) < 0) {
    document.getElementById("group-price").classList.add("has-error");
    hasError = true;
  } else {
    document.getElementById("group-price").classList.remove("has-error");
  }

  if (!location) {
    document.getElementById("group-location").classList.add("has-error");
    hasError = true;
  } else {
    document.getElementById("group-location").classList.remove("has-error");
  }

  if (!description || description.length < 5 || description.length > 500) {
    document.getElementById("group-desc").classList.add("has-error");
    hasError = true;
  } else {
    document.getElementById("group-desc").classList.remove("has-error");
  }

  if (hasError) return;

  if (!image) {
    image = "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80"; // Default sample
  }

  if (supabaseClient) {
    if (!currentUser) {
      showToast("🔑 먼저 로그인해 주세요.");
      closeWriteModal();
      openAuthModal('login');
      return;
    }

    if (isEditMode && editingProductId) {
      // 1. UPDATE Mode
      const { error } = await supabaseClient
        .from('products')
        .update({
          title,
          category,
          price: Number(price),
          location,
          status,
          image_url: image,
          description
        })
        .eq('id', editingProductId);

      if (error) {
        console.error("Error updating product in Supabase:", error);
        showToast(`⚠️ 게시글 수정 실패: ${error.message}`);
        return;
      }

      closeWriteModal();
      closeDetailModal();
      await fetchProducts();
      showToast("🎉 게시글 수정이 완료되었습니다!");
    } else {
      // 2. INSERT Mode
      const sellerId = currentUser.id;
      const userNickname = currentUserProfile?.nickname || currentUser.user_metadata?.nickname || currentUser.email.split('@')[0];
      const userLocation = currentUserProfile?.location || location || "서울시 마포구 연남동";
      const userAvatar = currentUserProfile?.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";

      const { error: userUpsertErr } = await supabaseClient
        .from('users')
        .upsert([{
          id: currentUser.id,
          nickname: userNickname,
          location: userLocation,
          avatar_url: userAvatar
        }], { onConflict: 'id' });

      if (userUpsertErr) {
        console.error("Critical: Failed to insert user into 'users' table before product creation:", userUpsertErr);
        showToast(`⚠️ 회원 프로필(users) 등록 실패: ${userUpsertErr.message}`);
        return;
      }

      const { data, error } = await supabaseClient
        .from('products')
        .insert([{
          seller_id: sellerId,
          title,
          category,
          price: Number(price),
          location,
          status,
          image_url: image,
          description
        }]);

      if (error) {
        console.error("Error inserting product into Supabase:", error);
        let userMsg = error.message;
        if (error.code === '42501' || error.message.includes('row-level security')) {
          userMsg = "RLS 보안 정책 오류: Supabase의 products 테이블 권한을 확인해주세요.";
        } else if (error.code === '23503' || error.message.includes('foreign key constraint')) {
          userMsg = "작성자 회원 정보(users)가 DB에 존재하지 않습니다.";
        }

        showToast(`⚠️ ${userMsg}`);
        return;
      }

      closeWriteModal();
      await fetchProducts();
      showToast("🎉 새 상품이 Supabase DB에 성공적으로 등록되었습니다!");
    }
  }
});

// 8. Supabase Auth Management Logic
async function initAuth() {
  if (!supabaseClient) return;

  // 1. Get current active session
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session?.user) {
    await handleUserSession(session.user);
  } else {
    updateAuthUI(null);
  }

  // 2. Listen to Auth state changes
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      await handleUserSession(session.user);
    } else {
      currentUser = null;
      currentUserProfile = null;
      updateAuthUI(null);
    }
  });
}

// Fetch or create user profile in users table
async function handleUserSession(user) {
  currentUser = user;

  // Use maybeSingle() instead of single() to prevent 406 (Not Acceptable) when record is missing
  const { data: profile } = await supabaseClient
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (profile && profile.nickname) {
    currentUserProfile = profile;
  } else {
    const fallbackNickname = user.user_metadata?.nickname || user.email.split('@')[0];
    currentUserProfile = {
      id: user.id,
      nickname: fallbackNickname,
      email: user.email,
      avatar_url: profile?.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      location: profile?.location || "서울시 마포구 연남동"
    };

    // Safe upsert satisfying NOT NULL constraint (location, avatar_url)
    const { error: upsertErr } = await supabaseClient.from('users').upsert([{
      id: user.id,
      nickname: fallbackNickname,
      location: "서울시 마포구 연남동",
      avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
    }], { onConflict: 'id' });

    if (upsertErr) {
      console.warn("Notice: users table upsert skipped or partial:", upsertErr.message);
    }
  }

  updateAuthUI(currentUserProfile.nickname);
}

// Update Top Right Header UI
function updateAuthUI(nickname) {
  if (nickname) {
    btnLogin.style.display = "none";
    userInfoGroup.style.display = "flex";
    userNicknameEl.innerHTML = `<i class="fa-solid fa-user"></i> ${nickname}`;
  } else {
    btnLogin.style.display = "inline-flex";
    userInfoGroup.style.display = "none";
  }
}

// Auth Modal Controls
function openAuthModal(tab = 'login') {
  authModal.classList.add("active");
  document.body.style.overflow = "hidden";
  switchAuthTab(tab);
}

function closeAuthModal() {
  authModal.classList.remove("active");
  document.body.style.overflow = "";
  resetAuthForm();
}

function resetAuthForm() {
  authForm.reset();
  hideAuthError();
  document.querySelectorAll("#auth-form .form-group").forEach(g => g.classList.remove("has-error"));
}

function switchAuthTab(tab) {
  currentAuthTab = tab;
  hideAuthError();

  if (tab === 'login') {
    tabLoginBtn.classList.add("active");
    tabSignupBtn.classList.remove("active");
    groupAuthNickname.style.display = "none";
    authTitleEl.textContent = "로그인";
    authSubEl.textContent = "감자 마켓에 오신 것을 환영합니다 🥔";
    authSubmitBtn.textContent = "로그인하기";
  } else {
    tabSignupBtn.classList.add("active");
    tabLoginBtn.classList.remove("active");
    groupAuthNickname.style.display = "block";
    authTitleEl.textContent = "회원가입";
    authSubEl.textContent = "감자 마켓의 따뜻한 이웃이 되어보세요 🥔";
    authSubmitBtn.textContent = "회원가입 완료";
  }
}

function showAuthError(msg) {
  authErrorMsg.textContent = msg;
  authErrorMsg.style.display = "block";
}

function hideAuthError() {
  authErrorMsg.style.display = "none";
  authErrorMsg.textContent = "";
}

// Auth Form Handler (Login / SignUp)
authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAuthError();

  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value.trim();
  const nickname = authNicknameInput.value.trim();

  let hasError = false;

  if (!email || !email.includes("@")) {
    document.getElementById("group-auth-email").classList.add("has-error");
    hasError = true;
  } else {
    document.getElementById("group-auth-email").classList.remove("has-error");
  }

  if (!password || password.length < 6) {
    document.getElementById("group-auth-password").classList.add("has-error");
    hasError = true;
  } else {
    document.getElementById("group-auth-password").classList.remove("has-error");
  }

  if (currentAuthTab === "signup") {
    if (!nickname || nickname.length < 2) {
      document.getElementById("group-auth-nickname").classList.add("has-error");
      hasError = true;
    } else {
      document.getElementById("group-auth-nickname").classList.remove("has-error");
    }
  }

  if (hasError) return;

  if (!supabaseClient) {
    showAuthError("Supabase 클라이언트 연동 실패");
    return;
  }

  authSubmitBtn.disabled = true;

  if (currentAuthTab === "login") {
    authSubmitBtn.textContent = "로그인 중...";
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    authSubmitBtn.disabled = false;
    authSubmitBtn.textContent = "로그인하기";

    if (error) {
      const errMsg = error.message === "Invalid login credentials"
        ? "이메일 또는 비밀번호가 올바르지 않습니다."
        : error.message;
      showAuthError(errMsg);
      return;
    }

    closeAuthModal();
    showToast(`🎉 로그인되었습니다!`);

    if (pendingWriteOpen) {
      pendingWriteOpen = false;
      openWriteModal();
    }
  } else {
    authSubmitBtn.textContent = "가입 처리 중...";
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: { nickname }
      }
    });

    authSubmitBtn.disabled = false;
    authSubmitBtn.textContent = "회원가입 완료";

    if (error) {
      const errMsg = (error.status === 409 || error.message.includes("already registered") || error.message.includes("already exists"))
        ? "이미 가입된 이메일입니다. 로그인해 주세요."
        : error.message;
      showAuthError(errMsg);
      return;
    }

    if (data.user) {
      // Upsert profile to users table satisfying NOT NULL location constraint
      const { error: upsertErr } = await supabaseClient.from('users').upsert([{
        id: data.user.id,
        nickname: nickname,
        location: "서울시 마포구 연남동",
        avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
      }], { onConflict: 'id' });

      if (upsertErr) {
        console.warn("users 테이블 업서트 경고:", upsertErr);
      }

      if (data.session) {
        await handleUserSession(data.user);
        closeAuthModal();
        showToast("🎉 회원가입 및 로그인이 완료되었습니다!");
        if (pendingWriteOpen) {
          pendingWriteOpen = false;
          openWriteModal();
        }
      } else {
        closeAuthModal();
        showToast("✉️ 회원가입 신청 완료! (이메일 인증 확인 후 로그인해주세요)");
      }
    }
  }
});

// Logout Event Handler
btnLogout.addEventListener("click", async () => {
  if (supabaseClient) {
    await supabaseClient.auth.signOut();
    currentUser = null;
    currentUserProfile = null;
    updateAuthUI(null);
    showToast("로그아웃되었습니다.");
  }
});


// 9. Event Listeners Initialization
document.addEventListener("DOMContentLoaded", () => {
  // Initial fetch & Auth check from Supabase
  fetchProducts();
  initAuth();

  // Category Filtering
  categoryBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      categoryBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentCategory = btn.dataset.category;
      fetchProducts();
    });
  });

  // Search Input with Debounce/Instant Trigger
  let searchTimeout;
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      fetchProducts();
    }, 250);
  });

  // Toggle Available filter
  toggleAvailable.addEventListener("change", (e) => {
    onlyAvailable = e.target.checked;
    fetchProducts();
  });

  // Buttons Event Listener
  btnWrite.addEventListener("click", () => {
    if (!currentUser) {
      pendingWriteOpen = true;
      openAuthModal('login');
      showToast("🔑 글을 작성하려면 먼저 로그인해 주세요.");
    } else {
      openWriteModal();
    }
  });

  btnLogin.addEventListener("click", () => {
    openAuthModal('login');
  });

  tabLoginBtn.addEventListener("click", () => switchAuthTab('login'));
  tabSignupBtn.addEventListener("click", () => switchAuthTab('signup'));

  // Modal Closures
  detailCloseBtn.addEventListener("click", closeDetailModal);
  writeCloseBtn.addEventListener("click", closeWriteModal);
  authCloseBtn.addEventListener("click", closeAuthModal);

  // Overlay click to close
  detailModal.addEventListener("click", (e) => {
    if (e.target === detailModal) closeDetailModal();
  });
  writeModal.addEventListener("click", (e) => {
    if (e.target === writeModal) closeWriteModal();
  });
  authModal.addEventListener("click", (e) => {
    if (e.target === authModal) closeAuthModal();
  });

  // ESC Key Listener
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (detailModal.classList.contains("active")) closeDetailModal();
      if (writeModal.classList.contains("active")) closeWriteModal();
      if (authModal.classList.contains("active")) closeAuthModal();
    }
  });

  // Like Toggle Handler with Supabase
  btnLike.addEventListener("click", async () => {
    if (!currentDetailProductId || !supabaseClient) return;

    if (!currentUser) {
      showToast("🔑 관심 상품 추가는 로그인 후 이용 가능합니다.");
      openAuthModal('login');
      return;
    }

    const targetUserId = currentUser.id;

    // Check if already liked
    const { data: existingLikes, error: fetchErr } = await supabaseClient
      .from('product_likes')
      .select('id')
      .eq('user_id', targetUserId)
      .eq('product_id', currentDetailProductId);

    if (fetchErr) {
      console.error("Error checking product likes:", fetchErr);
      return;
    }

    if (existingLikes && existingLikes.length > 0) {
      // Remove Like
      const { error: delErr } = await supabaseClient
        .from('product_likes')
        .delete()
        .eq('user_id', targetUserId)
        .eq('product_id', currentDetailProductId);

      if (!delErr) showToast("💔 관심 상품에서 해제되었습니다.");
    } else {
      // Add Like
      const { error: insErr } = await supabaseClient
        .from('product_likes')
        .insert([{ user_id: targetUserId, product_id: currentDetailProductId }]);

      if (!insErr) showToast("❤️ 관심 상품으로 Supabase DB에 추가되었습니다!");
    }
  });

  // Chat Button Action
  btnChat.addEventListener("click", () => {
    showToast("💬 채팅 시작 기능은 chat_rooms 테이블과 연동할 수 있습니다.");
  });

  // Seller Status Change Event Listener
  if (detailStatusSelect) {
    detailStatusSelect.addEventListener("change", (e) => {
      if (currentDetailProductId) {
        updateProductStatus(currentDetailProductId, e.target.value);
      }
    });
  }

  // Edit Product Button Event Listener
  if (btnEditProduct) {
    btnEditProduct.addEventListener("click", () => {
      if (!currentDetailProductId) return;
      const product = productsList.find(p => p.id === currentDetailProductId);
      if (product) {
        openWriteModal(product);
      }
    });
  }

  // Delete Product Button Event Listener
  if (btnDeleteProduct) {
    btnDeleteProduct.addEventListener("click", () => {
      if (currentDetailProductId) {
        deleteProduct(currentDetailProductId);
      }
    });
  }
});
