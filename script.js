/* =========================================================
   NAVIGATION ENTRE ÉCRANS
   ========================================================= */

const homeScreen = document.querySelector(".phone:not(.app-screen)");
const screens = {
  instagrim: document.getElementById("screen-instagrim")
  // Ajouter ici les futurs écrans : messages, notes, etc.
};

function openApp(appName) {
  const screen = screens[appName];
  if (!screen) {
    alert("Cette application n'est pas encore disponible.");
    return;
  }
  homeScreen.style.display = "none";
  screen.style.display = "flex";
}

function closeApp() {
  for (const key in screens) {
    screens[key].style.display = "none";
  }
  homeScreen.style.display = "flex";
}


/* =========================================================
   HORLOGE (mise à jour automatique)
   ========================================================= */

function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const time = `${h}:${m}`;

  document.querySelectorAll("#clock, #big-clock, .clock-mini").forEach(el => {
    el.textContent = time;
  });
}

updateClock();
setInterval(updateClock, 60000);


/* =========================================================
   GÉNÉRATION DU FIL INSTAGRIM À PARTIR DE posts.js
   ========================================================= */

function renderFeed() {
  const feed = document.getElementById("feed");
  feed.innerHTML = "";

  posts.forEach((post, index) => {
    const postEl = document.createElement("div");
    postEl.className = "post";

    postEl.innerHTML = `
      <div class="post-header">
        <div class="post-avatar" style="background:${post.avatarColor}">${post.initials}</div>
        <div class="post-meta">
          <p class="post-username">${post.username}</p>
          <p class="post-location">${post.location ? post.location + " · " : ""}${post.time}</p>
        </div>
        <i class="ti ti-dots" style="font-size:18px; color:#999;"></i>
      </div>

      <div class="post-image">
        ${post.image ? `<img src="${post.image}" alt="">` : `<i class="ti ti-photo"></i>`}
      </div>

      <div class="post-actions">
        <i class="ti ti-heart" data-index="${index}" onclick="toggleLike(this)"></i>
        <i class="ti ti-message-circle"></i>
        <i class="ti ti-send-2"></i>
      </div>

      <p class="post-likes" id="likes-${index}">${post.likes} j'aime</p>
      <p class="post-caption"><span class="post-username">${post.username}</span>${post.caption}</p>
      ${post.comments > 0 ? `<p class="post-comments-link">Voir les ${post.comments} commentaires</p>` : ""}
    `;

    feed.appendChild(postEl);
  });
}

function toggleLike(iconEl) {
  const index = iconEl.dataset.index;
  const likesEl = document.getElementById(`likes-${index}`);
  const isLiked = iconEl.classList.toggle("liked");

  if (isLiked) {
    iconEl.classList.remove("ti-heart");
    iconEl.classList.add("ti-heart-filled");
    posts[index].likes += 1;
  } else {
    iconEl.classList.remove("ti-heart-filled");
    iconEl.classList.add("ti-heart");
    posts[index].likes -= 1;
  }

  likesEl.textContent = `${posts[index].likes} j'aime`;
}

renderFeed();
