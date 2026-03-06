// script.js - shared across pages
const USERS_KEY = "pp_users";
const POSTS_KEY = "pp_posts";
const CURRENT_KEY = "pp_currentUser";

function loadUsers(){ return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
function saveUsers(u){ localStorage.setItem(USERS_KEY, JSON.stringify(u)); }
function loadPosts(){ return JSON.parse(localStorage.getItem(POSTS_KEY)) || []; }
function savePosts(p){ localStorage.setItem(POSTS_KEY, JSON.stringify(p)); }
function getCurrent(){ return JSON.parse(localStorage.getItem(CURRENT_KEY)); }
function setCurrent(u){ localStorage.setItem(CURRENT_KEY, JSON.stringify(u)); }

const current = getCurrent();

// redirect rules: allow guest only on index.html
if (!current && !location.pathname.endsWith("index.html") && !location.pathname.endsWith("/") && !location.pathname.endsWith("login.html")) {
  window.location.href = "login.html";
}

// Logout handler
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.onclick = () => {
    localStorage.removeItem(CURRENT_KEY);
    window.location.href = "login.html";
  };
}

// ---------- INDEX (home feed) ----------
if (location.pathname.endsWith("index.html") || location.pathname === "/" || location.pathname.endsWith("/")) {
  const meName = document.getElementById("meName");
  const meEmail = document.getElementById("meEmail");
  const meAvatar = document.getElementById("meAvatar");
  const profileLink = document.getElementById("profileLink");
  const hireListLink = document.getElementById("hireListLink");

  if (current) {
    meName.innerText = current.name;
    meEmail.innerText = current.email;
    meAvatar.src = current.photo || "default.jpg";
    profileLink.href = "profile.html";
    if (hireListLink) hireListLink.style.display = "inline-block";
  } else {
    meName.innerText = "Guest";
    meEmail.innerText = "";
    meAvatar.src = "default.jpg";
    profileLink.href = "login.html";
  }

  // post create
  const postBtn = document.getElementById("postBtn");
  const clearBtn = document.getElementById("clearBtn");
  if (postBtn) postBtn.onclick = createPost;
  if (clearBtn) clearBtn.onclick = () => {
    document.getElementById("postText").value = "";
    document.getElementById("postPhoto").value = "";
  };

  function createPost(){
    if (!current) return alert("Login korte hobe post korar jonno.");
    const text = document.getElementById("postText").value.trim();
    const file = document.getElementById("postPhoto").files[0];
    if (!text && !file) return alert("Write something or attach a photo.");

    const post = {
      id: Date.now(),
      authorEmail: current.email,
      authorName: current.name,
      authorPhoto: current.photo,
      text,
      image: null,
      likes: [],
      comments: [],
      shares: 0,
      hires: [],
      time: new Date().toLocaleString()
    };

    if (file) {
      const reader = new FileReader();
      reader.onload = () => { post.image = reader.result; pushPost(post); };
      reader.readAsDataURL(file);
    } else pushPost(post);
  }

  function pushPost(post){ const posts = loadPosts(); posts.unshift(post); savePosts(posts); renderFeed(); document.getElementById("postText").value=""; document.getElementById("postPhoto").value=""; }

  function renderFeed(){
    const container = document.getElementById("feed");
    container.innerHTML = "";
    const posts = loadPosts();
    if (!posts.length) container.innerHTML = "<p class='muted'>Kono post nei — tumi prothom post ta koro!</p>";
    posts.forEach(p => {
      const box = document.createElement("div");
      box.className = "post";
      box.innerHTML = `
        <div class="post-head">
          <img src="${p.authorPhoto}" class="avatar" />
          <div>
            <b class="authorLink" data-email="${p.authorEmail}" style="cursor:pointer">${p.authorName}</b><br>
            <small class="meta">${p.time}</small>
          </div>
        </div>
        <p class="small">${escapeHtml(p.text)}</p>
        ${p.image? `<img src="${p.image}" style="width:100%;border-radius:8px;margin-top:8px">` : ""}
        <div class="actions">
          <button class="action-btn likeBtn">${p.likes.length? "❤️ " + p.likes.length : "🤍 Like"}</button>
          <button class="action-btn commentToggle">💬 Comment (${p.comments.length})</button>
          <button class="action-btn shareBtn">🔁 Share (${p.shares})</button>
          <button class="action-btn hireBtn">${current && p.hires.includes(current.email) ? "Hired ✅" : "Hire"}</button>
          <button class="action-btn friendBtn">${friendButtonText(p.authorEmail)}</button>
        </div>
        <div class="comment-list" style="display:none">
          ${p.comments.map(c=> `<div><b>${escapeHtml(c.name)}</b>: ${escapeHtml(c.text)}</div>`).join("")}
          <input class="commentInput" placeholder="Write a comment...">
        </div>
      `;

      // author link -> view profile
      box.querySelectorAll(".authorLink").forEach(el=>{
        el.onclick = ()=> window.location.href = `profile.html?email=${encodeURIComponent(el.dataset.email)}`;
      });

      // like
      box.querySelector(".likeBtn").onclick = () => {
        if (!current) return alert("Login korte hobe like korar jonno.");
        const posts = loadPosts();
        const target = posts.find(x=>x.id===p.id);
        if (!target) return;
        const idx = target.likes.indexOf(current.email);
        if (idx === -1) target.likes.push(current.email);
        else target.likes.splice(idx,1);
        savePosts(posts); renderFeed();
      };

      // comment toggle + add
      const cToggle = box.querySelector(".commentToggle");
      const cList = box.querySelector(".comment-list");
      cToggle.onclick = ()=> cList.style.display = cList.style.display === "none" ? "block" : "none";
      const commentInput = box.querySelector(".commentInput");
      commentInput.addEventListener("keypress", e=>{
        if (e.key === "Enter") {
          if (!current) return alert("Login korte hobe comment korar jonno.");
          const text = commentInput.value.trim();
          if (!text) return;
          const posts = loadPosts();
          const target = posts.find(x=>x.id===p.id);
          target.comments.push({ name: current.name, email: current.email, text });
          savePosts(posts); renderFeed();
        }
      });

      // share
      box.querySelector(".shareBtn").onclick = () => {
        if (!current) return alert("Login korte hobe share korar jonno.");
        const posts = loadPosts();
        const target = posts.find(x=>x.id===p.id);
        if (!target) return;
        target.shares = (target.shares||0) + 1;
        // duplicate as new post showing shared content
        const shared = {
          id: Date.now(),
          authorEmail: current.email,
          authorName: current.name,
          authorPhoto: current.photo,
          text: `Shared: ${target.text}`,
          image: target.image,
          likes: [],
          comments: [],
          shares: 0,
          hires: [],
          time: new Date().toLocaleString()
        };
        posts.unshift(shared);
        savePosts(posts); renderFeed();
      };

      // hire
      box.querySelector(".hireBtn").onclick = () => {
        if (!current) return alert("Login korte hobe hire korar jonno.");
        if (p.authorEmail === current.email) return alert("Tumi nijeke hire korte parbe na.");
        const users = loadUsers();
        const targetUser = users.find(u=>u.email===p.authorEmail);
        if (!targetUser) return alert("User khuje paoa jai ni.");
        targetUser.hires = targetUser.hires || [];
        const meIndex = targetUser.hires.indexOf(current.email);
        if (meIndex === -1) targetUser.hires.push(current.email);
        else targetUser.hires.splice(meIndex,1);
        saveUsers(users);
        // update post hires for UI
        const posts = loadPosts();
        const targetPost = posts.find(x=>x.id===p.id);
        if (!targetPost.hires) targetPost.hires = [];
        const idxH = targetPost.hires.indexOf(current.email);
        if (idxH === -1) targetPost.hires.push(current.email);
        else targetPost.hires.splice(idxH,1);
        savePosts(posts); renderFeed();
      };

      // friend button (send request)
      box.querySelector(".friendBtn").onclick = () => {
        if (!current) return alert("Login korte hobe friend request pathanor jonno.");
        if (p.authorEmail === current.email) return;
        handleFriendRequest(p.authorEmail);
      };

      container.appendChild(box);
    });
  }

  // friend helper
  function friendButtonText(email){
    if (!current) return "Login";
    if (email === current.email) return "You";
    const users = loadUsers();
    const me = users.find(u=>u.email===current.email);
    if (me?.friends?.includes(email)) return "Friend";
    if (me?.friendRequestsSent?.includes(email)) return "Requested";
    if (me?.friendRequestsReceived?.includes(email)) return "Respond";
    return "Add Friend";
  }

  function handleFriendRequest(toEmail){
    const users = loadUsers();
    const me = users.find(u=>u.email===current.email);
    const other = users.find(u=>u.email===toEmail);
    if (!other) return alert("User paoa jai ni.");
    if (me.friendRequestsSent?.includes(toEmail)) return alert("Already requested.");
    if (me.friends?.includes(toEmail)) return alert("Already friend.");
    me.friendRequestsSent = me.friendRequestsSent || [];
    other.friendRequestsReceived = other.friendRequestsReceived || [];
    me.friendRequestsSent.push(toEmail);
    other.friendRequestsReceived.push(current.email);
    saveUsers(users);
    setCurrent(me);
    alert("Friend request sent.");
    renderFeed();
  }

  function escapeHtml(text){
    if (!text) return "";
    return text.replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'": '&#39;'}[m]; });
  }

  renderFeed();
}

// ---------- PROFILE PAGE ----------
if (location.pathname.endsWith("profile.html")) {
  const params = new URLSearchParams(location.search);
  const viewEmail = params.get("email") || (current && current.email);
  const profileCard = document.getElementById("profileCard");
  const profilePostsDiv = document.getElementById("profilePosts");

  if (!viewEmail) {
    profileCard.innerHTML = "<p>Please login to view profile.</p>";
  } else {
    const users = loadUsers();
    const viewUser = users.find(u=>u.email===viewEmail);
    if (!viewUser) {
      profileCard.innerHTML = "<p>User not found.</p>";
    } else {
      profileCard.innerHTML = `
        <img src="${viewUser.photo}" alt="avatar" />
        <h2>${viewUser.name}</h2>
        <p class="small">${viewUser.email}</p>
        <p class="small">Friends: ${viewUser.friends?.length || 0} • Hired by: ${viewUser.hires?.length || 0}</p>
        ${current && current.email !== viewUser.email ? `<div class="row" style="justify-content:center;margin-top:8px">
          <button id="friendAction" class="btn primary">${users.find(u=>u.email===current.email)?.friends?.includes(viewUser.email) ? "Friend" : (users.find(u=>u.email===current.email)?.friendRequestsSent?.includes(viewUser.email) ? "Requested" : (users.find(u=>u.email===current.email)?.friendRequestsReceived?.includes(viewUser.email) ? "Respond" : "Add Friend"))}</button>
          <button id="hireAction" class="btn">${viewUser.hires?.includes(current.email) ? "Hired ✅" : "Hire"}</button>
        </div>` : ""}
      `;
      // posts
      const posts = loadPosts().filter(p => p.authorEmail === viewUser.email);
      profilePostsDiv.innerHTML = "";
      posts.forEach(p => {
        const div = document.createElement("div");
        div.className = "post";
        div.innerHTML = `<div class="post-head"><img src="${p.authorPhoto}" class="avatar"><div><b>${p.authorName}</b><br><small>${p.time}</small></div></div>
          <p class="small">${escapeHtml(p.text)}</p>
          ${p.image? `<img src="${p.image}" style="width:100%;border-radius:8px;margin-top:8px">` : ""}
          <div class="small">❤️ ${p.likes.length} • 💬 ${p.comments.length} • 🔁 ${p.shares} • 🧾 Hired by ${p.hires.length}</div>`;
        profilePostsDiv.appendChild(div);
      });

      // attach actions
      if (current && current.email !== viewUser.email) {
        const friendBtn = document.getElementById("friendAction");
        const hireBtn = document.getElementById("hireAction");
        friendBtn.onclick = () => handleFriendAction(viewUser.email);
        hireBtn.onclick = () => handleHireAction(viewUser.email);
      }
    }
  }

  function handleFriendAction(email){
    const users = loadUsers();
    const me = users.find(u=>u.email===current.email);
    const other = users.find(u=>u.email===email);
    if (!other) return alert("User missing.");
    // if already friends -> nothing
    if (me.friends?.includes(email)) return alert("Already friend.");
    // if I have received a request from them -> accept
    if (me.friendRequestsReceived?.includes(email)) {
      // accept directly
      me.friends = me.friends || [];
      other.friends = other.friends || [];
      if (!me.friends.includes(email)) me.friends.push(email);
      if (!other.friends.includes(me.email)) other.friends.push(me.email);
      me.friendRequestsReceived = (me.friendRequestsReceived||[]).filter(x=>x!==email);
      other.friendRequestsSent = (other.friendRequestsSent||[]).filter(x=>x!==me.email);
      saveUsers(users); setCurrent(me);
      alert("Friend request accepted.");
      location.reload();
      return;
    }
    // if already sent -> notify
    if (me.friendRequestsSent?.includes(email)) return alert("Already requested.");
    // else send request
    me.friendRequestsSent = me.friendRequestsSent || [];
    other.friendRequestsReceived = other.friendRequestsReceived || [];
    me.friendRequestsSent.push(email);
    other.friendRequestsReceived.push(me.email);
    saveUsers(users); setCurrent(me);
    alert("Friend request sent.");
    location.reload();
  }

  function handleHireAction(email){
    if (!current) return alert("Login koro.");
    if (email === current.email) return alert("Nije hire kora jaay na.");
    const users = loadUsers();
    const target = users.find(u=>u.email===email);
    if (!target) return;
    target.hires = target.hires || [];
    const idx = target.hires.indexOf(current.email);
    if (idx === -1) target.hires.push(current.email);
    else target.hires.splice(idx,1);
    saveUsers(users);
    alert(idx === -1 ? "User hired." : "Hire cancelled.");
    location.reload();
  }
}

// ---------- FRIENDS PAGE ----------
if (location.pathname.endsWith("friends.html")) {
  if (!current) {
    document.getElementById("incomingRequests").innerHTML = "<p>Please login to manage friends.</p>";
  } else {
    renderFriendsPage();
  }

  function renderFriendsPage(){
    const users = loadUsers();
    const me = users.find(u=>u.email===current.email);
    // incoming
    const incomingDiv = document.getElementById("incomingRequests");
    incomingDiv.innerHTML = "";
    (me.friendRequestsReceived || []).forEach(senderEmail => {
      const sender = users.find(u=>u.email===senderEmail);
      const el = document.createElement("div");
      el.className = "suggest-card";
      el.innerHTML = `<div class="person"><img src="${sender.photo}" class="avatar"><div class="info"><b>${sender.name}</b><div class="small">${sender.email}</div></div></div>
        <div><button class="btn primary accept">Accept</button><button class="btn ghost decline">Decline</button></div>`;
      el.querySelector(".accept").onclick = ()=> {
        me.friends = me.friends || [];
        sender.friends = sender.friends || [];
        if (!me.friends.includes(sender.email)) me.friends.push(sender.email);
        if (!sender.friends.includes(me.email)) sender.friends.push(me.email);
        me.friendRequestsReceived = (me.friendRequestsReceived||[]).filter(x=>x!==sender.email);
        sender.friendRequestsSent = (sender.friendRequestsSent||[]).filter(x=>x!==me.email);
        saveUsers(users);
        setCurrent(me);
        renderFriendsPage();
      };
      el.querySelector(".decline").onclick = ()=> {
        me.friendRequestsReceived = (me.friendRequestsReceived||[]).filter(x=>x!==sender.email);
        sender.friendRequestsSent = (sender.friendRequestsSent||[]).filter(x=>x!==me.email);
        saveUsers(users);
        setCurrent(me);
        renderFriendsPage();
      };
      incomingDiv.appendChild(el);
    });
    if (!(me.friendRequestsReceived || []).length) incomingDiv.innerHTML = "<p class='muted'>Kono incoming request nei.</p>";

    // suggestions
    const suggestionsDiv = document.getElementById("suggestions");
    suggestionsDiv.innerHTML = "";
    users.forEach(u=>{
      if (u.email === me.email) return;
      if (me.friends?.includes(u.email)) return;
      if (me.friendRequestsSent?.includes(u.email)) return;
      const el = document.createElement("div");
      el.className = "suggest-card";
      el.innerHTML = `<div class="person"><img src="${u.photo}" class="avatar"><div class="info"><b>${u.name}</b><div class="small">${u.email}</div></div></div>
        <div><button class="btn primary send">Add Friend</button></div>`;
      el.querySelector(".send").onclick = ()=>{
        me.friendRequestsSent = me.friendRequestsSent || [];
        u.friendRequestsReceived = u.friendRequestsReceived || [];
        me.friendRequestsSent.push(u.email);
        u.friendRequestsReceived.push(me.email);
        saveUsers(users);
        setCurrent(me);
        renderFriendsPage();
      };
      suggestionsDiv.appendChild(el);
    });
    if (suggestionsDiv.children.length === 0) suggestionsDiv.innerHTML = "<p class='muted'>No suggestions for now.</p>";

    // my friends
    const friendsDiv = document.getElementById("myFriends");
    friendsDiv.innerHTML = "";
    (me.friends || []).forEach(email=>{
      const f = users.find(x=>x.email===email);
      const el = document.createElement("div");
      el.className = "suggest-card";
      el.innerHTML = `<div class="person"><img src="${f.photo}" class="avatar"><div class="info"><b>${f.name}</b><div class="small">${f.email}</div></div></div>
        <div><button class="btn" onclick="window.location.href='profile.html?email=${encodeURIComponent(f.email)}'">View</button></div>`;
      friendsDiv.appendChild(el);
    });
    if ((me.friends || []).length === 0) friendsDiv.innerHTML = "<p class='muted'>Tumi ekhono kono friend add korni.</p>";
  }
}

// ---------- HIRE LIST PAGE ----------
if (location.pathname.endsWith("hire-list.html")) {
  const hireListDiv = document.getElementById("hireList");
  if (!current) hireListDiv.innerHTML = "<p>Please login to see hire list.</p>";
  else {
    const users = loadUsers();
    const me = users.find(u=>u.email===current.email);
    // people I hired
    const iHired = (me.hires || []).map(e => users.find(u => u.email === e)).filter(Boolean);
    // people who hired me
    const hiredByMe = users.filter(u => (u.hires || []).includes(current.email));

    hireListDiv.innerHTML = "<h4>People you hired</h4>";
    if (iHired.length === 0) hireListDiv.innerHTML += "<p class='muted'>You haven't hired anyone yet.</p>";
    iHired.forEach(u => {
      const el = document.createElement("div"); el.className="suggest-card";
      el.innerHTML = `<div class="person"><img src="${u.photo}" class="avatar"><div class="info"><b>${u.name}</b><div class="small">${u.email}</div></div></div>
        <div><button class="btn" onclick="window.location.href='profile.html?email=${encodeURIComponent(u.email)}'">View</button></div>`;
      hireListDiv.appendChild(el);
    });

    hireListDiv.innerHTML += "<h4 style='margin-top:12px'>People who hired you</h4>";
    if (hiredByMe.length === 0) hireListDiv.innerHTML += "<p class='muted'>No one hired you yet.</p>";
    hiredByMe.forEach(u => {
      const el = document.createElement("div"); el.className="suggest-card";
      el.innerHTML = `<div class="person"><img src="${u.photo}" class="avatar"><div class="info"><b>${u.name}</b><div class="small">${u.email}</div></div></div>
        <div><button class="btn" onclick="window.location.href='profile.html?email=${encodeURIComponent(u.email)}'">View</button></div>`;
      hireListDiv.appendChild(el);
    });
  }
}

// ---------- helpers ----------
function escapeHtml(text){
  if (!text) return "";
  return text.replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'": '&#39;'}[m]; });
}
